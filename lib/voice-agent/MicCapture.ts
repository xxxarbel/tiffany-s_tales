import { PCM_WORKLET_URL } from "./config";
import { floatTo16BitPCM } from "./pcm";

/**
 * Captures microphone audio via an AudioWorklet, converts each frame to
 * linear16 PCM, and hands it to `onChunk` for transmission over the WebSocket.
 */
export class MicCapture {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private muted = false;
  private readonly onChunk: (chunk: ArrayBuffer) => void;

  constructor(onChunk: (chunk: ArrayBuffer) => void) {
    this.onChunk = onChunk;
  }

  /** Starts capture and returns the actual AudioContext sample rate. */
  async start(): Promise<number> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Critical so the agent doesn't transcribe its own playback.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.ctx = new AudioContext();
    await this.ctx.audioWorklet.addModule(PCM_WORKLET_URL);

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm-recorder");
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (this.muted) return;
      this.onChunk(floatTo16BitPCM(e.data));
    };

    this.source.connect(this.node);
    // The processor writes nothing to its outputs, so connecting to the
    // destination keeps it in the render graph while staying silent.
    this.node.connect(this.ctx.destination);

    return this.ctx.sampleRate;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  stop() {
    if (this.node) {
      this.node.port.onmessage = null;
      this.node.disconnect();
    }
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.node = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
  }
}
