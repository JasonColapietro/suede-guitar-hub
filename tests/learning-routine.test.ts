import test from "node:test";
import assert from "node:assert/strict";
import { beginRoutineAttempt, checkpointRoutineAttempt, defaultRoutineSeconds, editRoutineAttemptTarget, emptyRoutineState, finishRoutineSession, newRoutineAttempt, newRoutineSession, parseRoutineState, preparationEvidence, reviewRoutineAttempt, routineChangeRate, routineElapsedSeconds, routinePrepared, routineTemplate, RoutineTimer } from "../lib/learning/routine.ts";
import { emptyProgress } from "../lib/learning/progress.ts";
const now = "2026-09-04T12:00:00.000Z";
const later = "2026-09-05T12:00:00.000Z";
const changes = routineTemplate.blocks.find(block => block.id === "a-first-changes")!;
const accuracy = routineTemplate.blocks.find(block => block.id === "d-accuracy")!;

test("published routine preserves seven ordered blocks and all 21 minutes", () => {
  assert.deepEqual(routineTemplate.blocks.map(block => [block.id, block.suggestedSeconds]), [["tune",60],["d-accuracy",180],["a-accuracy",180],["silent-anchor",120],["a-first-changes",60],["d-first-changes",60],["songs",600]]);
  assert.equal(defaultRoutineSeconds, 1260);
  assert.equal(new Set(routineTemplate.blocks.map(block => block.id)).size, 7);
  assert.ok(routineTemplate.blocks.every(block => block.preparationIds.every(id => routineTemplate.preparation.some(item => item.id === id))));
});
test("preparation is explicit and never inferred from a timer or a foreign track", () => {
  const state = emptyRoutineState(); const progress = emptyProgress("guitar");
  assert.equal(routinePrepared(state, progress), false);
  for (const item of routineTemplate.preparation) state.preparation[item.id] = { source: "selfReported", confirmedAt: now };
  assert.equal(routinePrepared(state, progress), true);
  assert.deepEqual(progress.lessons, {});
  assert.equal(preparationEvidence("d-chord", state, progress), "selfReported");
  state.preparation = {};
  progress.lessons["g-l2-m1-01"] = { source: "selfReported", assessment: "ready", updatedAt: now, practiceSeconds: 0, score: null };
  assert.equal(preparationEvidence("d-chord", state, progress), "lessonEvidence");
  assert.equal(preparationEvidence("a-chord", state, progress), "lessonEvidence");
  assert.equal(preparationEvidence("d-chord", state, { ...progress, track: "voice" }), null);
  assert.equal(routinePrepared(state, progress), false);
});
test("monotonic foreground time excludes pauses and delayed-heartbeat suspension", () => {
  const clock = new RoutineTimer(); clock.start(0, 100);
  assert.equal(clock.sample(1100, 60000).elapsedMs, 1000);
  assert.equal(clock.pause(1500, 60000), 1400);
  assert.equal(clock.elapsed(3600000, 60000), 1400);
  clock.start(1400, 3600000);
  assert.equal(clock.sample(3600500, 60000).elapsedMs, 1900);
  assert.deepEqual(clock.sample(7200000, 60000), { elapsedMs: 1900, interrupted: true });
  assert.equal(clock.elapsed(7300000, 60000), 1900);
});
test("clock clamps backwards timestamps, invalid input, and overshoot", () => {
  const clock = new RoutineTimer(); clock.start(500, 1000);
  assert.equal(clock.elapsed(500, 60000), 500);
  assert.equal(clock.elapsed(999999, 60000), 60000);
  clock.start(Number.NaN, 10);
  assert.equal(clock.sample(20, 60000).elapsedMs, 10);
});
test("continuous minute requests reflection and retains an honest manual rate", () => {
  const fresh = newRoutineAttempt("attempt-1", now, 60);
  const ended = checkpointRoutineAttempt(fresh, changes, 60010, later);
  assert.equal(ended.elapsedMs, 60000); assert.equal(ended.status, "review");
  assert.equal(ended.reflection, null); assert.equal(ended.manualCount, null);
  assert.equal(routineChangeRate(ended), null);
  const reviewed = reviewRoutineAttempt(ended, "practiced", 24, later);
  assert.equal(routineChangeRate(reviewed), 24);
  assert.equal(reviewed.reflection, "practiced");
  assert.equal(reviewRoutineAttempt(reviewed, "practiced", 900, later), reviewed);
});
test("paused, extended, and partial changes never become normalized rates", () => {
  const fresh = newRoutineAttempt("attempt-1", now, 60);
  const paused = checkpointRoutineAttempt(fresh, changes, 28000, now, true);
  const ended = checkpointRoutineAttempt(paused, changes, 60000, later);
  assert.equal(ended.interrupted, true); assert.equal(ended.completeMinute, false);
  assert.equal(routineChangeRate(reviewRoutineAttempt(ended, "practiced", 40, later)), null);
  const extended = checkpointRoutineAttempt(newRoutineAttempt("attempt-2", now, 120), changes, 120000, later);
  assert.equal(routineChangeRate(reviewRoutineAttempt(extended, "practiced", 90, later)), null);
  assert.equal(routineChangeRate(reviewRoutineAttempt(paused, "revisit", 9, later)), null);
  const unscored = checkpointRoutineAttempt(newRoutineAttempt("attempt-3", now, 60), accuracy, 60000, later);
  assert.equal(unscored.completeMinute, false);
});
test("reload restores exact persisted checkpoints without wall-clock padding; retries retain IDs", () => {
  let state = newRoutineSession(emptyRoutineState(), "session-1", now);
  assert.equal(newRoutineSession(state, "session-2", later), state);
  const block = state.sessions[0].blocks.find(block => block.blockId === changes.id)!;
  block.attempts.push(checkpointRoutineAttempt(newRoutineAttempt("attempt-1", now, 60), changes, 1250.5, now, true));
  block.attempts.push(reviewRoutineAttempt(checkpointRoutineAttempt(newRoutineAttempt("attempt-2", now, 60), changes, 60000, later), "practiced", 30, later));
  block.plannedSeconds = 120; // editing future plan cannot invalidate a finished minute
  const restored = parseRoutineState(JSON.stringify(state));
  assert.deepEqual(restored, state);
  assert.equal(restored.sessions[0].blocks.find(block => block.blockId === changes.id)!.attempts[0].status, "paused");
  assert.equal(routineChangeRate(restored.sessions[0].blocks.find(block => block.blockId === changes.id)!.attempts[1]), 30);
  assert.equal(routineElapsedSeconds(restored.sessions[0]), 61);
  state = finishRoutineSession(restored, later);
  assert.equal(state.currentSessionId, null);
  assert.equal(state.sessions[0].finishedAt, later);
  const next = newRoutineSession(state, "session-2", later);
  assert.equal(next.sessions.length, 2); assert.equal(next.sessions[0].id, "session-1");
  assert.equal(next.sessions[1].blocks.every(block => block.attempts.length === 0), true);
});
test("decoder rejects invented completion, foreign data, invalid counts and corrupt storage", () => {
  assert.deepEqual(parseRoutineState("not JSON"), emptyRoutineState());
  const state = newRoutineSession(emptyRoutineState(), "session-1", now);
  const block = state.sessions[0].blocks.find(block => block.blockId === changes.id)!;
  block.attempts.push({ ...newRoutineAttempt("attempt-1", now, 60), elapsedMs: 30000, completeMinute: true, status: "reviewed", manualCount: 30, reflection: "practiced" });
  block.attempts.push({ ...newRoutineAttempt("attempt-2", now, 60), manualCount: -2 });
  const restored = parseRoutineState(JSON.stringify({ ...state, completedLessonIds: ["g-l2-m1-01"], preparation: { invented: { source: "selfReported", confirmedAt: now } } }));
  const attempts = restored.sessions[0].blocks.find(block => block.blockId === changes.id)!.attempts;
  assert.equal(attempts.length, 1); assert.equal(attempts[0].completeMinute, false);
  assert.equal(routineChangeRate(attempts[0]), null);
  assert.deepEqual(restored.preparation, {}); assert.equal("completedLessonIds" in restored, false);
  assert.equal(parseRoutineState(JSON.stringify({ ...state, templateId: "other" })).sessions.length, 0);
});
test("skipping or ending a routine preserves partial and untouched blocks without completion", () => {
  const state = newRoutineSession(emptyRoutineState(), "session-1", now);
  state.sessions[0].blocks[0].attempts.push({ ...newRoutineAttempt("attempt-1", now, 60), status: "skipped" });
  const ended = finishRoutineSession(state, later);
  assert.equal(routineElapsedSeconds(ended.sessions[0]), 0);
  assert.equal(ended.sessions[0].blocks[0].attempts[0].reflection, null);
  assert.equal(ended.sessions[0].blocks[1].attempts.length, 0);
  assert.equal(reviewRoutineAttempt(newRoutineAttempt("attempt-2", now, 60), "practiced", 20, later).status, "pending");
});

test("even an immediate reload is a resumed interruption while a fresh pending attempt is clean", () => {
  const fresh = newRoutineAttempt("attempt-1", now, 60);
  const started = beginRoutineAttempt(fresh);
  assert.equal(started.status, "paused"); assert.equal(started.interrupted, false);
  const resumed = beginRoutineAttempt(started);
  assert.equal(resumed.interrupted, true);
  const ended = checkpointRoutineAttempt(resumed, changes, 60000, later);
  assert.equal(routineChangeRate(reviewRoutineAttempt(ended, "practiced", 45, later)), null);
});


test("planning edits before first start preserve a real continuous minute", () => {
  let attempt = newRoutineAttempt("planning-attempt", now, 60);
  attempt = editRoutineAttemptTarget(editRoutineAttemptTarget(attempt, 120), 60);
  assert.equal(attempt.status, "pending");
  attempt = checkpointRoutineAttempt(beginRoutineAttempt(attempt), changes, 60000, later);
  assert.equal(routineChangeRate(reviewRoutineAttempt(attempt, "practiced", 31, later)), 31);
});
test("editing a persisted start at zero cannot erase the interrupted attempt", () => {
  const started = JSON.parse(JSON.stringify(beginRoutineAttempt(newRoutineAttempt("started-attempt", now, 120))));
  const edited = editRoutineAttemptTarget(started, 60);
  assert.equal(edited.status, "paused");
  assert.equal(edited.interrupted, true);
  const completed = checkpointRoutineAttempt(beginRoutineAttempt(edited), changes, 60000, later);
  assert.equal(routineChangeRate(reviewRoutineAttempt(completed, "practiced", 31, later)), null);
});
