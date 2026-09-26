import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SLOW_DOWNER_SETTINGS,
  SPEED_MAX,
  SPEED_MIN,
  clampSpeed,
  crossedLoopEnd,
  describePitchShift,
  extractPeaks,
  formatTime,
  mergePeaks,
  nextSpeedUpRate,
  normalizeLoop,
  parseSlowDownerSettings,
  speedToRate,
  tapeSemitones,
  timeAtPosition,
} from "../lib/tools/slow-downer.ts";

const close = (actual: number, expected: number, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≈ ${expected}`);

test("speed clamps to 25–125 in whole percent", () => {
  assert.equal(clampSpeed(10), SPEED_MIN);
  assert.equal(clampSpeed(200), SPEED_MAX);
  assert.equal(clampSpeed(72.4), 72);
  assert.equal(clampSpeed(72.6), 73);
  assert.equal(clampSpeed(Number.NaN), 100);
  assert.equal(clampSpeed(Infinity), 100);
  assert.equal(speedToRate(50), 0.5);
  assert.equal(speedToRate(5), 0.25);
});

test("tape mode shifts pitch by 12·log2(rate)", () => {
  close(tapeSemitones(0.5), -12);
  close(tapeSemitones(0.25), -24);
  assert.equal(tapeSemitones(1), 0);
  close(tapeSemitones(1.25), 12 * Math.log2(1.25));
  close(tapeSemitones(0.75), -4.980449991346125);
  assert.equal(tapeSemitones(0), 0);
  assert.equal(tapeSemitones(Number.NaN), 0);
  assert.equal(describePitchShift(0.5), "−12.0 semitones (one octave lower)");
  assert.equal(describePitchShift(1), "No pitch change");
  assert.equal(describePitchShift(1.25), "+3.9 semitones");
  assert.equal(describePitchShift(0.8), "−3.9 semitones");
});

test("loop bounds are ordered, clamped and at least 0.2 s long", () => {
  assert.deepEqual(normalizeLoop(2, 5, 10), { start: 2, end: 5 });
  assert.deepEqual(normalizeLoop(5, 2, 10), { start: 2, end: 5 }, "B before A is swapped");
  assert.deepEqual(normalizeLoop(-3, 20, 10), { start: 0, end: 10 }, "clamped to the track");
  const short = normalizeLoop(4, 4.05, 10)!;
  close(short.start, 4); close(short.end, 4.2);
  const atEnd = normalizeLoop(9.95, 10, 10)!;
  close(atEnd.start, 9.8); close(atEnd.end, 10);
  const same = normalizeLoop(3, 3, 10)!;
  close(same.end - same.start, 0.2);
  assert.equal(normalizeLoop(null, 4, 10), null);
  assert.equal(normalizeLoop(1, null, 10), null);
  assert.equal(normalizeLoop(1, Number.NaN, 10), null);
  assert.equal(normalizeLoop(0, 0.1, 0.1), null, "track shorter than the minimum loop");
  assert.equal(normalizeLoop(0, 1, Number.NaN), null);
});

test("loop end is crossed only by running into it", () => {
  const loop = { start: 2, end: 5 };
  assert.equal(crossedLoopEnd(4.98, 5.01, loop), true);
  assert.equal(crossedLoopEnd(4.9, 4.99, loop), false);
  assert.equal(crossedLoopEnd(5.2, 5.3, loop), false, "already past B after a seek");
  assert.equal(crossedLoopEnd(4.9, 5.0, loop), true, "landing exactly on B counts");
  assert.equal(crossedLoopEnd(4.9, 5.1, null), false);
});

test("speed-up loop steps toward the ceiling and stops there", () => {
  assert.equal(nextSpeedUpRate(60, 5, 100), 65);
  assert.equal(nextSpeedUpRate(98, 5, 100), 100, "never passes the ceiling");
  assert.equal(nextSpeedUpRate(100, 5, 100), 100);
  assert.equal(nextSpeedUpRate(110, 5, 100), 110, "never lowers a speed above the ceiling");
  assert.equal(nextSpeedUpRate(120, 10, 200), 125, "ceiling clamps to 125");
  assert.equal(nextSpeedUpRate(50, 0, 100), 51, "step clamps to at least 1");
  assert.equal(nextSpeedUpRate(50, Number.NaN, 100), 55, "bad step falls back to 5");
  let speed = 50, passes = 0;
  while (speed < 100) { speed = nextSpeedUpRate(speed, 5, 100); passes++; }
  assert.equal(passes, 10);
});

test("times format as mm:ss.d", () => {
  assert.equal(formatTime(0), "00:00.0");
  assert.equal(formatTime(5.06), "00:05.0");
  assert.equal(formatTime(65.47), "01:05.4");
  assert.equal(formatTime(59.99), "00:59.9", "truncates, never rounds up a minute");
  assert.equal(formatTime(0.3), "00:00.3");
  assert.equal(formatTime(3600), "60:00.0");
  assert.equal(formatTime(-2), "00:00.0");
  assert.equal(formatTime(Number.NaN), "00:00.0");
});

test("positions on the waveform map to times", () => {
  assert.equal(timeAtPosition(50, 200, 120), 30);
  assert.equal(timeAtPosition(-10, 200, 120), 0);
  assert.equal(timeAtPosition(500, 200, 120), 120);
  assert.equal(timeAtPosition(10, 0, 120), 0);
});

test("peak extraction gives min/max pairs per bucket", () => {
  const samples = new Float32Array([0.1, -0.5, 0.3, 0.9, -0.2, 0.4, -1, 0.2]);
  const peaks = extractPeaks(samples, 4);
  assert.equal(peaks.length, 8);
  assert.deepEqual(Array.from(peaks).map(v => Math.round(v * 10) / 10), [-0.5, 0.1, 0.3, 0.9, -0.2, 0.4, -1, 0.2]);
  const one = extractPeaks(samples, 1);
  close(one[0], -1, 1e-6); close(one[1], 0.9, 1e-6);
  const many = extractPeaks(new Float32Array([0.5, -0.5]), 4);
  assert.equal(many.length, 8);
  assert.ok(Array.from(many).every(Number.isFinite), "empty buckets read 0, not ±Infinity");
  assert.equal(extractPeaks(new Float32Array(0), 10).length, 20);
  assert.equal(extractPeaks(samples, 0).length, 0);
  // Uneven split: every sample lands in exactly one bucket.
  const ramp = new Float32Array(10).map((_, i) => i / 10);
  const uneven = extractPeaks(ramp, 3);
  close(uneven[0], 0, 1e-6); close(uneven[5], 0.9, 1e-6);
});

test("channel peaks merge to the widest envelope", () => {
  const left = new Float32Array([-0.2, 0.5, -0.1, 0.1]);
  const right = new Float32Array([-0.6, 0.3, -0.4, 0.8]);
  assert.deepEqual(Array.from(mergePeaks([left, right])).map(v => Math.round(v * 10) / 10), [-0.6, 0.5, -0.4, 0.8]);
  assert.equal(mergePeaks([]).length, 0);
  assert.deepEqual(Array.from(left), [-0.2, 0.5, -0.1, 0.1].map(v => Math.fround(v)), "inputs are not modified");
});

test("saved settings are read defensively", () => {
  assert.deepEqual(parseSlowDownerSettings(null), DEFAULT_SLOW_DOWNER_SETTINGS);
  assert.deepEqual(parseSlowDownerSettings("not json"), DEFAULT_SLOW_DOWNER_SETTINGS);
  assert.deepEqual(parseSlowDownerSettings(JSON.stringify({ speed: 70, tape: true, speedUpStep: 3, speedUpCeiling: 90 })), { speed: 70, tape: true, speedUpStep: 3, speedUpCeiling: 90 });
  assert.deepEqual(parseSlowDownerSettings(JSON.stringify({ speed: 900, tape: "yes", speedUpStep: 99, speedUpCeiling: "x" })), { speed: 125, tape: false, speedUpStep: 20, speedUpCeiling: 100 });
});
