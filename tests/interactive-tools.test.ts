import test from "node:test";
import assert from "node:assert/strict";
import { scoreTaps, tapAdvice, pitchClass } from "../lib/learning/interactive.ts";
import { pluckSamples } from "../lib/audio/pluck.ts";

test("tap-along matches each hit to its nearest tap and rates the offset", () => {
  const targets = [0, .5, 1, 1.5];
  const result = scoreTaps(targets, [0.01, .57, 1.2], .25);
  assert.deepEqual(result.hits.map(hit => hit.rating), ["great", "good", "late", "missed"]);
  assert.deepEqual(result.hits.map(hit => hit.offsetMs), [10, 70, 200, null]);
  assert.equal(result.extraTaps, 0);
  assert.equal(result.missed, 1);
  assert.equal(scoreTaps(targets, targets, .25).score, 100);
});

test("extra taps cost points so mashing cannot win", () => {
  const targets = [0, 1, 2, 3];
  const clean = scoreTaps(targets, targets, .3).score;
  const mashed = scoreTaps(targets, [...targets, .2, .4, .6, 1.3, 1.6, 2.4].sort(), .3).score;
  assert.ok(mashed < clean);
  assert.equal(scoreTaps([], [], .3).score, 0);
});

test("advice names rushing and dragging from the average offset", () => {
  const targets = [0, 1, 2, 3];
  assert.match(tapAdvice(scoreTaps(targets, targets.map(t => t - .07), .25)), /Rushing/);
  assert.match(tapAdvice(scoreTaps(targets, targets.map(t => t + .07), .25)), /Dragging/);
  assert.equal(pitchClass(61), "C♯");
});

test("plucked string is deterministic, bounded and at the requested pitch", () => {
  const sampleRate = 44100, frequency = 110;
  const a = pluckSamples(frequency, sampleRate, .5, 3), b = pluckSamples(frequency, sampleRate, .5, 3);
  assert.deepEqual(a, b);
  assert.ok(a.every(value => Math.abs(value) <= 1));
  assert.ok(Math.abs(a[0]) < 1e-9, "fades in from silence");
  // Autocorrelation peak near one period confirms the pitch.
  const period = Math.round(sampleRate / frequency);
  const corr = (lag: number) => { let sum = 0; for (let i = 2000; i < 8000; i++) sum += a[i] * a[i + lag]; return sum; };
  assert.ok(corr(period) > corr(Math.round(period / 2)) && corr(period) > 0);
  assert.throws(() => pluckSamples(0, sampleRate));
});
