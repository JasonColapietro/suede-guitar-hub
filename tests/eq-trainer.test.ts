import assert from "node:assert/strict";
import test from "node:test";

import {
  ISO_OCTAVE_BANDS,
  LEVELS,
  MIN_ANSWERS_FOR_BEST,
  PEAKING_Q,
  accuracy,
  bandAccuracy,
  bandDescription,
  bandsFor,
  emptyStats,
  feedbackLine,
  formatBand,
  levelById,
  makeQuestion,
  pinkNoise,
  preGainFor,
  recordAnswer,
  scoreAnswer,
  seededRandom,
  topConfusions,
  updateBest,
  type EqQuestion,
} from "../lib/tools/eq-trainer.ts";

test("levels match the specification", () => {
  assert.deepEqual(levelById(1).bands, [125, 500, 2000, 8000]);
  assert.equal(levelById(1).gainDb, 12);
  assert.equal(levelById(1).cuts, false);
  assert.deepEqual(levelById(2).bands, [100, 200, 400, 800, 1600, 3200, 6400]);
  assert.equal(levelById(2).gainDb, 9);
  assert.equal(levelById(3).cuts, true);
  assert.equal(levelById(3).gainDb, 9);
  assert.deepEqual(levelById(4).bands, ISO_OCTAVE_BANDS);
  assert.equal(levelById(4).bands.length, 10);
  assert.equal(levelById(4).gainDb, 6);
  assert.equal(levelById(99), LEVELS[0]);
  assert.ok(PEAKING_Q >= 1.4 && PEAKING_Q <= 2);
});

test("bands a guitar loop barely has are left out of guitar rounds", () => {
  assert.deepEqual(bandsFor(levelById(4), "pink-noise"), [...ISO_OCTAVE_BANDS]);
  assert.deepEqual(bandsFor(levelById(4), "chords"), [125, 250, 500, 1000, 2000, 4000, 8000]);
  assert.deepEqual(bandsFor(levelById(1), "single-notes"), [500, 2000, 8000]);
  assert.deepEqual(bandsFor(levelById(2), "arpeggio"), [...levelById(2).bands]);
});

test("questions follow the injected random source and never repeat a band", () => {
  for (const level of LEVELS) {
    for (const source of ["chords", "single-notes", "pink-noise"] as const) {
      const a = seededRandom(level.id * 11), b = seededRandom(level.id * 11);
      const bands = bandsFor(level, source);
      const seen = new Set<number>();
      let boosts = 0, cuts = 0;
      let previous: EqQuestion | null = null;
      for (let i = 0; i < 300; i++) {
        const question = makeQuestion(level, a, previous, source);
        assert.deepEqual(question, makeQuestion(level, b, previous, source));
        assert.ok(bands.includes(question.band));
        if (previous) assert.notEqual(question.band, previous.band);
        assert.equal(Math.abs(question.gainDb), level.gainDb);
        if (question.gainDb > 0) boosts++; else cuts++;
        seen.add(question.band);
        previous = question;
      }
      assert.equal(seen.size, bands.length, `${level.id} ${source}`);
      if (level.cuts) assert.ok(boosts > 90 && cuts > 90); else assert.equal(cuts, 0);
    }
  }
});

test("scoring counts the right band, needs the direction on cut levels, and flags octave near misses", () => {
  const two = levelById(2), three = levelById(3);
  assert.deepEqual(scoreAnswer({ band: 800, gainDb: 9 }, { band: 800 }, two), { correct: true, bandCorrect: true, directionCorrect: null, nearMiss: false, octavesOff: 0 });
  const near = scoreAnswer({ band: 800, gainDb: 9 }, { band: 1600 }, two);
  assert.equal(near.correct, false);
  assert.equal(near.nearMiss, true);
  assert.equal(near.octavesOff, 1);
  assert.equal(scoreAnswer({ band: 800, gainDb: 9 }, { band: 400 }, two).octavesOff, -1);
  assert.equal(scoreAnswer({ band: 800, gainDb: 9 }, { band: 3200 }, two).nearMiss, false);
  // Level 1's bands are two octaves apart, so a wrong answer there is never "one octave off".
  assert.equal(scoreAnswer({ band: 500, gainDb: 12 }, { band: 2000 }, levelById(1)).nearMiss, false);
  const wrongWay = scoreAnswer({ band: 400, gainDb: -9 }, { band: 400, boost: true }, three);
  assert.deepEqual([wrongWay.correct, wrongWay.bandCorrect, wrongWay.directionCorrect], [false, true, false]);
  assert.equal(scoreAnswer({ band: 400, gainDb: -9 }, { band: 400, boost: false }, three).correct, true);
  assert.equal(scoreAnswer({ band: 400, gainDb: -9 }, { band: 400 }, three).correct, false);
});

test("feedback names the answer, the direction and near misses", () => {
  const two = levelById(2), three = levelById(3);
  const q = { band: 800, gainDb: 9 };
  assert.equal(feedbackLine(q, { band: 800 }, scoreAnswer(q, { band: 800 }, two), two), "Correct: 800 Hz boost of 9 dB.");
  assert.equal(feedbackLine(q, { band: 1600 }, scoreAnswer(q, { band: 1600 }, two), two), "Near miss: you chose 1.6 kHz. It was 800 Hz boost, one octave lower.");
  const cut = { band: 200, gainDb: -9 };
  assert.match(feedbackLine(cut, { band: 200, boost: true }, scoreAnswer(cut, { band: 200, boost: true }, three), three), /wrong direction: it was a cut/);
  assert.match(feedbackLine(cut, { band: 3200, boost: false }, scoreAnswer(cut, { band: 3200, boost: false }, three), three), /^Not this time: you chose 3.2 kHz cut/);
});

test("stats track accuracy per band and which bands get confused", () => {
  const level = levelById(2);
  let stats = emptyStats();
  const answer = (band: number, guess: number) => { const q = { band, gainDb: 9 }, a = { band: guess }; stats = recordAnswer(stats, q, a, scoreAnswer(q, a, level)); };
  answer(800, 800); answer(800, 1600); answer(800, 1600); answer(200, 200); answer(200, 400); answer(3200, 200);
  assert.equal(stats.answered, 6);
  assert.equal(stats.correct, 2);
  assert.equal(stats.nearMisses, 3);
  assert.equal(accuracy(stats), 2 / 6);
  assert.equal(accuracy(emptyStats()), null);
  assert.deepEqual(bandAccuracy(stats).map(b => [b.band, b.asked, b.correct]), [[200, 2, 1], [800, 3, 1], [3200, 1, 0]]);
  assert.deepEqual(topConfusions(stats, 2), [{ actual: 800, guess: 1600, count: 2 }, { actual: 200, guess: 400, count: 1 }]);
  // recordAnswer does not mutate.
  const before = JSON.stringify(stats);
  recordAnswer(stats, { band: 100, gainDb: 9 }, { band: 100 }, scoreAnswer({ band: 100, gainDb: 9 }, { band: 100 }, level));
  assert.equal(JSON.stringify(stats), before);
});

test("a best score needs enough answers and must beat the old one", () => {
  const level = levelById(1);
  let stats = emptyStats();
  for (let i = 0; i < MIN_ANSWERS_FOR_BEST - 1; i++) { const q = { band: 500, gainDb: 12 }; stats = recordAnswer(stats, q, { band: 500 }, scoreAnswer(q, { band: 500 }, level)); }
  assert.equal(updateBest(null, stats), null);
  const q = { band: 125, gainDb: 12 };
  stats = recordAnswer(stats, q, { band: 500 }, scoreAnswer(q, { band: 500 }, level));
  assert.equal(updateBest(null, stats), .9);
  assert.equal(updateBest(.95, stats), .95);
  assert.equal(updateBest(.5, stats), .9);
});

test("every band has a guitar description", () => {
  for (const level of LEVELS) for (const band of level.bands) {
    const text = bandDescription(band);
    assert.ok(text.startsWith(`${formatBand(band)}: `), text);
    assert.ok(text.length > 40);
  }
  assert.match(bandDescription(800), /^800 Hz: honk and nasal midrange/);
  assert.equal(formatBand(31.5), "31.5 Hz");
  assert.equal(formatBand(1600), "1.6 kHz");
  assert.equal(formatBand(16000), "16 kHz");
});

test("pre-gain keeps the largest boost at the source's peak", () => {
  for (const level of LEVELS) assert.ok(Math.abs(20 * Math.log10(preGainFor(level)) + level.gainDb) < 1e-9);
});

/** Mean power of one DFT bin across successive windows. */
function binPower(x: Float32Array, frequency: number, sampleRate: number, size = 2048) {
  let total = 0, windows = 0;
  for (let offset = 0; offset + size <= x.length; offset += size, windows++) {
    let re = 0, im = 0;
    for (let n = 0; n < size; n++) {
      const w = .5 - .5 * Math.cos(2 * Math.PI * n / size);
      const phase = 2 * Math.PI * frequency * n / sampleRate;
      re += x[offset + n] * w * Math.cos(phase); im -= x[offset + n] * w * Math.sin(phase);
    }
    total += re * re + im * im;
  }
  return total / windows;
}

test("pink noise is deterministic, bounded, seamless and falls about 3 dB per octave", () => {
  const sampleRate = 48000;
  const a = pinkNoise(sampleRate * 2, seededRandom(5)), b = pinkNoise(sampleRate * 2, seededRandom(5));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, pinkNoise(sampleRate * 2, seededRandom(6)));
  let peak = 0, sum = 0;
  for (const x of a) { peak = Math.max(peak, Math.abs(x)); sum += x; }
  assert.ok(Math.abs(peak - .7) < 1e-6);
  assert.ok(Math.abs(sum / a.length) < .05, "no large DC offset");
  // The loop point is no bigger a step than the signal takes elsewhere.
  let largestStep = 0;
  for (let i = 1; i < a.length; i++) largestStep = Math.max(largestStep, Math.abs(a[i] - a[i - 1]));
  assert.ok(Math.abs(a[0] - a[a.length - 1]) <= largestStep);
  // Per-bin power halves per octave (−3 dB): four octaves is about −12 dB.
  const low = binPower(a, 250, sampleRate), high = binPower(a, 4000, sampleRate);
  const slope = 10 * Math.log10(high / low) / 4;
  assert.ok(slope < -2 && slope > -4, `slope ${slope.toFixed(2)} dB per octave`);
  assert.equal(pinkNoise(0, seededRandom(1)).length, 0);
});
