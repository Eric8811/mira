// Realtime session: browser ↔ Cloudflare Worker proxy ↔ DashScope Qwen3-Omni Realtime.
// Owns the WebSocket, the output AudioContext (24 kHz PCM16 playback), and event routing.

export type RealtimeEvents = {
  onConnected?: () => void;
  onAudioStart?: () => void;
  onTranscriptDelta?: (delta: string) => void;
  onTranscriptDone?: (full: string) => void;
  onResponseDone?: () => void;
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

export class RealtimeSession {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private pendingConnect: PendingConnect | null = null;
  private events: RealtimeEvents;
  private closed = false;
  private firstAudioEmitted = false;

  constructor(events: RealtimeEvents) {
    this.events = events;
  }

  async connect(config: RealtimeConfig): Promise<void> {
    if (typeof window === "undefined") throw new Error("browser only");

    // 24 kHz AudioContext for output playback (DashScope pcm24 = 16-bit PCM @ 24 kHz)
    const AudioCtx =
      (window.AudioContext as typeof AudioContext | undefined) ??
      ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) throw new Error("AudioContext unavailable");
    this.audioCtx = new AudioCtx({ sampleRate: 24_000 });
    try {
      await this.audioCtx.resume();
    } catch {}
    this.nextPlayTime = this.audioCtx.currentTime;

    // Open WS and wait for session.created
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

      this.ws.onopen = () => {
        // Wait for session.created before calling user back
      };
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

      // Resolve once session.created arrives (see handleMessage)
      const originalResolve = resolve;
      this.pendingConnect.resolve = () => {
        clearTimeout(timer);
        originalResolve();
        this.pendingConnect = null;
      };
    });

    // Session configuration
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

  appendInputAudio(pcm16Base64: string) {
    this.send({ type: "input_audio_buffer.append", audio: pcm16Base64 });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.ws?.close(); } catch {}
    this.ws = null;
    try { this.audioCtx?.close(); } catch {}
    this.audioCtx = null;
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
        if (delta) this.events.onTranscriptDelta?.(delta);
        break;
      }
      case "response.audio_transcript.done": {
        const transcript = (msg.transcript as string | undefined) ?? "";
        this.events.onTranscriptDone?.(transcript);
        break;
      }
      case "response.done":
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
    if (!this.audioCtx) return;
    const bytes = base64ToBytes(b64);
    const sampleCount = Math.floor(bytes.length / 2);
    if (sampleCount === 0) return;
    const buffer = this.audioCtx.createBuffer(1, sampleCount, 24_000);
    const channel = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < sampleCount; i++) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }
    const src = this.audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.audioCtx.destination);
    const startAt = Math.max(this.audioCtx.currentTime, this.nextPlayTime);
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
