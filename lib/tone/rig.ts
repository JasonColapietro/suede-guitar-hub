import { claimAudioSession, createAudioContext, watchAudioState } from "../audio/capture.ts";
import { midiFrequency, pluckSamples } from "../audio/pluck.ts";

/**
 * A small virtual rig for the tone tools: a synthesized guitar riff that loops
 * into whatever chain a tool builds. Nothing here opens the microphone; every
 * sound is generated in the browser from the Karplus-Strong string model the
 * lessons already use.
 */

export type RiffNote = { midi: number; beat: number; gain?: number };
export type Riff = { id: string; name: string; bpm: number; beats: number; notes: readonly RiffNote[] };

const chord = (beat: number, midis: number[], gain = .5): RiffNote[] =>
  midis.map((midi, i) => ({ midi, beat: beat + i * .02, gain }));

/** Original figures, written for this tool. */
export const RIFFS: readonly Riff[] = [
  {
    id: "power", name: "Power-chord chug", bpm: 104, beats: 8,
    notes: [
      ...chord(0, [40, 47, 52]), { midi: 40, beat: 1, gain: .6 }, { midi: 40, beat: 1.5, gain: .6 },
      ...chord(2, [43, 50, 55]), { midi: 43, beat: 3, gain: .6 },
      ...chord(4, [45, 52, 57]), { midi: 45, beat: 5, gain: .6 }, { midi: 45, beat: 5.5, gain: .6 },
      ...chord(6, [38, 45, 50]), ...chord(7, [40, 47, 52]),
    ],
  },
  {
    id: "arpeggio", name: "Clean arpeggio", bpm: 84, beats: 8,
    notes: [45, 52, 57, 60, 64, 60, 57, 52, 41, 48, 53, 57, 60, 57, 53, 48].map((midi, i) => ({ midi, beat: i * .5, gain: .55 })),
  },
  {
    id: "lead", name: "Minor-pentatonic lick", bpm: 92, beats: 8,
    notes: [
      { midi: 69, beat: 0 }, { midi: 72, beat: .5 }, { midi: 74, beat: 1 }, { midi: 72, beat: 1.5 },
      { midi: 69, beat: 2 }, { midi: 67, beat: 2.75 }, { midi: 64, beat: 3.25 }, { midi: 67, beat: 4 },
      { midi: 69, beat: 4.5 }, { midi: 72, beat: 5 }, { midi: 76, beat: 5.5 }, { midi: 74, beat: 6 }, { midi: 69, beat: 7 },
    ].map(note => ({ ...note, gain: .7 })),
  },
];

export type Rig = {
  context: AudioContext;
  /** Where the riff enters. Tools connect their chain from here. */
  input: GainNode;
  /** Where a chain ends. Connected to the speakers through a safety limiter. */
  output: GainNode;
  playRiff: (riff: Riff) => void;
  stopRiff: () => void;
  stop: () => void;
};

export async function openRig(onInterrupted: () => void): Promise<Rig> {
  const context = createAudioContext({ latencyHint: "interactive" });
  const input = context.createGain();
  const output = context.createGain();
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.ratio.value = 12; limiter.attack.value = .003; limiter.release.value = .15;
  output.gain.value = .8;
  output.connect(limiter); limiter.connect(context.destination);
  const cache = new Map<number, AudioBuffer>();
  const sources = new Set<AudioBufferSourceNode>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false, unwatch = () => {}, release = () => {};

  const bufferFor = (midi: number) => {
    let buffer = cache.get(midi);
    if (!buffer) {
      const samples = pluckSamples(midiFrequency(midi), context.sampleRate, 2.2, midi + 11);
      buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      cache.set(midi, buffer);
    }
    return buffer;
  };
  const pluck = (midi: number, at: number, gain: number) => {
    const source = context.createBufferSource(), level = context.createGain();
    source.buffer = bufferFor(midi); level.gain.value = gain;
    source.connect(level); level.connect(input);
    sources.add(source);
    source.onended = () => { sources.delete(source); source.disconnect(); level.disconnect(); };
    source.start(at);
  };
  const stopRiff = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
    sources.clear();
  };
  const playRiff = (riff: Riff) => {
    stopRiff();
    if (stopped) return;
    const beat = 60 / riff.bpm, length = riff.beats * beat;
    let start = context.currentTime + .08;
    const schedule = () => {
      if (stopped) return;
      for (const note of riff.notes) pluck(note.midi, start + note.beat * beat, note.gain ?? .6);
      start += length;
      timer = setTimeout(schedule, Math.max(50, (start - context.currentTime - .25) * 1000));
    };
    schedule();
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    stopRiff(); unwatch(); release();
    output.disconnect(); limiter.disconnect();
    void context.close().catch(() => {});
  };
  release = claimAudioSession(() => { stop(); onInterrupted(); });
  try {
    await context.resume();
    unwatch = watchAudioState(context, () => { if (!stopped) { stop(); onInterrupted(); } });
  } catch (error) { stop(); throw error; }
  return { context, input, output, playRiff, stopRiff, stop };
}

/** Soft-clip curve. `amount` 0..1 maps to gentle overdrive through hard fuzz. */
export function driveCurve(amount: number, hard = false, points = 2048): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points);
  const k = hard ? 5 + amount * 200 : 1 + amount * 60;
  for (let i = 0; i < points; i++) {
    const x = (i * 2) / (points - 1) - 1;
    curve[i] = hard
      ? Math.max(-1, Math.min(1, Math.tanh(k * x) * 1.1 + (x > 0 ? .08 * amount : 0)))
      : ((1 + k) * x) / (1 + k * Math.abs(x)) * .9;
  }
  return curve;
}

/** A decaying-noise impulse response: a plausible room without a download. */
export function roomImpulse(context: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  let seed = 7;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967295) * 2 - 1; };
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = random() * (1 - i / length) ** 2.4;
  }
  return buffer;
}
