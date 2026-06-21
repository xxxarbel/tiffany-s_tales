// AudioWorklet processor that forwards captured mono audio frames (Float32) to
// the main thread. Served as a static file (not bundled) so addModule can fetch
// it at runtime. It writes nothing to its outputs, so it stays silent even when
// connected to the destination.
class PCMRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      // Copy out of the reused render buffer before posting.
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PCMRecorder);
