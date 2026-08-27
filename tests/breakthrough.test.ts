import assert from "node:assert/strict";
import test from "node:test";

import {
  createBreakthroughPlan,
  normalizeProgress,
  progressPercent,
  restoreBreakthroughState,
} from "../lib/breakthrough.ts";

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
  assert.equal(plan.weeks[0].actions.length, 3);
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
