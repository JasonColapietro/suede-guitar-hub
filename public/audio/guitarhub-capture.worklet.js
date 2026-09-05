/* AudioWorklet globals: AudioWorkletProcessor, currentTime, sampleRate, registerProcessor */
class GuitarHubCapture extends AudioWorkletProcessor {
  constructor() { super(); this.samples = new Float32Array(4096); this.used = 0; this.start = 0; }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) for (let i = 0; i < channel.length; i++) {
      if (this.used === 0) this.start = currentTime + i / sampleRate;
      this.samples[this.used++] = channel[i];
      if (this.used === 4096) {
        this.port.postMessage({samples:this.samples, time:this.start}, [this.samples.buffer]);
        this.samples = new Float32Array(4096); this.used = 0;
      }
    }
    return true;
  }
}
registerProcessor('guitarhub-capture', GuitarHubCapture);
