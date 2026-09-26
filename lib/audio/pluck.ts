import { claimAudioSession, createAudioContext, watchAudioState } from "./capture.ts";

/**
 * A plucked-string voice (Karplus–Strong), so demonstrations sound like a
 * guitar string instead of the sine beep the reference tones use.
 *
 * `pluckSamples` is pure and deterministic for a given seed: noise into a
 * delay line one period long, averaged on every pass, which is the classic
 * physical model of a string losing its high harmonics as it rings.
 */
export function pluckSamples(frequency: number, sampleRate: number, seconds = 1.6, seed = 1): Float32Array {
  if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error("Unsupported pluck.");
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const period = Math.max(2, Math.round(sampleRate / frequency));
  const buffer = new Float32Array(period);
  let state = seed >>> 0 || 1;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) / 4294967295) * 2 - 1; };
  // A softened pick: low-pass the initial burst so the attack is not a click.
  let previous = 0;
  for (let i = 0; i < period; i++) { const value = random(); buffer[i] = (value + previous) / 2; previous = value; }
  const out = new Float32Array(length);
  // Higher strings decay faster, as they do on a guitar.
  const decay = Math.min(.9985, .998 - Math.max(0, frequency - 200) * .0000035);
  let index = 0;
  for (let n = 0; n < length; n++) {
    const next = (index + 1) % period;
    const value = buffer[index];
    out[n] = value;
    buffer[index] = decay * .5 * (value + buffer[next]);
    index = next;
  }
  // Short fade in and out keeps the edges silent.
  const fade = Math.min(length, Math.floor(sampleRate * .004));
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[length - 1 - i] *= i / fade; }
  return out;
}

export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export type GuitarVoice = {
  context: AudioContext;
  /** Pluck `midi` at audio time `at`. */
  pluck: (midi: number, at?: number, gain?: number) => void;
  /** A metronome tick at audio time `at`. */
  click: (at: number, accent?: boolean) => void;
  /** Output delay the listener hears on top of scheduled times, in seconds. */
  outputLatency: number;
  stop: () => void;
};

/**
 * Open a voice for demonstrations. It takes the shared audio session, so
 * starting it stops the microphone coach or a reference tone, and vice versa.
 */
export async function openGuitarVoice(onInterrupted: () => void, signal: AbortSignal): Promise<GuitarVoice> {
  if (signal.aborted) throw new Error("Playback was cancelled.");
  const context = createAudioContext({ latencyHint: "interactive" });
  const cache = new Map<number, AudioBuffer>();
  const sources = new Set<AudioScheduledSourceNode>();
  const master = context.createGain();
  master.gain.value = .9;
  master.connect(context.destination);
  let stopped = false, unwatch = () => {}, release = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    unwatch();
    for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
    sources.clear();
    master.disconnect();
    signal.removeEventListener("abort", stop);
    release();
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", stop, { once: true });
  release = claimAudioSession(() => { stop(); onInterrupted(); });
  try {
    await context.resume();
    if (stopped || signal.aborted) throw new Error("Playback was cancelled.");
    if ((context.state as string) !== "running") await context.resume().catch(() => {});
    unwatch = watchAudioState(context, () => { if (!stopped) { stop(); onInterrupted(); } });
    const track = (source: AudioScheduledSourceNode) => { sources.add(source); source.onended = () => { sources.delete(source); source.disconnect(); }; };
    const bufferFor = (midi: number) => {
      let buffer = cache.get(midi);
      if (!buffer) {
        const samples = pluckSamples(midiFrequency(midi), context.sampleRate, 1.6, midi + 7);
        buffer = context.createBuffer(1, samples.length, context.sampleRate);
        buffer.getChannelData(0).set(samples);
        cache.set(midi, buffer);
      }
      return buffer;
    };
    const latency = (context as AudioContext & { outputLatency?: number }).outputLatency;
    return {
      context,
      outputLatency: Number.isFinite(latency) && latency! > 0 ? latency! : Number.isFinite(context.baseLatency) ? context.baseLatency : 0,
      stop,
      pluck(midi, at = context.currentTime, gain = .8) {
        if (stopped) return;
        const source = context.createBufferSource(), level = context.createGain();
        source.buffer = bufferFor(midi);
        level.gain.value = gain;
        source.connect(level); level.connect(master);
        track(source);
        source.start(Math.max(at, context.currentTime));
      },
      click(at, accent = false) {
        if (stopped) return;
        const oscillator = context.createOscillator(), level = context.createGain();
        const start = Math.max(at, context.currentTime);
        oscillator.frequency.value = accent ? 1500 : 1000;
        level.gain.setValueAtTime(0, start);
        level.gain.linearRampToValueAtTime(accent ? .35 : .22, start + .002);
        level.gain.exponentialRampToValueAtTime(.0001, start + .05);
        oscillator.connect(level); level.connect(master);
        track(oscillator);
        oscillator.start(start); oscillator.stop(start + .06);
      },
    };
  } catch (error) { stop(); throw error; }
}
