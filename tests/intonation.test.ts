import test from "node:test";
import assert from "node:assert/strict";
import { estimatePitch } from "../lib/audio/dsp.ts";
import { acceptCapture, CaptureCollector, captureBand, centsBetween, clampTolerance, expectedMidi, frequencyForMidi, intonationVerdict, median, openMidi, spreadCents, TUNINGS } from "../lib/tools/intonation.ts";

const SR = 48000;
const cents = (hz: number, c: number) => hz * 2 ** (c / 1200);
const standard = TUNINGS[0];

test("centsBetween measures from the first frequency to the second", () => {
  assert.ok(Math.abs(centsBetween(440, 880) - 1200) < 1e-9);
  assert.ok(Math.abs(centsBetween(440, cents(440, 5)) - 5) < 1e-9);
  assert.ok(Math.abs(centsBetween(440, cents(440, -3.5)) + 3.5) < 1e-9);
  assert.ok(Number.isNaN(centsBetween(0, 440)));
  assert.ok(Number.isNaN(centsBetween(440, Number.NaN)));
});

test("median and spread", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.ok(Number.isNaN(median([])));
  assert.equal(spreadCents([220]), 0);
  assert.ok(Math.abs(spreadCents([220, cents(220, 4), cents(220, -2)]) - 6) < 1e-9);
});

test("tunings and expected notes", () => {
  assert.equal(openMidi(standard, 6), 40);
  assert.equal(openMidi(standard, 1), 64);
  assert.equal(expectedMidi(standard, 6, "reference", "harmonic"), 52);
  assert.equal(expectedMidi(standard, 6, "reference", "open"), 40);
  assert.equal(expectedMidi(standard, 6, "fretted", "open"), 52);
  const dropD = TUNINGS.find(t => t.id === "drop-d")!;
  assert.equal(expectedMidi(dropD, 6, "fretted", "harmonic"), 50);
  assert.throws(() => openMidi(standard, 7), RangeError);
  for (const tuning of TUNINGS) {
    assert.equal(tuning.midis.length, 6);
    for (let string = 1; string <= 6; string++) {
      for (const midi of [openMidi(tuning, string), openMidi(tuning, string) + 12]) {
        const band = captureBand(midi), f = frequencyForMidi(midi);
        assert.ok(band.minimumFrequency >= 60 && band.maximumFrequency <= 1400);
        assert.ok(band.minimumFrequency < f && f < band.maximumFrequency);
      }
    }
  }
});

test("acceptCapture takes a steady note on the expected pitch", () => {
  const e3 = frequencyForMidi(52);
  const readings = [0, 1, -1, 2, -2, 1.5, .5, -.5].map(c => cents(e3, c + 3));
  const result = acceptCapture(readings, 52);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(Math.abs(centsBetween(e3, result.frequency) - 3.25) < .01);
    assert.ok(result.spread <= 4 + 1e-9);
  }
});

test("acceptCapture drops a few glitches but rejects an unsteady note", () => {
  const e3 = frequencyForMidi(52);
  const withGlitch = [...Array(10).fill(e3), e3 / 2];
  assert.equal(acceptCapture(withGlitch, 52).ok, true);
  const wobbly = [-6, 6, -5, 5, -6, 6, 0, 0].map(c => cents(e3, c));
  const result = acceptCapture(wobbly, 52);
  assert.equal(result.ok, false);
  if (!result.ok) { assert.equal(result.reason, "unsteady"); assert.match(result.message, /spread/); }
  const scattered = [e3, e3, e3, e3 * 2, e3 * 2, e3 * 2, e3 / 2, e3 / 2];
  const scatteredResult = acceptCapture(scattered, 52);
  assert.equal(scatteredResult.ok, false);
});

test("acceptCapture rejects too few readings, the wrong octave and the wrong note", () => {
  const e3 = frequencyForMidi(52);
  const few = acceptCapture([e3, e3], 52);
  assert.equal(!few.ok && few.reason, "too-few");
  const octave = acceptCapture(Array(8).fill(frequencyForMidi(40)), 52);
  assert.equal(!octave.ok && octave.reason, "wrong-octave");
  if (!octave.ok) assert.match(octave.message, /E2/);
  const wrong = acceptCapture(Array(8).fill(frequencyForMidi(57)), 52);
  assert.equal(!wrong.ok && wrong.reason, "wrong-note");
  // 40 cents sharp is still the nearest semitone, so it counts as the right note.
  assert.equal(acceptCapture(Array(8).fill(cents(e3, 40)), 52).ok, true);
});

test("intonationVerdict with a harmonic reference", () => {
  const ref = frequencyForMidi(52);
  const inTune = intonationVerdict(ref, cents(ref, 2), 3);
  assert.equal(inTune.status, "in-tune");
  assert.ok(Math.abs(inTune.cents - 2) < 1e-9);
  const sharp = intonationVerdict(ref, cents(ref, 6), 3);
  assert.equal(sharp.status, "sharp");
  assert.match(sharp.advice, /back, away from the neck/);
  const flat = intonationVerdict(ref, cents(ref, -9), 3);
  assert.equal(flat.status, "flat");
  assert.match(flat.advice, /forward, toward the neck/);
  // Tolerance is clamped to 2–5 cents.
  assert.equal(intonationVerdict(ref, cents(ref, 4.5), 10).status, "in-tune");
  assert.equal(intonationVerdict(ref, cents(ref, 2.5), 0).status, "sharp");
  assert.equal(clampTolerance(Number.NaN), 3);
});

test("intonationVerdict with an open-string reference compares one octave up", () => {
  const open = frequencyForMidi(40);
  const verdict = intonationVerdict(open, cents(open * 2, 5), 3, "open");
  assert.equal(verdict.status, "sharp");
  assert.ok(Math.abs(verdict.cents - 5) < 1e-9);
  assert.equal(intonationVerdict(open, open * 2, 3, "open").status, "in-tune");
  // Without the octave relation the same pair would read 1200 cents sharp.
  assert.ok(intonationVerdict(open, open * 2, 3, "harmonic").cents > 1199);
});

test("the collector waits for a stable onset and then listens for 1.2 s", () => {
  const collector = new CaptureCollector({ seconds: 1.2 });
  const f = 164.8;
  assert.equal(collector.push(f, 0, .001).state, "waiting");
  assert.equal(collector.push(null, .02, .2).state, "waiting");
  collector.push(f, .04, .2);
  collector.push(f * 1.2, .06, .2);            // an attack transient
  collector.push(f, .08, .2);
  collector.push(f, .1, .2);
  const started = collector.push(f, .12, .2);
  assert.equal(started.state, "collecting");
  assert.equal(started.startedAt, .12);
  let step = started;
  for (let t = .14; step.state !== "done"; t += .02) step = collector.push(f, t, .2);
  assert.ok(step.readings.length >= 60);
  const frozen = collector.push(f * 2, 5, .2);
  assert.equal(frozen.readings.length, step.readings.length);
});

/** A plucked-string-like tone: fundamental and decaying harmonics under an exponential decay. */
function pluck(frequency: number, seconds: number, harmonics: number[], seed = 1) {
  const length = Math.round(seconds * SR), out = new Float32Array(length);
  let phase = seed;
  harmonics.forEach((amplitude, index) => {
    const h = index + 1, p = (phase = (phase * 16807) % 2147483647) / 2147483647 * 2 * Math.PI;
    for (let i = 0; i < length; i++) out[i] += amplitude * Math.sin(2 * Math.PI * frequency * h * i / SR + p) * Math.exp(-i / SR * (1.2 + .3 * h));
  });
  return out;
}

/** Runs the real detector the way the component does: 2048-sample windows, hop 1024. */
function capture(signal: Float32Array, midi: number) {
  const collector = new CaptureCollector();
  const band = captureBand(midi);
  let step = collector.state;
  for (let start = 0; start + 2048 <= signal.length && step.state !== "done"; start += 1024) {
    const window = signal.subarray(start, start + 2048);
    let energy = 0;
    for (const x of window) energy += x * x;
    const estimate = estimatePitch(window, SR, band);
    step = collector.push(estimate?.frequency ?? null, (start + 2048) / SR, Math.sqrt(energy / window.length));
  }
  return { step, result: acceptCapture(step.readings, midi) };
}

test("end to end: YIN on a synthesized harmonic and a sharp fretted note on the low E string", () => {
  const midi = expectedMidi(standard, 6, "fretted", "harmonic"), target = frequencyForMidi(midi);
  const harmonic = capture(pluck(target, 2, [.4, .03, .01], 3), midi);
  const fretted = capture(pluck(cents(target, 6), 2, [.3, .2, .15, .1, .07, .05], 9), midi);
  assert.equal(harmonic.step.state, "done");
  assert.equal(harmonic.result.ok, true);
  assert.equal(fretted.result.ok, true);
  if (!harmonic.result.ok || !fretted.result.ok) return;
  assert.ok(Math.abs(centsBetween(target, harmonic.result.frequency)) < 1, `harmonic off by ${centsBetween(target, harmonic.result.frequency)}`);
  const verdict = intonationVerdict(harmonic.result.frequency, fretted.result.frequency, 3);
  assert.equal(verdict.status, "sharp");
  assert.ok(Math.abs(verdict.cents - 6) < 1, `measured ${verdict.cents}`);
});

test("end to end: an open-string reference on the high E string, fretted note flat", () => {
  const open = openMidi(standard, 1), fretMidi = expectedMidi(standard, 1, "fretted", "open");
  const reference = capture(pluck(frequencyForMidi(open), 2, [.3, .2, .1, .08, .05]), open);
  const fretted = capture(pluck(cents(frequencyForMidi(fretMidi), -4), 2, [.3, .15, .08, .04]), fretMidi);
  assert.equal(reference.result.ok && fretted.result.ok, true);
  if (!reference.result.ok || !fretted.result.ok) return;
  const verdict = intonationVerdict(reference.result.frequency, fretted.result.frequency, 3, "open");
  assert.equal(verdict.status, "flat");
  assert.ok(Math.abs(verdict.cents + 4) < 1, `measured ${verdict.cents}`);
});

test("end to end: playing the open string when the fretted note is expected is caught", () => {
  const midi = expectedMidi(standard, 5, "fretted", "harmonic");
  const { result } = capture(pluck(frequencyForMidi(midi - 12), 2, [.3, .1, .05]), midi);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "wrong-octave");
});
