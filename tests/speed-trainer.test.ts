import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SPEED_CONFIG,
  buildRampPlan,
  clickSamples,
  describePosition,
  endBehavior,
  estimatedSeconds,
  formatDuration,
  locateBar,
  normalizeSpeedConfig,
  parseSpeedConfig,
  scheduleClicks,
  totalBars,
  type SpeedConfig,
} from "../lib/tools/speed-trainer.ts";

const config = (overrides: Partial<SpeedConfig> = {}): SpeedConfig => ({ ...DEFAULT_SPEED_CONFIG, ...overrides });
const bpms = (overrides: Partial<SpeedConfig>) => buildRampPlan(config(overrides)).map(stage => stage.bpm);

test("an ascending ramp steps to the target and ends exactly on it", () => {
  assert.deepEqual(bpms({ startBpm: 80, targetBpm: 120, stepBpm: 5 }), [80, 85, 90, 95, 100, 105, 110, 115, 120]);
  assert.deepEqual(bpms({ startBpm: 60, targetBpm: 70, stepBpm: 4 }), [60, 64, 68, 70], "last step is shortened, never overshoots");
  const plan = buildRampPlan(config({ startBpm: 60, targetBpm: 70, stepBpm: 4, barsPerStep: 3 }));
  assert.ok(plan.every(stage => stage.bars === 3));
  assert.equal(plan.at(-1)!.kind, "target");
  assert.ok(plan.slice(0, -1).every(stage => stage.kind === "ramp"));
});

test("a step larger than the gap goes straight to the target", () => {
  assert.deepEqual(bpms({ startBpm: 100, targetBpm: 110, stepBpm: 20 }), [100, 110]);
  assert.deepEqual(bpms({ startBpm: 100, targetBpm: 101, stepBpm: 5 }), [100, 101]);
});

test("start equal to target is a single target stage", () => {
  const plan = buildRampPlan(config({ startBpm: 90, targetBpm: 90, barsPerStep: 4, holdBars: 2 }));
  assert.deepEqual(plan, [{ bpm: 90, bars: 6, kind: "target" }]);
});

test("descending ramps step down and end on the target", () => {
  assert.deepEqual(bpms({ startBpm: 120, targetBpm: 90, stepBpm: 10 }), [120, 110, 100, 90]);
  assert.deepEqual(bpms({ startBpm: 120, targetBpm: 97, stepBpm: 10 }), [120, 110, 100, 97]);
});

test("the plan never overshoots for any gap and step", () => {
  for (const start of [30, 47, 100, 300]) for (const target of [30, 61, 100, 299]) for (const step of [1, 3, 7, 20]) {
    const plan = buildRampPlan(config({ startBpm: start, targetBpm: target, stepBpm: step }));
    assert.equal(plan.at(-1)!.bpm, target);
    const low = Math.min(start, target), high = Math.max(start, target);
    assert.ok(plan.every(stage => stage.bpm >= low && stage.bpm <= high));
    for (let i = 1; i < plan.length; i++) assert.ok(Math.abs(plan[i].bpm - plan[i - 1].bpm) <= step && plan[i].bpm !== plan[i - 1].bpm);
  }
});

test("invalid input is clamped, never thrown", () => {
  const normal = normalizeSpeedConfig({ startBpm: 5, targetBpm: 999, stepBpm: 0, barsPerStep: 40, beatsPerBar: 1, holdBars: -3, subdivision: "quintuplet", mode: "sprint", countIn: "yes", burstBars: 0, burstBpm: 500 });
  assert.equal(normal.startBpm, 30);
  assert.equal(normal.targetBpm, 300);
  assert.equal(normal.stepBpm, 1);
  assert.equal(normal.barsPerStep, 16);
  assert.equal(normal.beatsPerBar, 2);
  assert.equal(normal.holdBars, 0);
  assert.equal(normal.subdivision, "quarter");
  assert.equal(normal.mode, "climb");
  assert.equal(normal.countIn, true);
  assert.equal(normal.burstBars, 1);
  assert.equal(normal.burstBpm, 60);
  assert.equal(normalizeSpeedConfig({ startBpm: Number.NaN }).startBpm, DEFAULT_SPEED_CONFIG.startBpm);
  assert.equal(normalizeSpeedConfig({ startBpm: 99.6 }).startBpm, 100);
  assert.doesNotThrow(() => buildRampPlan({ startBpm: Number.NaN, targetBpm: -1, stepBpm: Infinity }));
  assert.equal(buildRampPlan({ startBpm: Number.NaN, targetBpm: -1, stepBpm: Infinity }).at(-1)!.bpm, 30);
});

test("hold bars extend the target stage", () => {
  const plan = buildRampPlan(config({ startBpm: 80, targetBpm: 90, stepBpm: 5, barsPerStep: 2, holdBars: 4 }));
  assert.deepEqual(plan.map(s => s.bars), [2, 2, 6]);
  assert.equal(totalBars(plan), 10);
});

test("burst mode alternates working and burst tempo", () => {
  const plan = buildRampPlan(config({ mode: "burst", startBpm: 100, burstBpm: 20, burstBars: 2 }));
  assert.deepEqual(plan, [{ bpm: 100, bars: 2, kind: "work" }, { bpm: 120, bars: 2, kind: "burst" }]);
  assert.equal(buildRampPlan(config({ mode: "burst", startBpm: 290, burstBpm: 30 }))[1].bpm, 300, "burst tempo clamps to 300");
  assert.equal(endBehavior(config({ mode: "burst" })), "repeat");
});

test("totals and estimated time", () => {
  const plan = buildRampPlan(config({ startBpm: 60, targetBpm: 80, stepBpm: 20, barsPerStep: 2 }));
  assert.equal(totalBars(plan), 4);
  // 2 bars of 4 at 60 = 8 s, 2 bars of 4 at 80 = 6 s.
  assert.equal(estimatedSeconds(plan, 4), 14);
  assert.equal(estimatedSeconds(plan, 4, 1), 18, "count-in bar at the first tempo");
  assert.equal(estimatedSeconds(plan, 3), 10.5);
  assert.equal(estimatedSeconds([], 4, 1), 0);
  assert.equal(formatDuration(200), "3 min 20 s");
  assert.equal(formatDuration(45), "45 s");
  assert.equal(formatDuration(120), "2 min");
});

test("bars are located in the plan for each end behaviour", () => {
  const plan = buildRampPlan(config({ startBpm: 80, targetBpm: 90, stepBpm: 5, barsPerStep: 2 }));
  assert.equal(locateBar(plan, -1, "stop").countIn, true);
  assert.equal(locateBar(plan, -1, "stop").bpm, 80);
  assert.deepEqual([locateBar(plan, 3, "stop").stageIndex, locateBar(plan, 3, "stop").barInStage, locateBar(plan, 3, "stop").bpm], [1, 1, 85]);
  assert.equal(locateBar(plan, 6, "stop").done, true);
  const holding = locateBar(plan, 50, "hold-open");
  assert.equal(holding.holding, true);
  assert.equal(holding.bpm, 90);
  const repeat = locateBar(plan, 7, "repeat");
  assert.deepEqual([repeat.cycle, repeat.stageIndex, repeat.barInStage, repeat.bpm], [1, 0, 1, 80]);
  assert.equal(describePosition(plan, locateBar(plan, 3, "stop")), "Step 2 of 3, bar 2 of 2");
  assert.equal(describePosition(plan, repeat), "Cycle 2, step 1 of 3, bar 2 of 2");
  assert.equal(describePosition(plan, holding), "Holding at the target");
  assert.equal(describePosition(plan, locateBar(plan, -1, "stop")), "Count-in");
  assert.equal(endBehavior(config({ mode: "climb", holdBars: 0 })), "hold-open");
  assert.equal(endBehavior(config({ mode: "climb", holdBars: 4 })), "stop");
  assert.equal(endBehavior(config({ mode: "climb-reset" })), "repeat");
});

test("the scheduler keeps an exact grid however late the timer runs", () => {
  const cfg = config({ startBpm: 120, targetBpm: 120, barsPerStep: 4, beatsPerBar: 4, holdBars: 0 });
  const plan = buildRampPlan(cfg);
  // Regular 25 ms ticks with a 100 ms lookahead.
  let cursor = { time: 1, bar: 0, beat: 0, sub: 0 };
  const steady: number[] = [];
  for (let now = 1; now < 5; now += 0.025) {
    const result = scheduleClicks(cursor, now + 0.1, plan, cfg);
    steady.push(...result.events.map(e => e.time));
    cursor = result.cursor;
  }
  // Very late, irregular ticks.
  cursor = { time: 1, bar: 0, beat: 0, sub: 0 };
  const late: number[] = [];
  for (const now of [1, 1.4, 2.9, 3.05, 4.9]) {
    const result = scheduleClicks(cursor, now + 0.1, plan, cfg);
    late.push(...result.events.map(e => e.time));
    cursor = result.cursor;
  }
  assert.deepEqual(late, steady.slice(0, late.length));
  steady.forEach((time, index) => assert.ok(Math.abs(time - (1 + index * 0.5)) < 1e-9));
});

test("the scheduler accents beat one, adds quieter subdivisions and changes tempo on bar lines", () => {
  const cfg = config({ startBpm: 60, targetBpm: 80, stepBpm: 20, barsPerStep: 1, beatsPerBar: 3, subdivision: "eighth", holdBars: 1 });
  const plan = buildRampPlan(cfg); // 60 for 1 bar, 80 for 2 bars, then stop.
  const { events, finished } = scheduleClicks({ time: 0, bar: 0, beat: 0, sub: 0 }, 100, plan, cfg);
  assert.equal(finished, true);
  assert.equal(events.length, 3 * 3 * 2);
  assert.deepEqual(events.slice(0, 4).map(e => e.level), ["accent", "sub", "beat", "sub"]);
  assert.equal(events[6].level, "accent");
  assert.equal(events[6].time, 3, "one bar of 3 at 60 BPM lasts 3 s");
  assert.equal(events[7].time, 3.375, "eighths at 80 BPM are 0.375 s apart");
  assert.equal(events.filter(e => e.level === "accent").length, 3);
});

test("the count-in plays at the first tempo before bar 0", () => {
  const cfg = config({ startBpm: 60, targetBpm: 60, beatsPerBar: 4, holdBars: 0 });
  const plan = buildRampPlan(cfg);
  const { events } = scheduleClicks({ time: 0, bar: -1, beat: 0, sub: 0 }, 4.5, plan, cfg);
  assert.deepEqual(events.map(e => e.position.countIn), [true, true, true, true, false]);
  assert.equal(events[4].time, 4);
  assert.equal(events[4].level, "accent");
});

test("triplet and sixteenth ticks divide the beat evenly", () => {
  for (const [subdivision, clicks] of [["triplet", 3], ["sixteenth", 4]] as const) {
    const cfg = config({ startBpm: 90, targetBpm: 90, beatsPerBar: 2, subdivision });
    const { events } = scheduleClicks({ time: 0, bar: 0, beat: 0, sub: 0 }, 60 / 90 - 1e-9, buildRampPlan(cfg), cfg);
    assert.equal(events.length, clicks);
  }
});

test("click samples are a decaying sine burst", () => {
  const samples = clickSamples(880, 48000, 0.035, 90, 0.8);
  assert.equal(samples.length, 1680);
  assert.equal(samples[0], 0);
  const peak = Math.max(...Array.from(samples, Math.abs));
  assert.ok(peak <= 0.8 && peak > 0.5);
  const tail = Math.max(...Array.from(samples.slice(-100), Math.abs));
  assert.ok(tail < peak * 0.1);
});

test("saved config is parsed defensively", () => {
  assert.deepEqual(parseSpeedConfig(null), DEFAULT_SPEED_CONFIG);
  assert.deepEqual(parseSpeedConfig("{bad"), DEFAULT_SPEED_CONFIG);
  assert.deepEqual(parseSpeedConfig("42"), DEFAULT_SPEED_CONFIG);
  assert.equal(parseSpeedConfig(JSON.stringify({ ...DEFAULT_SPEED_CONFIG, startBpm: 400 })).startBpm, 300);
});
