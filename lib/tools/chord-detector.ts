/**
 * Chord estimation from a magnitude spectrum: spectrum → 12-bin chroma →
 * template match → temporal smoothing.
 *
 * It estimates which chord the sounding pitch classes fit best. It cannot see
 * voicings, strings or fingers, and chords that share notes (Am7 and C6, Csus2
 * and Gsus4) are genuinely ambiguous from sound alone. Everything here is pure:
 * inputs are arrays and frames, so it runs the same in a test and a browser.
 */
import { DISPLAY_SHARP } from "../audio/dsp.ts";
import { magnitudeSpectrum } from "./fft.ts";

export const PITCH_CLASSES = ["C", `C${DISPLAY_SHARP}`, "D", `D${DISPLAY_SHARP}`, "E", "F", `F${DISPLAY_SHARP}`, "G", `G${DISPLAY_SHARP}`, "A", `A${DISPLAY_SHARP}`, "B"] as const;

export type ChromaOptions = { minHz?: number; maxHz?: number };

/** Pitch class (0 = C) and deviation in cents for a frequency, A4 = 440 Hz. */
function pitchClassOf(frequency: number) {
  const semitones = 69 + 12 * Math.log2(frequency / 440), nearest = Math.round(semitones);
  return { pc: ((nearest % 12) + 12) % 12, cents: (semitones - nearest) * 100 };
}

/**
 * A 12-bin pitch-class profile from a magnitude spectrum, summing to 1 (all
 * zeros when there is nothing tonal to hear).
 *
 * Only spectral peaks count: a bin must be a local maximum standing clearly
 * above its neighbourhood (a light whitening that ignores broadband noise and
 * window sidelobes). Each peak's frequency is refined by parabolic
 * interpolation, its level is square-root compressed, and low frequencies are
 * weighted down because an 8192-point frame cannot separate low semitones
 * cleanly and the bass strings are loud. A peak that sits on the 3rd, 5th, 6th,
 * 7th, 9th or 10th harmonic of a stronger lower peak is counted at a fraction
 * of its weight, so overtones count less than the notes that made them.
 */
export function chromaFromSpectrum(magnitudes: ArrayLike<number>, sampleRate: number, fftSize: number, options: ChromaOptions = {}) {
  const chroma = new Float64Array(12);
  const minHz = options.minHz ?? 70, maxHz = options.maxHz ?? 2000;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(fftSize) || fftSize <= 0) return chroma;
  const binHz = sampleRate / fftSize;
  const first = Math.max(2, Math.ceil(minHz / binHz)), last = Math.min(magnitudes.length - 3, Math.floor(maxHz / binHz));
  if (last <= first) return chroma;
  let peak = 0;
  for (let k = first; k <= last; k++) { const m = magnitudes[k]; if (Number.isFinite(m) && m > peak) peak = m; }
  if (!(peak > 1e-7)) return chroma;

  // Local mean over ±radius bins for the whitening threshold (a running sum).
  const radius = 24, lo = Math.max(0, first - radius), hi = Math.min(magnitudes.length - 1, last + radius);
  const prefix = new Float64Array(hi - lo + 2);
  for (let k = lo; k <= hi; k++) prefix[k - lo + 1] = prefix[k - lo] + (Number.isFinite(magnitudes[k]) ? magnitudes[k] : 0);
  const localMean = (k: number) => {
    const a = Math.max(lo, k - radius), b = Math.min(hi, k + radius);
    return (prefix[b - lo + 1] - prefix[a - lo]) / (b - a + 1);
  };

  // The noise floor: the median bin level across the band. Broadband noise
  // has almost no bins five times its median; tonal partials sit far above it.
  const band = Array.from({ length: last - first + 1 }, (_, i) => Number.isFinite(magnitudes[first + i]) ? magnitudes[first + i] : 0).sort((a, b) => a - b);
  const floor = band[Math.floor(band.length / 2)];

  const peaks: { frequency: number; magnitude: number; weight: number }[] = [];
  for (let k = first; k <= last; k++) {
    const m = magnitudes[k];
    if (!(m > magnitudes[k - 1] && m >= magnitudes[k + 1])) continue;
    if (m < peak * .02 || m < localMean(k) * 2 || m < floor * 6) continue;
    const a = Math.log(Math.max(magnitudes[k - 1], 1e-12)), b = Math.log(m), c = Math.log(Math.max(magnitudes[k + 1], 1e-12));
    const denominator = a - 2 * b + c;
    const offset = Math.abs(denominator) > 1e-12 ? Math.max(-.5, Math.min(.5, .5 * (a - c) / denominator)) : 0;
    const frequency = (k + offset) * binHz;
    const lowWeight = 1 / (1 + (80 / frequency) ** 2);
    peaks.push({ frequency, magnitude: m, weight: Math.sqrt(m / peak) * lowWeight });
  }

  const overtoneRatios = [3, 5, 6, 7, 9, 10];
  for (let i = 0; i < peaks.length; i++) {
    const upper = peaks[i];
    let factor = 1;
    for (let j = 0; j < i; j++) {
      const lower = peaks[j];
      if (lower.magnitude < upper.magnitude * .5) continue;
      const ratio = upper.frequency / lower.frequency;
      for (const h of overtoneRatios) {
        if (Math.abs(1200 * Math.log2(ratio / h)) < 30) { factor = Math.min(factor, h === 6 || h === 10 ? .4 : .15); break; }
      }
    }
    upper.weight *= factor;
  }

  for (const { frequency, weight } of peaks) {
    const { pc, cents } = pitchClassOf(frequency);
    // A peak far between two semitones is less trustworthy for either.
    chroma[pc] += weight * (1 - .6 * (Math.abs(cents) / 50) ** 2);
  }
  let total = 0;
  for (const x of chroma) total += x;
  if (total > 0) for (let i = 0; i < 12; i++) chroma[i] /= total;
  return chroma;
}

export type ChordQuality = { id: string; suffix: string; label: string; intervals: readonly number[] };

/** Chord qualities as interval sets from the root, simplest first (the order breaks ties). */
export const CHORD_QUALITIES: readonly ChordQuality[] = [
  { id: "major", suffix: "", label: "major", intervals: [0, 4, 7] },
  { id: "minor", suffix: "m", label: "minor", intervals: [0, 3, 7] },
  { id: "5", suffix: "5", label: "power chord", intervals: [0, 7] },
  { id: "sus2", suffix: "sus2", label: "suspended 2nd", intervals: [0, 2, 7] },
  { id: "sus4", suffix: "sus4", label: "suspended 4th", intervals: [0, 5, 7] },
  { id: "7", suffix: "7", label: "dominant 7th", intervals: [0, 4, 7, 10] },
  { id: "maj7", suffix: "maj7", label: "major 7th", intervals: [0, 4, 7, 11] },
  { id: "m7", suffix: "m7", label: "minor 7th", intervals: [0, 3, 7, 10] },
  { id: "dim", suffix: "dim", label: "diminished", intervals: [0, 3, 6] },
  { id: "aug", suffix: "aug", label: "augmented", intervals: [0, 4, 8] },
  { id: "add9", suffix: "add9", label: "added 9th", intervals: [0, 2, 4, 7] },
  { id: "m7b5", suffix: "m7♭5", label: "half-diminished", intervals: [0, 3, 6, 10] },
];

export type ChordMatch = { name: string; root: string; rootPc: number; quality: string; score: number; confidence: number; notes: string[] };

/** Scoring weights. Exported so tests and tuning can see them, not for callers to change. */
export const MATCH_WEIGHTS = { root: 1.15, nonChord: .7, missingFloor: .12, missing: 3, extraTone: .015 } as const;

/**
 * Every root × quality scored against the chroma, best first.
 *
 * Chord tones add their energy (the root a little more), energy outside the
 * chord is penalized, and a chord tone that is nearly silent costs extra, so a
 * plain triad does not come back as a 7th chord that merely contains it. Each
 * tone past three costs a little more, and on equal scores the simpler quality
 * wins. Confidence (0–1) rises with how much of the heard energy the chord
 * explains and falls with missing tones.
 */
export function matchChords(chroma: ArrayLike<number>, options: { top?: number } = {}): ChordMatch[] {
  const top = Math.max(1, Math.floor(options.top ?? 5));
  let total = 0;
  for (let i = 0; i < 12; i++) total += Number.isFinite(chroma[i]) && chroma[i] > 0 ? chroma[i] : 0;
  if (!(total > 0)) return [];
  const c = Array.from({ length: 12 }, (_, i) => Number.isFinite(chroma[i]) && chroma[i] > 0 ? chroma[i] / total : 0);
  const w = MATCH_WEIGHTS;
  const results: (ChordMatch & { order: number })[] = [];
  CHORD_QUALITIES.forEach((quality, order) => {
    for (let root = 0; root < 12; root++) {
      const tones = quality.intervals.map(interval => (root + interval) % 12);
      let inside = 0, missing = 0;
      for (const pc of tones) {
        inside += c[pc] * (pc === root ? w.root : 1);
        missing += Math.max(0, w.missingFloor - c[pc]);
      }
      let explained = 0;
      for (const pc of tones) explained += c[pc];
      const outside = 1 - explained;
      const score = inside - w.nonChord * outside - w.missing * missing - w.extraTone * Math.max(0, tones.length - 3);
      const confidence = Math.max(0, Math.min(1, (score - .3) / .6));
      results.push({ name: PITCH_CLASSES[root] + quality.suffix, root: PITCH_CLASSES[root], rootPc: root, quality: quality.id, score, confidence, notes: tones.map(pc => PITCH_CLASSES[pc]), order });
    }
  });
  results.sort((a, b) => Math.abs(b.score - a.score) > 1e-9 ? b.score - a.score : a.order - b.order);
  return results.slice(0, top).map(match => {
    const { order, ...rest } = match;
    void order;
    return rest;
  });
}

export function rms(samples: ArrayLike<number>) {
  let sum = 0, n = 0;
  for (let i = 0; i < samples.length; i++) { const x = samples[i]; if (Number.isFinite(x)) { sum += x * x; n++; } }
  return n ? Math.sqrt(sum / n) : 0;
}

let spectrumBuffer: Float64Array | undefined;
/** One analysis frame: windowed FFT → chroma, plus the frame's RMS for the silence gate. */
export function analyzeFrame(samples: Float32Array | Float64Array, sampleRate: number, options: ChromaOptions = {}) {
  spectrumBuffer = magnitudeSpectrum(samples, spectrumBuffer && spectrumBuffer.length === samples.length / 2 + 1 ? spectrumBuffer : undefined);
  return { chroma: chromaFromSpectrum(spectrumBuffer, sampleRate, samples.length, options), rms: rms(samples) };
}

export type SmootherOptions = { windowSeconds?: number; stableFrames?: number; rmsGate?: number; minConfidence?: number; top?: number };
export type SmootherFrame = { chroma: ArrayLike<number>; rms: number; time: number };
export type SmootherOutput = { chord: ChordMatch | null; candidates: ChordMatch[]; chroma: Float64Array; silent: boolean };

/**
 * Averages chroma over the last `windowSeconds` of frames and only reports a
 * chord once the same best match has held for `stableFrames` frames in a row.
 * A frame below the RMS gate is silence: the history clears and nothing is
 * reported. A match below `minConfidence` never becomes the reported chord.
 */
export class ChordSmoother {
  readonly windowSeconds: number;
  readonly stableFrames: number;
  readonly rmsGate: number;
  readonly minConfidence: number;
  readonly top: number;
  private frames: { chroma: Float64Array; time: number }[] = [];
  private pending: string | null = null;
  private count = 0;
  private reported: ChordMatch | null = null;

  constructor(options: SmootherOptions = {}) {
    this.windowSeconds = options.windowSeconds ?? .5;
    this.stableFrames = Math.max(1, Math.floor(options.stableFrames ?? 3));
    this.rmsGate = options.rmsGate ?? .01;
    this.minConfidence = options.minConfidence ?? .35;
    this.top = options.top ?? 4;
  }

  reset() { this.frames = []; this.pending = null; this.count = 0; this.reported = null; }

  push(frame: SmootherFrame): SmootherOutput {
    if (!Number.isFinite(frame.rms) || frame.rms < this.rmsGate || !Number.isFinite(frame.time)) {
      this.reset();
      return { chord: null, candidates: [], chroma: new Float64Array(12), silent: true };
    }
    this.frames.push({ chroma: Float64Array.from({ length: 12 }, (_, i) => Number.isFinite(frame.chroma[i]) ? frame.chroma[i] : 0), time: frame.time });
    // Keep frames that started within the window; always keep the newest.
    while (this.frames.length > 1 && frame.time - this.frames[0].time >= this.windowSeconds - 1e-9) this.frames.shift();
    const chroma = new Float64Array(12);
    for (const f of this.frames) for (let i = 0; i < 12; i++) chroma[i] += f.chroma[i] / this.frames.length;
    const candidates = matchChords(chroma, { top: this.top });
    const best = candidates[0] && candidates[0].confidence >= this.minConfidence ? candidates[0] : null;
    const name = best?.name ?? null;
    if (name === this.pending) this.count++;
    else { this.pending = name; this.count = 1; }
    if (this.count >= this.stableFrames) this.reported = best;
    else if (this.reported) this.reported = candidates.find(match => match.name === this.reported!.name) ?? this.reported;
    return { chord: this.reported, candidates, chroma, silent: false };
  }
}
