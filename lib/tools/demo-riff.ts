import { pluckSamples, midiFrequency } from "../audio/pluck.ts";

/**
 * A short, original guitar phrase rendered with the site's plucked-string
 * voice, for tools that need something to listen to without asking for a file
 * or a microphone: the pedal lab and the EQ ear trainer.
 *
 * Pure and deterministic: the same sample rate and style always produce the
 * same samples, so a test can pin its length and level, and two tools playing
 * "the clean riff" play the same thing.
 */

export type DemoRiffStyle = "chords" | "single-notes" | "arpeggio";

type Event = { beat: number; midi: readonly number[]; gain: number; strum?: number };

export const DEMO_RIFF_BPM = 96;
/** Every style is exactly two bars of 4/4, so it loops on the bar line. */
export const DEMO_RIFF_BEATS = 8;

/** Open-string MIDI numbers, low E to high E. */
const E2 = 40, D3 = 50, G3 = 55, B3 = 59, E4 = 64;

// Voicings as MIDI, low to high. Em, C, G, D in open position.
const EM = [E2, 47, 52, G3, B3, E4];
const C = [48, 52, G3, 60, E4];
const G = [43, 47, D3, G3, B3, 67];
const D = [D3, 57, 62, 66];

const STYLES: Record<DemoRiffStyle, readonly Event[]> = {
  // Down-strums on 1 and 3, a lighter up-strum on the "and" of 2 and 4.
  chords: [
    { beat: 0, midi: EM, gain: .7, strum: .018 },
    { beat: 1.5, midi: EM.slice(2), gain: .45, strum: .012 },
    { beat: 2, midi: C, gain: .65, strum: .018 },
    { beat: 3.5, midi: C.slice(1), gain: .4, strum: .012 },
    { beat: 4, midi: G, gain: .7, strum: .018 },
    { beat: 5.5, midi: G.slice(2), gain: .45, strum: .012 },
    { beat: 6, midi: D, gain: .65, strum: .016 },
    { beat: 7.5, midi: D.slice(1), gain: .4, strum: .012 },
  ],
  // An E minor pentatonic phrase with space in it, the kind of line that
  // shows what delay, reverb and drive do to a note's tail.
  "single-notes": [
    { beat: 0, midi: [67], gain: .75 },
    { beat: .5, midi: [E4], gain: .7 },
    { beat: 1, midi: [62], gain: .7 },
    { beat: 1.5, midi: [B3], gain: .7 },
    { beat: 2, midi: [62], gain: .75 },
    { beat: 3, midi: [B3], gain: .7 },
    { beat: 4, midi: [69], gain: .8 },
    { beat: 5, midi: [67], gain: .7 },
    { beat: 5.5, midi: [E4], gain: .7 },
    { beat: 6, midi: [E4], gain: .75 },
  ],
  // Let-ring eighth-note arpeggios over Em and C, the chorus and reverb test.
  arpeggio: [
    ...[E2, 47, 52, G3, B3, G3, 52, 47].map((midi, index) => ({ beat: index * .5, midi: [midi], gain: .6 })),
    ...[48, G3, 60, E4, 60, G3, 60, E4].map((midi, index) => ({ beat: 4 + index * .5, midi: [midi], gain: .6 })),
  ],
};

export const DEMO_RIFF_STYLES: readonly { id: DemoRiffStyle; label: string }[] = [
  { id: "chords", label: "Strummed chords" },
  { id: "single-notes", label: "Single-note lead" },
  { id: "arpeggio", label: "Arpeggios" },
];

/** Seconds in one loop of any style. */
export function demoRiffSeconds(bpm = DEMO_RIFF_BPM) { return DEMO_RIFF_BEATS * 60 / bpm; }

/**
 * Render one loop. The tail of every note is wrapped round to the start, so the
 * buffer loops without a click or a gap where the last chord would ring.
 */
export function renderDemoRiff(style: DemoRiffStyle, sampleRate: number, bpm = DEMO_RIFF_BPM): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error("Unsupported sample rate.");
  const length = Math.round(demoRiffSeconds(bpm) * sampleRate);
  const out = new Float32Array(length);
  const secondsPerBeat = 60 / bpm;
  let seed = 1;
  for (const event of STYLES[style]) {
    event.midi.forEach((midi, index) => {
      const start = Math.round((event.beat * secondsPerBeat + index * (event.strum ?? 0)) * sampleRate);
      const note = pluckSamples(midiFrequency(midi), sampleRate, 2.2, seed++);
      const level = event.gain / Math.sqrt(event.midi.length);
      for (let n = 0; n < note.length; n++) out[(start + n) % length] += note[n] * level;
    });
  }
  // Normalise to a fixed peak so every style arrives at the same level.
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  if (peak > 0) for (let n = 0; n < length; n++) out[n] *= .7 / peak;
  return out;
}
