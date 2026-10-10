import assert from "node:assert/strict";
import test from "node:test";

import {
  BREAKTHROUGH_GOALS,
  BREAKTHROUGH_STORAGE_KEY,
  createBreakthroughPlan,
  normalizeProgress,
  progressPercent,
  rebuildBreakthroughState,
  restoreBreakthroughState,
  sessionBlocksFor,
  setBreakthroughActionDone,
  type BreakthroughProfile,
} from "../lib/breakthrough.ts";
import { createStoredValue } from "../lib/shared-storage.ts";

const profile = {
  goal: "complete-song" as const,
  experience: "advanced-beginner" as const,
  daysPerWeek: 4,
  minutesPerSession: 30,
};

test("creates a four-week plan with a measurable finish line and cadence", () => {
  const plan = createBreakthroughPlan(profile);

  assert.equal(plan.weeks.length, 4);
  assert.equal(plan.cadence, "4 days x 30 minutes");
  assert.match(plan.finishLine, /complete song/i);
  assert.equal(plan.weeks[0].actions.length, 4, "one action per practice day");
  assert.equal(plan.weeks[0].actions[0].id, "complete-song-w1-a1");
});

test("rejects a practice cadence outside the pilot bounds", () => {
  assert.throws(
    () => createBreakthroughPlan({ ...profile, daysPerWeek: 2 }),
    /3 to 6 practice days/,
  );
  assert.throws(
    () => createBreakthroughPlan({ ...profile, minutesPerSession: 90 }),
    /15 to 60 minutes/,
  );
});

test("keeps only recognized action ids for the current plan", () => {
  const plan = createBreakthroughPlan(profile);

  assert.deepEqual(
    normalizeProgress(plan, [
      "complete-song-w1-a1",
      "complete-song-w1-a1",
      "rhythm-time-w1-a1",
      "made-up",
      42,
    ]),
    ["complete-song-w1-a1"],
  );
});

test("derives progress from the plan action count", () => {
  const plan = createBreakthroughPlan(profile);

  assert.equal(progressPercent(plan, []), 0);
  assert.equal(
    progressPercent(plan, [
      "complete-song-w1-a1",
      "complete-song-w1-a2",
      "complete-song-w1-a3",
      "complete-song-w1-x4",
    ]),
    25,
  );
});

test("restores only a valid profile and progress for that profile", () => {
  assert.deepEqual(
    restoreBreakthroughState({
      profile,
      completedActionIds: [
        "complete-song-w1-a1",
        "rhythm-time-w1-a1",
        "unknown",
      ],
    }),
    {
      profile,
      completedActionIds: ["complete-song-w1-a1"],
    },
  );

  assert.equal(
    restoreBreakthroughState({
      profile: { ...profile, goal: "not-a-goal" },
      completedActionIds: [],
    }),
    null,
  );
  assert.equal(restoreBreakthroughState("corrupt"), null);
});

test("days per week sets one action per practice day, keeping core ids stable", () => {
  for (const days of [3, 4, 5, 6]) {
    const plan = createBreakthroughPlan({ ...profile, daysPerWeek: days });
    for (const week of plan.weeks) {
      assert.equal(week.actions.length, days);
      assert.deepEqual(week.actions.map(action => action.day), Array.from({ length: days }, (_, i) => i + 1));
      // The three core actions are always there, and the week still closes on
      // its last core action rather than on an extra day.
      for (const index of [1, 2, 3]) {
        assert.ok(week.actions.some(action => action.id === `complete-song-w${week.week}-a${index}`));
      }
      assert.equal(week.actions.at(-1)?.id, `complete-song-w${week.week}-a3`);
      assert.equal(new Set(week.actions.map(action => action.id)).size, days);
    }
  }
  const six = createBreakthroughPlan({ ...profile, daysPerWeek: 6 });
  assert.deepEqual(
    six.weeks[0].actions.map(action => action.id),
    ["complete-song-w1-a1", "complete-song-w1-a2", "complete-song-w1-x4", "complete-song-w1-x5", "complete-song-w1-x6", "complete-song-w1-a3"],
  );
});

test("minutes per session sizes every block, and the blocks add up to the session", () => {
  for (const minutes of [15, 20, 30, 45, 60]) {
    const blocks = sessionBlocksFor(minutes);
    assert.equal(blocks.reduce((sum, block) => sum + block.minutes, 0), minutes);
    assert.ok(blocks.every(block => block.minutes >= 3));
    assert.ok(blocks[1].minutes > blocks[0].minutes, "the focused block gets the largest share");
    const plan = createBreakthroughPlan({ ...profile, minutesPerSession: minutes });
    assert.deepEqual(plan.sessionBlocks, blocks);
    assert.equal(plan.weeklyMinutes, profile.daysPerWeek * minutes);
    assert.equal(plan.totalMinutes, profile.daysPerWeek * minutes * 4);
  }
  assert.deepEqual(sessionBlocksFor(15).map(block => block.minutes), [3, 9, 3]);
  assert.deepEqual(sessionBlocksFor(60).map(block => block.minutes), [12, 36, 12]);
});

test("experience changes the approach and the weekly tempo targets", () => {
  const beginner = createBreakthroughPlan(profile);
  const intermediate = createBreakthroughPlan({ ...profile, experience: "intermediate" });
  const returning = createBreakthroughPlan({ ...profile, experience: "returning" });
  assert.notEqual(beginner.approach, intermediate.approach);
  assert.notEqual(intermediate.approach, returning.approach);
  assert.match(beginner.weeks[0].tempoTarget, /60%/);
  assert.match(intermediate.weeks[0].tempoTarget, /70%/);
  assert.match(intermediate.weeks[3].tempoTarget, /Full tempo/);
  assert.match(returning.weeks[0].tempoTarget, /55%/);
  // Tempo targets never go down from one week to the next.
  for (const plan of [beginner, intermediate, returning]) {
    const percents = plan.weeks.map(week => Number(/about (\d+)%/.exec(week.tempoTarget)?.[1] ?? 100));
    assert.deepEqual([...percents].sort((a, b) => a - b), percents);
  }
});

test("the same profile always builds the same plan", () => {
  for (const goal of BREAKTHROUGH_GOALS) {
    const input: BreakthroughProfile = { ...profile, goal: goal.id, daysPerWeek: 5, minutesPerSession: 45 };
    assert.deepEqual(createBreakthroughPlan(input), createBreakthroughPlan({ ...input }));
  }
});

test("editing minutes or level keeps every tick; fewer days or a new goal reports what drops", () => {
  const six: BreakthroughProfile = { ...profile, daysPerWeek: 6 };
  const plan = createBreakthroughPlan(six);
  const checked = plan.weeks[0].actions.map(action => action.id);
  const latest = { profile: six, completedActionIds: checked };

  const longer = rebuildBreakthroughState(latest, { ...six, minutesPerSession: 60, experience: "intermediate" });
  assert.deepEqual(longer.state.completedActionIds, checked);
  assert.deepEqual(longer.dropped, []);

  const fewer = rebuildBreakthroughState(latest, { ...six, daysPerWeek: 4 });
  assert.deepEqual(fewer.dropped, ["complete-song-w1-x5", "complete-song-w1-x6"]);
  assert.equal(fewer.state.completedActionIds.length, 4);

  const otherGoal = rebuildBreakthroughState(latest, { ...six, goal: "rhythm-time" });
  assert.equal(otherGoal.dropped.length, checked.length);
  assert.deepEqual(otherGoal.state.completedActionIds, []);
});

test("checking an action writes to the latest stored plan, never onto a replaced one", () => {
  const bytes = new Map<string, string>();
  const shared = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => void bytes.set(key, value),
    removeItem: (key: string) => void bytes.delete(key),
  };
  const tabA = createStoredValue({ key: BREAKTHROUGH_STORAGE_KEY, restore: restoreBreakthroughState, storage: () => shared });
  const tabB = createStoredValue({ key: BREAKTHROUGH_STORAGE_KEY, restore: restoreBreakthroughState, storage: () => shared });
  const loaded = { profile, completedActionIds: [] as string[] };
  tabA.write(loaded);
  tabA.update(loaded, latest => setBreakthroughActionDone(latest, profile, "complete-song-w1-a1", true));
  tabB.update(loaded, latest => setBreakthroughActionDone(latest, profile, "complete-song-w2-a1", true));
  const stored = tabA.read();
  assert.ok(stored.available);
  assert.deepEqual(new Set(stored.value?.completedActionIds), new Set(["complete-song-w1-a1", "complete-song-w2-a1"]));

  const replaced = { profile: { ...profile, goal: "rhythm-time" as const }, completedActionIds: [] };
  assert.equal(setBreakthroughActionDone(replaced, profile, "complete-song-w1-a1", true), replaced);
  assert.equal(setBreakthroughActionDone(null, profile, "complete-song-w1-a1", true), null);
});
