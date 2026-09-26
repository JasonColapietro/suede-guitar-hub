/**
 * Intonation check logic: compare a string's 12th-fret reference with the
 * fretted 12th-fret note, in cents, and say which way the saddle goes.
 *
 * The reference is either the 12th-fret harmonic (exactly one octave above the
 * open string, whatever the saddle position) or the open string itself, which
 * is compared one octave up. A fretted note that is sharp means the vibrating
 * length is too short, so the saddle moves back, away from the neck; a flat
 * one means the saddle moves forward, toward the neck.
 *
 * This compares pitch only. It does not measure relief, action or anything
 * else about the setup.
 */
import { noteName } from "../audio/dsp.ts";

export type ReferenceKind = "harmonic" | "open";

export type Tuning = { id: string; label: string; /** Open-string MIDI notes, string 6 (low) to string 1 (high). */ midis: readonly number[] };
export const TUNINGS: readonly Tuning[] = [
  { id: "standard", label: "Standard (E A D G B E)", midis: [40, 45, 50, 55, 59, 64] },
  { id: "drop-d", label: "Drop D (D A D G B E)", midis: [38, 45, 50, 55, 59, 64] },
  { id: "eb-standard", label: "E♭ standard (half step down)", midis: [39, 44, 49, 54, 58, 63] },
  { id: "d-standard", label: "D standard (whole step down)", midis: [38, 43, 48, 53, 57, 62] },
  { id: "drop-c", label: "Drop C (C G C F A D)", midis: [36, 43, 48, 53, 57, 62] },
  { id: "dadgad", label: "DADGAD", midis: [38, 45, 50, 55, 57, 62] },
  { id: "open-g", label: "Open G (D G D G B D)", midis: [38, 43, 50, 55, 59, 62] },
];

export const TOLERANCE = { default: 3, min: 2, max: 5 } as const;
export const CAPTURE = { seconds: 1.2, maxSpreadCents: 8, minReadings: 6, outlierCents: 50 } as const;

export function clampTolerance(value: number) {
  return Number.isFinite(value) ? Math.min(TOLERANCE.max, Math.max(TOLERANCE.min, value)) : TOLERANCE.default;
}
export function frequencyForMidi(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }

/** Open-string MIDI note for string 6 (low) … 1 (high) in a tuning. */
export function openMidi(tuning: Tuning, string: number) {
  const midi = tuning.midis[6 - string];
  if (midi === undefined) throw new RangeError(`String ${string} is not in 1–6.`);
  return midi;
}
/** The note each capture should land on: the open string for an open reference, else the octave above. */
export function expectedMidi(tuning: Tuning, string: number, step: "reference" | "fretted", reference: ReferenceKind) {
  const open = openMidi(tuning, string);
  return step === "reference" && reference === "open" ? open : open + 12;
}
/** A pitch band for the detector around the expected note, wide enough to hear a wrong octave, inside 60–1400 Hz. */
export function captureBand(midi: number) {
  const f = frequencyForMidi(midi);
  return { minimumFrequency: Math.max(60, f / 2.4), maximumFrequency: Math.min(1400, f * 2.4) };
}

/** Cents from frequency `a` up to frequency `b` (positive when b is higher). */
export function centsBetween(a: number, b: number) {
  if (!(a > 0) || !(b > 0) || !Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return 1200 * Math.log2(b / a);
}

export function median(values: readonly number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  if (!sorted.length) return NaN;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Highest minus lowest reading, in cents. Zero for fewer than two readings. */
export function spreadCents(readings: readonly number[]) {
  const valid = readings.filter(x => Number.isFinite(x) && x > 0);
  if (valid.length < 2) return 0;
  return centsBetween(Math.min(...valid), Math.max(...valid));
}

export type CaptureResult =
  | { ok: true; frequency: number; spread: number; readings: number }
  | { ok: false; reason: "too-few" | "unsteady" | "wrong-octave" | "wrong-note"; message: string; frequency?: number };

/**
 * Accept or reject one capture's pitch readings (Hz).
 *
 * Readings more than 50 cents from the median are dropped as detector
 * glitches, but if that removes more than a quarter of them the note was not
 * steady. The rest must sit within `maxSpreadCents` of each other, and their
 * median must be the expected note in the expected octave.
 */
export function acceptCapture(readings: readonly number[], expected: number, options: { maxSpreadCents?: number; minReadings?: number } = {}): CaptureResult {
  const maxSpread = options.maxSpreadCents ?? CAPTURE.maxSpreadCents, minReadings = options.minReadings ?? CAPTURE.minReadings;
  const valid = readings.filter(x => Number.isFinite(x) && x > 0);
  if (valid.length < minReadings) return { ok: false, reason: "too-few", message: "Not enough clear pitch readings. Let the note ring for a full second and keep the other strings quiet, then try again." };
  const center = median(valid);
  const kept = valid.filter(x => Math.abs(centsBetween(center, x)) <= CAPTURE.outlierCents);
  const heard = noteName(Math.round(69 + 12 * Math.log2(center / 440)));
  if (kept.length < minReadings || kept.length < valid.length * .75) return { ok: false, reason: "unsteady", message: "The pitch was not steady enough to measure. Pluck once, let it ring without touching the string, and try again.", frequency: center };
  const spread = spreadCents(kept);
  if (spread > maxSpread) return { ok: false, reason: "unsteady", message: `The readings spread over ${spread.toFixed(1)} cents, more than the ${maxSpread} allowed. Pluck more gently, keep the fretting pressure even, and try again.`, frequency: center };
  const frequency = median(kept);
  const offset = 12 * Math.log2(frequency / frequencyForMidi(expected));
  const semitones = Math.round(offset);
  if (semitones !== 0) {
    const want = noteName(expected);
    if (semitones % 12 === 0) return { ok: false, reason: "wrong-octave", message: `Heard ${heard}, an octave away from the ${want} this step expects. Check that you played the right string at the 12th fret, then try again.`, frequency };
    return { ok: false, reason: "wrong-note", message: `Heard ${heard}, but this step expects ${want}. Retune the open string, check the string and fret, then try again.`, frequency };
  }
  return { ok: true, frequency, spread, readings: kept.length };
}

export type Verdict = { cents: number; status: "in-tune" | "sharp" | "flat"; advice: string };

/**
 * Compare a fretted 12th-fret note with its reference.
 *
 * With a harmonic reference the two should be the same pitch. With an open
 * string reference the fretted note should be exactly one octave higher, so the
 * reference is doubled before comparing.
 */
export function intonationVerdict(referenceHz: number, frettedHz: number, tolerance: number = TOLERANCE.default, reference: ReferenceKind = "harmonic"): Verdict {
  const limit = clampTolerance(tolerance);
  const target = reference === "open" ? referenceHz * 2 : referenceHz;
  const cents = centsBetween(target, frettedHz);
  if (!Number.isFinite(cents)) return { cents: NaN, status: "in-tune", advice: "Capture both notes to compare them." };
  const size = Math.abs(cents) > 15 ? "a noticeable amount (start with about a quarter turn of the saddle screw)" : Math.abs(cents) > 7 ? "a small amount" : "a very small amount";
  if (Math.abs(cents) <= limit) return { cents, status: "in-tune", advice: `Within ±${limit} cents. Leave this saddle where it is.` };
  if (cents > 0) return { cents, status: "sharp", advice: `The fretted note is sharp. Move the saddle back, away from the neck, ${size}, then retune and recheck.` };
  return { cents, status: "flat", advice: `The fretted note is flat. Move the saddle forward, toward the neck, ${size}, then retune and recheck.` };
}

export type CaptureStep = { state: "waiting" | "collecting" | "done"; readings: number[]; startedAt: number | null };

/**
 * Collects pitch readings for one capture. It waits for a stable onset (three
 * consecutive readings within 25 cents of each other, above the level gate),
 * then keeps every reading for `seconds` and reports "done".
 * Feed it one estimate (Hz or null) per analysis window with its time and RMS.
 */
export class CaptureCollector {
  readonly seconds: number;
  readonly rmsGate: number;
  private recent: number[] = [];
  private step: CaptureStep = { state: "waiting", readings: [], startedAt: null };

  constructor(options: { seconds?: number; rmsGate?: number } = {}) {
    this.seconds = options.seconds ?? CAPTURE.seconds;
    this.rmsGate = options.rmsGate ?? .015;
  }

  get state(): CaptureStep { return { ...this.step, readings: [...this.step.readings] }; }

  push(frequency: number | null, time: number, rms: number): CaptureStep {
    if (this.step.state === "done" || !Number.isFinite(time)) return this.state;
    const valid = frequency !== null && Number.isFinite(frequency) && frequency > 0;
    if (this.step.state === "waiting") {
      if (!valid || !(rms >= this.rmsGate)) { this.recent = []; return this.state; }
      this.recent.push(frequency);
      if (this.recent.length > 3) this.recent.shift();
      if (this.recent.length === 3 && spreadCents(this.recent) <= 25) {
        this.step = { state: "collecting", readings: [...this.recent], startedAt: time };
      }
      return this.state;
    }
    if (valid) this.step.readings.push(frequency);
    if (time - (this.step.startedAt ?? time) >= this.seconds) this.step.state = "done";
    return this.state;
  }
}
