import { OUTPUT_SAMPLE_RATE } from "./config";
import { int16ToFloat32 } from "./pcm";

/**
 * Plays raw linear16 PCM frames streamed from the agent. Frames are scheduled
 * back-to-back on a monotonic cursor for gapless playback, and `flush` lets the
 * UI stop everything instantly for barge-in.
 */
export class AudioPlayer {
  private ctx: AudioContext;
  private nextStartTime = 0;
  private readonly sources = new Set<AudioBufferSourceNode>();

  constructor() {
    this.ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  enqueue(pcm: ArrayBuffer) {
    // Guard against an odd byte length (Int16Array requires a multiple of 2).
    const usable = pcm.byteLength - (pcm.byteLength % 2);
    if (usable <= 0) return;
    const int16 = new Int16Array(pcm.slice(0, usable));
    const float = int16ToFloat32(int16);

    const buffer = this.ctx.createBuffer(1, float.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);

    const startAt = Math.max(this.ctx.currentTime, this.nextStartTime);
    src.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
    };
  }

  /** Stop and drop all scheduled audio (barge-in). */
  flush() {
    for (const src of this.sources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
      src.disconnect();
    }
    this.sources.clear();
    this.nextStartTime = this.ctx.currentTime;
  }

  close() {
    this.flush();
    void this.ctx.close();
  }
}
