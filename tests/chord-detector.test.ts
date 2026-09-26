import test from "node:test";
import assert from "node:assert/strict";
import { fft, hannWindow, isPowerOfTwo, magnitudeSpectrum } from "../lib/tools/fft.ts";
import { analyzeFrame, CHORD_QUALITIES, ChordSmoother, chromaFromSpectrum, matchChords, PITCH_CLASSES } from "../lib/tools/chord-detector.ts";

const SR = 48000, N = 8192;

/** Deterministic pseudo-random numbers so every run hears the same "strum". */
function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => { state ^= state << 13; state >>>= 0; state ^= state >>> 17; state ^= state << 5; state >>>= 0; return state / 4294967296; };
}
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * A strum as a sum of harmonic tones: each string's fundamental plus nine
 * overtones falling off as 1/h^decay, with slight string inharmonicity,
 * random phases and slightly uneven string levels.
 */
function strum(midis: number[], { decay = 1, seed = 7, gain = .08, length = N } = {}) {
  const rand = random(seed), out = new Float32Array(length);
  for (const midi of midis) {
    const f0 = hz(midi), level = gain * (.75 + .5 * rand());
    for (let h = 1; h <= 10; h++) {
      const f = f0 * h * Math.sqrt(1 + 1e-4 * h * h);
      if (f >= SR / 2) break;
      const a = level / h ** decay, phase = rand() * 2 * Math.PI;
      for (let i = 0; i < length; i++) out[i] += a * Math.sin(2 * Math.PI * f * i / SR + phase);
    }
  }
  return out;
}
function noise(seed: number, amplitude = .1, length = N) {
  const rand = random(seed);
  return Float32Array.from({ length }, () => (rand() - .5) * 2 * amplitude);
}

// Real guitar voicings, low string to high, as MIDI note numbers.
const VOICINGS: Record<string, number[]> = {
  C: [48, 52, 55, 60, 64],            // open C, x32010
  G: [43, 47, 50, 55, 59, 67],        // open G, 320003
  F: [41, 48, 53, 57, 60, 65],        // E-shape barre at the 1st fret, 133211
  A: [45, 52, 57, 61, 64, 69],        // E-shape barre at the 5th fret, 577655
  Am: [45, 52, 57, 60, 64],           // open Am, x02210
  Dm: [50, 57, 62, 65],               // open Dm, xx0231
  E5: [40, 47, 52],                   // E5 power chord, 022xxx
  G7: [43, 47, 50, 55, 59, 65],       // open G7, 320001
  Cmaj7: [48, 52, 55, 59, 64],        // open Cmaj7, x32000
  Em: [40, 47, 52, 55, 59, 64],       // open Em, 022000
  D: [50, 57, 62, 66],                // open D, xx0232
};

test("isPowerOfTwo and the FFT size validation", () => {
  assert.ok(isPowerOfTwo(8192));
  for (const bad of [0, 1, 3, 1000, 4096.5, -8]) assert.equal(isPowerOfTwo(bad), false);
  assert.throws(() => magnitudeSpectrum(new Float32Array(1000)), RangeError);
  assert.throws(() => hannWindow(12), RangeError);
  assert.throws(() => fft(new Float64Array(8), new Float64Array(4)), RangeError);
});

test("the FFT matches a direct DFT", () => {
  const n = 64, rand = random(3);
  const re = Float64Array.from({ length: n }, () => rand() - .5), im = Float64Array.from({ length: n }, () => rand() - .5);
  const expected = Array.from({ length: n }, (_, k) => {
    let sr = 0, si = 0;
    for (let t = 0; t < n; t++) {
      const angle = -2 * Math.PI * k * t / n;
      sr += re[t] * Math.cos(angle) - im[t] * Math.sin(angle);
      si += re[t] * Math.sin(angle) + im[t] * Math.cos(angle);
    }
    return [sr, si];
  });
  fft(re, im);
  for (let k = 0; k < n; k++) {
    assert.ok(Math.abs(re[k] - expected[k][0]) < 1e-9 && Math.abs(im[k] - expected[k][1]) < 1e-9, `bin ${k}`);
  }
});

test("the magnitude spectrum puts a sine at its bin with unit scale", () => {
  const bin = 100, f = bin * SR / N;
  const sine = Float32Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * f * i / SR));
  const spectrum = magnitudeSpectrum(sine);
  assert.equal(spectrum.length, N / 2 + 1);
  let best = 0;
  for (let k = 1; k < spectrum.length; k++) if (spectrum[k] > spectrum[best]) best = k;
  assert.equal(best, bin);
  assert.ok(Math.abs(spectrum[bin] - 1) < .01);
  const reused = new Float64Array(N / 2 + 1);
  assert.equal(magnitudeSpectrum(sine, reused), reused);
  const window = hannWindow(N);
  assert.equal(window[0], 0);
  assert.ok(Math.abs(window[N / 2] - 1) < 1e-12);
});

test("chroma of a single harmonic tone peaks on its pitch class and sums to 1", () => {
  const { chroma } = analyzeFrame(strum([57]), SR);
  const total = chroma.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  const best = chroma.indexOf(Math.max(...chroma));
  assert.equal(PITCH_CLASSES[best], "A");
  assert.ok(chroma[best] > .6, `A carries ${chroma[best]}`);
});

test("chromaFromSpectrum returns zeros for silence and bad input", () => {
  assert.deepEqual(Array.from(chromaFromSpectrum(new Float64Array(N / 2 + 1), SR, N)), Array(12).fill(0));
  assert.deepEqual(Array.from(chromaFromSpectrum(new Float64Array(N / 2 + 1).fill(1), 0, N)), Array(12).fill(0));
});

test("every quality is an interval set from the root", () => {
  assert.deepEqual(CHORD_QUALITIES.map(q => q.id), ["major", "minor", "5", "sus2", "sus4", "7", "maj7", "m7", "dim", "aug", "add9", "m7b5"]);
  for (const quality of CHORD_QUALITIES) {
    assert.equal(quality.intervals[0], 0);
    assert.equal(new Set(quality.intervals).size, quality.intervals.length);
  }
});

test("a plain major triad comes back as the triad, not a 7th chord that contains it", () => {
  const chroma = new Float64Array(12);
  chroma[0] = chroma[4] = chroma[7] = 1 / 3;
  const [best, second] = matchChords(chroma, { top: 3 });
  assert.equal(best.name, "C");
  assert.deepEqual(best.notes, ["C", "E", "G"]);
  assert.equal(best.quality, "major");
  assert.ok(best.score > second.score);
  assert.ok(best.confidence > .8);
});

test("names use the site's sharp and the conventional suffixes", () => {
  const chroma = new Float64Array(12);
  chroma[1] = chroma[4] = chroma[8] = 1 / 3; // C♯ E G♯
  assert.equal(matchChords(chroma)[0].name, `C${"♯"}m`);
  const fifth = new Float64Array(12);
  fifth[4] = .6; fifth[11] = .4;
  assert.equal(matchChords(fifth)[0].name, "E5");
  assert.deepEqual(matchChords(new Float64Array(12)), []);
});

for (const [name, voicing] of Object.entries(VOICINGS)) {
  test(`the FFT → chroma → match pipeline hears ${name} at 48 kHz`, () => {
    for (const [decay, seed] of [[.8, 11], [1, 23], [1.5, 42]]) {
      const { chroma, rms } = analyzeFrame(strum(voicing, { decay, seed }), SR);
      assert.ok(rms > .01);
      const matches = matchChords(chroma, { top: 3 });
      assert.equal(matches[0].name, name, `decay ${decay}: heard ${matches.map(m => m.name).join(", ")}`);
      assert.ok(matches[0].confidence >= .5, `${name} confidence ${matches[0].confidence}`);
    }
  });
}

test("a chord still wins with some room noise under it", () => {
  const chord = strum(VOICINGS.G), hiss = noise(5, .005);
  const mixed = chord.map((x, i) => x + hiss[i]);
  assert.equal(matchChords(analyzeFrame(mixed, SR).chroma)[0].name, "G");
});

test("silence and broadband noise give nothing confident", () => {
  assert.deepEqual(matchChords(analyzeFrame(new Float32Array(N), SR).chroma), []);
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const matches = matchChords(analyzeFrame(noise(seed, .2), SR).chroma);
    assert.ok(matches.length === 0 || matches[0].confidence < .35, `seed ${seed}: ${matches[0]?.name} ${matches[0]?.confidence}`);
  }
});

test("the smoother needs a stable result, gates silence and follows a chord change", () => {
  const smoother = new ChordSmoother({ windowSeconds: .5, stableFrames: 3 });
  const hop = 4096 / SR;
  const c = analyzeFrame(strum(VOICINGS.C), SR), g = analyzeFrame(strum(VOICINGS.G), SR);
  let time = 0;
  const push = (frame: { chroma: Float64Array; rms: number }) => smoother.push({ ...frame, time: time += hop });
  assert.equal(push(c).chord, null);
  assert.equal(push(c).chord, null);
  assert.equal(push(c).chord?.name, "C");
  for (let i = 0; i < 8; i++) push(c);
  // The window averages older frames, so the change takes a few frames.
  let heard = push(g);
  assert.equal(heard.chord?.name, "C");
  for (let i = 0; i < 10 && heard.chord?.name !== "G"; i++) heard = push(g);
  assert.equal(heard.chord?.name, "G");
  const silent = smoother.push({ chroma: g.chroma, rms: .001, time: time += hop });
  assert.equal(silent.silent, true);
  assert.equal(silent.chord, null);
  // After silence it starts over.
  assert.equal(push(g).chord, null);
});

test("the smoother never reports noise", () => {
  const smoother = new ChordSmoother();
  let time = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const out = smoother.push({ ...analyzeFrame(noise(seed, .2), SR), time: time += .085 });
    assert.equal(out.chord, null);
  }
});
