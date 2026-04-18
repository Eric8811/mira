// Realtime session: browser ↔ Cloudflare Worker proxy ↔ DashScope Qwen3-Omni Realtime.
// Owns the WebSocket, the output AudioContext (24 kHz playback), the input AudioContext
// (16 kHz mic capture through an AudioWorklet), and event routing.

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
};

export type RealtimeConfig = {
  proxyUrl: string;
  instructions: string;
  voice?: string;
  turnDetection?: boolean;
};

type PendingConnect = {
  resolve: () => void;
  reject: (e: Error) => void;
};

const CONNECT_TIMEOUT_MS = 10_000;
const INPUT_SAMPLE_RATE = 16_000;
const INPUT_CHUNK_SAMPLES = 1_600; // ~100ms at 16 kHz

// Inline AudioWorklet that forwards Float32 mic buffers to the main thread.
const CAPTURE_WORKLET_SRC = `class MiraPCMCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      // Clone: the view is reused each tick.
      this.port.postMessage(ch.slice(0));
    }
    return true;
  }
}
registerProcessor("mira-pcm-capture", MiraPCMCapture);`;

export class RealtimeSession {
  private ws: WebSocket | null = null;
  private outCtx: AudioContext | null = null;
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

  constructor(events: RealtimeEvents) {
    this.events = events;
  }

  async connect(config: RealtimeConfig): Promise<void> {
    if (typeof window === "undefined") throw new Error("browser only");

    const AudioCtx =
      (window.AudioContext as typeof AudioContext | undefined) ??
      ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) throw new Error("AudioContext unavailable");
    this.outCtx = new AudioCtx({ sampleRate: 24_000 });
    try {
      await this.outCtx.resume();
    } catch {}
    this.nextPlayTime = this.outCtx.currentTime;

    this.ws = new WebSocket(config.proxyUrl);
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
        reject(new Error("ws error during connect"));
        this.events.onError?.(new Error("ws error"));
      };
      this.ws.onclose = (e) => {
        clearTimeout(timer);
        if (this.pendingConnect) {
          reject(new Error(`ws closed before session.created (code=${e.code})`));
          this.pendingConnect = null;
        }
        this.events.onClose?.(e.code, e.reason);
      };

      const originalResolve = resolve;
      this.pendingConnect.resolve = () => {
        clearTimeout(timer);
        originalResolve();
        this.pendingConnect = null;
      };
    });

    this.send({
      type: "session.update",
      session: {
        instructions: config.instructions,
        voice: config.voice ?? "Cherry",
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm24",
        turn_detection: config.turnDetection
          ? {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            }
          : null,
      },
    });

    this.events.onConnected?.();
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

    this.inStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const AudioCtx =
      (window.AudioContext as typeof AudioContext | undefined) ??
      ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) throw new Error("AudioContext unavailable");

    // Most browsers accept sampleRate: 16_000 and resample the mic internally.
    // Safari ≤14 does not; we'd detect later. For hackathon scope we target Chrome/Edge.
    this.inCtx = new AudioCtx({ sampleRate: INPUT_SAMPLE_RATE });
    try {
      await this.inCtx.resume();
    } catch {}

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
          if (take === head.length) {
            this.pendingCapture.shift();
          } else {
            this.pendingCapture[0] = head.subarray(take);
          }
        }
        this.pendingCaptureLen -= INPUT_CHUNK_SAMPLES;
        this.sendAudioChunk(out);
      }
    };

    this.inSource = this.inCtx.createMediaStreamSource(this.inStream);

    // Connect through a muted gain so the AudioWorklet keeps running while we don't feed it to the speakers.
    const mute = this.inCtx.createGain();
    mute.gain.value = 0;
    this.inSource.connect(this.inWorklet);
    this.inWorklet.connect(mute);
    mute.connect(this.inCtx.destination);
  }

  stopInputCapture() {
    try { this.inWorklet?.disconnect(); } catch {}
    try { this.inSource?.disconnect(); } catch {}
    try {
      this.inStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    try { this.inCtx?.close(); } catch {}
    this.inWorklet = null;
    this.inSource = null;
    this.inStream = null;
    this.inCtx = null;
    this.pendingCapture = [];
    this.pendingCaptureLen = 0;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopInputCapture();
    try { this.ws?.close(); } catch {}
    this.ws = null;
    try { this.outCtx?.close(); } catch {}
    this.outCtx = null;
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
        this.events.onUserSpeechStarted?.();
        break;
      case "input_audio_buffer.speech_stopped":
        this.events.onUserSpeechStopped?.();
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const t = msg.transcript as string | undefined;
        if (t) this.events.onUserTranscript?.(t);
        break;
      }

      case "response.audio.delta": {
        const delta = msg.delta as string | undefined;
        if (delta) {
          if (!this.firstAudioEmitted) {
            this.firstAudioEmitted = true;
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
        this.events.onAssistantTranscriptDone?.(transcript);
        break;
      }
      case "response.done":
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
    src.connect(this.outCtx.destination);
    const startAt = Math.max(this.outCtx.currentTime, this.nextPlayTime);
    src.start(startAt);
    this.nextPlayTime = startAt + buffer.duration;
  }
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
  // Process in 8KB chunks to avoid call-stack blow-ups on long buffers.
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, Math.min(i + step, bytes.length));
    for (let j = 0; j < slice.length; j++) binary += String.fromCharCode(slice[j]);
  }
  return btoa(binary);
}
