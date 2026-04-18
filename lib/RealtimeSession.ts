// Realtime session: browser ↔ Cloudflare Worker proxy ↔ DashScope Qwen3-Omni Realtime.
// Owns the WebSocket, the output AudioContext (24 kHz playback), the input AudioContext
// (16 kHz mic capture through an AudioWorklet), and event routing.
//
// Robustness:
// - Tracks full conversation history client-side (user + assistant transcripts with timestamps).
// - Every 20s sends a no-op session.update as a keepalive.
// - On unexpected close, auto-reconnects with exponential backoff and replays recent history
//   (last 5 min) into the instructions field. DashScope's conversation.item.create doesn't
//   process text user turns reliably, so we fake memory via instructions.
// - Noise-gate on the input path skips near-silent chunks to keep VAD from misfiring.

import { buildInstructionsWithHistory } from "./realtime-config";
import type { MiraSession } from "./session";

export type RealtimeEvents = {
  onConnected?: () => void;
  onAudioStart?: () => void;
  onAssistantTranscriptDelta?: (delta: string) => void;
  onAssistantTranscriptDone?: (full: string) => void;
  onResponseDone?: () => void;
  onUserSpeechStarted?: () => void;
  onUserSpeechStopped?: () => void;
  onUserTranscript?: (text: string) => void;
  onError?: (err: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
};

export type RealtimeConfig = {
  proxyUrl: string;
  instructions: string;
  voice?: string;
  turnDetection?: boolean;
  // Optional: for reconnect-with-history replay. If provided, every reconnect
  // will rebuild instructions from this session + the stored history.
  miraSession?: MiraSession;
};

type PendingConnect = {
  resolve: () => void;
  reject: (e: Error) => void;
};

export type HistoryTurn = { role: "user" | "assistant"; text: string; ts: number };

const CONNECT_TIMEOUT_MS = 10_000;
const INPUT_SAMPLE_RATE = 16_000;
const INPUT_CHUNK_SAMPLES = 1_600; // ~100ms at 16 kHz
const HEARTBEAT_INTERVAL_MS = 20_000;
const HISTORY_WINDOW_MS = 5 * 60_000; // 5 minutes
const NOISE_GATE_RMS = 0.012; // raised from 0.006 to cut speaker-leak echo loops on laptop speakers
const OUTPUT_GAIN = 0.6; // attenuate Mira's playback so speaker-pickup amplitude stays under AEC threshold
const MAX_RECONNECT_ATTEMPTS = 5;

const CAPTURE_WORKLET_SRC = `class MiraPCMCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      this.port.postMessage(ch.slice(0));
    }
    return true;
  }
}
registerProcessor("mira-pcm-capture", MiraPCMCapture);`;

export class RealtimeSession {
  private ws: WebSocket | null = null;
  private outCtx: AudioContext | null = null;
  private outAnalyser: AnalyserNode | null = null;
  private outGain: GainNode | null = null;
  private inCtx: AudioContext | null = null;
  private inStream: MediaStream | null = null;
  private inWorklet: AudioWorkletNode | null = null;
  private inSource: MediaStreamAudioSourceNode | null = null;
  private nextPlayTime = 0;
  private pendingConnect: PendingConnect | null = null;
  private events: RealtimeEvents;
  private closed = false;
  private firstAudioEmitted = false;
  private pendingCapture: Float32Array[] = [];
  private pendingCaptureLen = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private history: HistoryTurn[] = [];
  private config: RealtimeConfig | null = null;
  private heartbeatTimer: number | null = null;
  private reconnectAttempt = 0;
  private reconnecting = false;
  private captureRunning = false;
  private userRequestedClose = false;
  private responseWatchdog: number | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(events: RealtimeEvents) {
    this.events = events;
  }

  async connect(config: RealtimeConfig): Promise<void> {
    if (typeof window === "undefined") throw new Error("browser only");
    this.config = config;
    this.userRequestedClose = false;

    const AudioCtx =
      (window.AudioContext as typeof AudioContext | undefined) ??
      ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) throw new Error("AudioContext unavailable");

    if (!this.outCtx) {
      this.outCtx = new AudioCtx({ sampleRate: 24_000, latencyHint: "interactive" });
      try { await this.outCtx.resume(); } catch {}
      this.nextPlayTime = this.outCtx.currentTime;

      // Output chain: src → outGain (0.6) → outAnalyser → destination
      // - Reduced gain cuts echo leakage picked up by the mic (AEC has an easier job).
      // - Analyser sits downstream so the orb pulses to what the user actually hears.
      this.outGain = this.outCtx.createGain();
      this.outGain.gain.value = OUTPUT_GAIN;
      this.outAnalyser = this.outCtx.createAnalyser();
      this.outAnalyser.fftSize = 512;
      this.outAnalyser.smoothingTimeConstant = 0.5;
      this.outGain.connect(this.outAnalyser);
      this.outAnalyser.connect(this.outCtx.destination);
    }

    await this.openWebSocket();
    this.startHeartbeat();

    // When the tab comes back to foreground, make sure the WS is still up.
    if (!this.visibilityHandler) {
      this.visibilityHandler = () => {
        if (document.hidden) return;
        if (this.userRequestedClose || this.closed) return;
        if (this.ws?.readyState === WebSocket.OPEN) return;
        if (this.reconnecting) return;
        console.log("[realtime] tab visible; ws not open → reconnecting");
        this.handleUnexpectedClose();
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  /** Called by UI after MAX reconnects exhausted and user taps "reconnect". */
  async manualReconnect(): Promise<void> {
    this.reconnectAttempt = 0;
    this.reconnecting = false;
    this.userRequestedClose = false;
    this.closed = false;
    try { this.ws?.close(); } catch {}
    await this.openWebSocket();
    this.startHeartbeat();
    this.events.onReconnected?.();
  }

  private armResponseWatchdog() {
    this.clearResponseWatchdog();
    // If no audio.delta lands within 8s after the server has a committed utterance,
    // something is wrong upstream — force a reconnect. 8s leaves plenty of headroom
    // for the normal ~1-2s first-token time without false-positive reconnects.
    this.responseWatchdog = window.setTimeout(() => {
      console.warn("[realtime] watchdog: no audio delta within 8s of speech_stopped, forcing reconnect");
      try { this.ws?.close(); } catch {}
    }, 8000);
  }

  private clearResponseWatchdog() {
    if (this.responseWatchdog != null) {
      window.clearTimeout(this.responseWatchdog);
      this.responseWatchdog = null;
    }
  }

  private async openWebSocket() {
    if (!this.config) throw new Error("no config");
    const cfg = this.config;

    this.ws = new WebSocket(cfg.proxyUrl);
    await new Promise<void>((resolve, reject) => {
      this.pendingConnect = { resolve, reject };
      const timer = window.setTimeout(() => {
        reject(new Error("realtime connect timeout"));
        this.pendingConnect = null;
      }, CONNECT_TIMEOUT_MS);

      if (!this.ws) {
        reject(new Error("ws not created"));
        return;
      }

      this.ws.onmessage = (e) => {
        this.handleMessage(typeof e.data === "string" ? e.data : "");
      };
      this.ws.onerror = () => {
        clearTimeout(timer);
        if (this.pendingConnect) {
          reject(new Error("ws error during connect"));
          this.pendingConnect = null;
        }
        this.events.onError?.(new Error("ws error"));
      };
      this.ws.onclose = (e) => {
        clearTimeout(timer);
        if (this.pendingConnect) {
          reject(new Error(`ws closed before session.created (code=${e.code})`));
          this.pendingConnect = null;
        }
        this.events.onClose?.(e.code, e.reason);
        this.handleUnexpectedClose();
      };

      const originalResolve = resolve;
      this.pendingConnect.resolve = () => {
        clearTimeout(timer);
        originalResolve();
        this.pendingConnect = null;
      };
    });

    // Build instructions: if we have a session pointer, include recent history.
    const instructions = cfg.miraSession
      ? buildInstructionsWithHistory(cfg.miraSession, this.getRecentHistory())
      : cfg.instructions;

    this.send({
      type: "session.update",
      session: {
        instructions,
        voice: cfg.voice ?? "Cherry",
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm24",
        turn_detection: cfg.turnDetection
          ? {
              type: "server_vad",
              threshold: 0.65,
              prefix_padding_ms: 250,
              silence_duration_ms: 200,
              create_response: true,
              interrupt_response: true,
            }
          : null,
      },
    });

    this.events.onConnected?.();
  }

  private handleUnexpectedClose() {
    if (this.userRequestedClose || this.closed) return;
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.stopHeartbeat();
    this.attemptReconnect();
  }

  private attemptReconnect() {
    this.reconnectAttempt += 1;
    if (this.reconnectAttempt > MAX_RECONNECT_ATTEMPTS) {
      this.reconnecting = false;
      this.events.onReconnectFailed?.();
      return;
    }
    this.events.onReconnecting?.(this.reconnectAttempt);
    const delay = Math.min(500 * 2 ** (this.reconnectAttempt - 1), 8000);
    window.setTimeout(async () => {
      try {
        await this.openWebSocket();
        this.startHeartbeat();
        this.reconnecting = false;
        this.reconnectAttempt = 0;
        this.events.onReconnected?.();
      } catch (e) {
        console.warn("[realtime] reconnect failed, will retry", e);
        this.attemptReconnect();
      }
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN || !this.config) return;
      // Idempotent session.update — keeps the stream warm without changing state.
      const instructions = this.config.miraSession
        ? buildInstructionsWithHistory(this.config.miraSession, this.getRecentHistory())
        : this.config.instructions;
      this.send({
        type: "session.update",
        session: { instructions },
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer != null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getRecentHistory(): HistoryTurn[] {
    const cutoff = Date.now() - HISTORY_WINDOW_MS;
    this.history = this.history.filter((h) => h.ts >= cutoff);
    return this.history.slice();
  }

  triggerResponse(instructions?: string) {
    this.send({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        ...(instructions ? { instructions } : {}),
      },
    });
  }

  sendUserText(text: string) {
    this.history.push({ role: "user", text, ts: Date.now() });
    // Best-effort: DashScope's conversation.item.create for text is flaky, but also
    // refresh instructions so the next response sees the latest history.
    if (this.config?.miraSession) {
      const instructions = buildInstructionsWithHistory(
        this.config.miraSession,
        this.getRecentHistory(),
      );
      this.send({ type: "session.update", session: { instructions } });
    }
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    this.triggerResponse();
  }

  async startInputCapture(): Promise<void> {
    if (typeof window === "undefined") throw new Error("browser only");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia unavailable");
    if (this.captureRunning) return;

    // Aggressive AEC config for laptop-speaker scenarios (no headphones).
    // - echoCancellation + noiseSuppression: stock WebRTC DSP
    // - autoGainControl OFF: AGC causes level pumping which confuses VAD and
    //   makes speaker leak sound louder during silences
    // - latency: 0 asks the stack for its lowest-latency capture path
    // - goog* flags: legacy Chromium hints — silently ignored elsewhere
    const audioConstraints: MediaTrackConstraints & Record<string, unknown> = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: INPUT_SAMPLE_RATE,
      sampleSize: 16,
      latency: 0,
      googEchoCancellation: true,
      googEchoCancellation2: true,
      googAutoGainControl: false,
      googNoiseSuppression: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false,
      googDAEchoCancellation: true,
      mozAutoGainControl: false,
      mozNoiseSuppression: true,
    };

    this.inStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

    const AudioCtx =
      (window.AudioContext as typeof AudioContext | undefined) ??
      ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) throw new Error("AudioContext unavailable");

    this.inCtx = new AudioCtx({ sampleRate: INPUT_SAMPLE_RATE });
    try { await this.inCtx.resume(); } catch {}

    const workletUrl = URL.createObjectURL(
      new Blob([CAPTURE_WORKLET_SRC], { type: "application/javascript" }),
    );
    await this.inCtx.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    this.inWorklet = new AudioWorkletNode(this.inCtx, "mira-pcm-capture");
    this.inWorklet.port.onmessage = (e) => {
      const buf = e.data as Float32Array;
      if (!buf || !buf.length) return;
      this.pendingCapture.push(buf);
      this.pendingCaptureLen += buf.length;
      while (this.pendingCaptureLen >= INPUT_CHUNK_SAMPLES) {
        const out = new Float32Array(INPUT_CHUNK_SAMPLES);
        let remaining = INPUT_CHUNK_SAMPLES;
        let offset = 0;
        while (remaining > 0 && this.pendingCapture.length) {
          const head = this.pendingCapture[0];
          const take = Math.min(head.length, remaining);
          out.set(head.subarray(0, take), offset);
          offset += take;
          remaining -= take;
          if (take === head.length) this.pendingCapture.shift();
          else this.pendingCapture[0] = head.subarray(take);
        }
        this.pendingCaptureLen -= INPUT_CHUNK_SAMPLES;
        // Noise gate: skip chunks below threshold to avoid wasting bandwidth
        // and to give server VAD cleaner silence boundaries.
        if (rms(out) < NOISE_GATE_RMS) continue;
        this.sendAudioChunk(out);
      }
    };

    this.inSource = this.inCtx.createMediaStreamSource(this.inStream);

    const mute = this.inCtx.createGain();
    mute.gain.value = 0;
    this.inSource.connect(this.inWorklet);
    this.inWorklet.connect(mute);
    mute.connect(this.inCtx.destination);

    this.captureRunning = true;
  }

  stopInputCapture() {
    try { this.inWorklet?.disconnect(); } catch {}
    try { this.inSource?.disconnect(); } catch {}
    try { this.inStream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { this.inCtx?.close(); } catch {}
    this.inWorklet = null;
    this.inSource = null;
    this.inStream = null;
    this.inCtx = null;
    this.pendingCapture = [];
    this.pendingCaptureLen = 0;
    this.captureRunning = false;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.userRequestedClose = true;
    this.clearResponseWatchdog();
    this.stopHeartbeat();
    this.stopInputCapture();
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
    try { this.ws?.close(); } catch {}
    this.ws = null;
    try { this.outCtx?.close(); } catch {}
    this.outCtx = null;
    this.outAnalyser = null;
    this.outGain = null;
  }

  private sendAudioChunk(float32: Float32Array) {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const b64 = int16ToBase64(pcm16);
    this.send({ type: "input_audio_buffer.append", audio: b64 });
  }

  private send(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private handleMessage(raw: string) {
    if (!raw) return;
    let msg: { type: string; [k: string]: unknown };
    try {
      msg = JSON.parse(raw) as { type: string };
    } catch {
      return;
    }

    switch (msg.type) {
      case "session.created":
        this.pendingConnect?.resolve?.();
        break;
      case "session.updated":
        break;

      case "input_audio_buffer.speech_started":
        console.log(`[mira] ← speech_started @ ${Math.round(performance.now())}`);
        this.clearResponseWatchdog();
        this.interruptPlayback();
        this.events.onUserSpeechStarted?.();
        break;
      case "input_audio_buffer.speech_stopped":
        console.log(`[mira] ← speech_stopped @ ${Math.round(performance.now())}`);
        this.armResponseWatchdog();
        this.events.onUserSpeechStopped?.();
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const t = msg.transcript as string | undefined;
        if (t) {
          this.history.push({ role: "user", text: t, ts: Date.now() });
          this.events.onUserTranscript?.(t);
        }
        break;
      }

      case "response.audio.delta": {
        const delta = msg.delta as string | undefined;
        if (delta) {
          this.clearResponseWatchdog();
          if (!this.firstAudioEmitted) {
            this.firstAudioEmitted = true;
            console.log(`[mira] ← first audio.delta @ ${Math.round(performance.now())}`);
            this.events.onAudioStart?.();
          }
          this.playAudioChunk(delta);
        }
        break;
      }
      case "response.audio_transcript.delta": {
        const delta = msg.delta as string | undefined;
        if (delta) this.events.onAssistantTranscriptDelta?.(delta);
        break;
      }
      case "response.audio_transcript.done": {
        const transcript = (msg.transcript as string | undefined) ?? "";
        if (transcript) {
          this.history.push({ role: "assistant", text: transcript, ts: Date.now() });
        }
        this.events.onAssistantTranscriptDone?.(transcript);
        break;
      }
      case "response.done":
        this.clearResponseWatchdog();
        this.firstAudioEmitted = false;
        this.events.onResponseDone?.();
        break;
      case "error": {
        const err = msg.error as { message?: string } | undefined;
        this.events.onError?.(new Error(err?.message ?? "realtime error"));
        break;
      }
    }
  }

  private playAudioChunk(b64: string) {
    if (!this.outCtx) return;
    const bytes = base64ToBytes(b64);
    const sampleCount = Math.floor(bytes.length / 2);
    if (sampleCount === 0) return;
    const buffer = this.outCtx.createBuffer(1, sampleCount, 24_000);
    const channel = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < sampleCount; i++) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }
    const src = this.outCtx.createBufferSource();
    src.buffer = buffer;
    // Route through outGain so Mira's playback is attenuated before hitting the speakers.
    src.connect(this.outGain ?? this.outAnalyser ?? this.outCtx.destination);
    const startAt = Math.max(this.outCtx.currentTime, this.nextPlayTime);
    src.start(startAt);
    if (this.activeSources.size === 0) {
      console.log(`[mira] ▶ first chunk scheduled @ ${Math.round(performance.now())} (ctx+${(startAt - this.outCtx.currentTime).toFixed(3)}s)`);
    }
    this.nextPlayTime = startAt + buffer.duration;
    this.activeSources.add(src);
    src.onended = () => this.activeSources.delete(src);
  }

  private interruptPlayback() {
    if (!this.outCtx) return;
    this.activeSources.forEach((src) => {
      try { src.onended = null; src.stop(); src.disconnect(); } catch {}
    });
    this.activeSources.clear();
    this.nextPlayTime = this.outCtx.currentTime;
    this.firstAudioEmitted = false;
  }

  getOutputAnalyser(): AnalyserNode | null {
    return this.outAnalyser;
  }
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = "";
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, Math.min(i + step, bytes.length));
    for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j]);
  }
  return btoa(binary);
}
