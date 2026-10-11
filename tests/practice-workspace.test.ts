import assert from "node:assert/strict";
import test from "node:test";
import { readPracticeWorkspace } from "../lib/practice-workspace.ts";
import { BREAKTHROUGH_STORAGE_KEY, createBreakthroughPlan } from "../lib/breakthrough.ts";
import { SESSION_STORAGE_KEY, buildSessionPlan } from "../lib/session.ts";
import { TEMPO_STORAGE_KEY, buildTempoLadder } from "../lib/tempo.ts";
import { LOG_STORAGE_KEY, storedLogPayload } from "../lib/log.ts";

const profile = { goal: "complete-song", experience: "intermediate", daysPerWeek: 4, minutesPerSession: 30 } as const;
const sessionInput = { minutes: 30, focus: "tempo-ceiling" } as const;
const tempoInput = { currentBpm: 60, targetBpm: 80, sessions: 10 };
const read = (values: Record<string, unknown>) => readPracticeWorkspace((key) => key in values ? JSON.stringify(values[key]) : null);

test("an empty workspace offers four useful starts without inventing progress", () => {
  const result = read({});
  assert.equal(result.hasSavedWork, false);
  assert.equal(result.storageUnavailable, false);
  assert.deepEqual(result.cards.map((card) => card.href), ["/session", "/breakthrough", "/tempo", "/log"]);
  assert.ok(result.cards.every((card) => !card.saved && card.percent === null));
  assert.equal(result.next.href, "/session");
});

test("an unfinished session resumes the first unchecked block and reports minutes checked", () => {
  const plan = buildSessionPlan(sessionInput);
  assert.ok(plan.ok);
  const result = read({[SESSION_STORAGE_KEY]: {input: sessionInput, completedBlockIds: [plan.value.blocks[0].id, "invalid"]}});
  const card = result.cards[0];
  assert.equal(result.hasSavedWork, true);
  assert.equal(result.next.href, "/session");
  assert.match(card.detail, new RegExp(plan.value.blocks[1].name));
  assert.match(card.metric, new RegExp(`${plan.value.blocks[0].minutes} of 30 min`));
});

test("a plan resumes the earliest incomplete action rather than guessing the calendar week", () => {
  const plan = createBreakthroughPlan(profile);
  const completedActionIds = plan.weeks[0].actions.map((action) => action.id);
  const result = read({[BREAKTHROUGH_STORAGE_KEY]: {profile, completedActionIds}});
  assert.equal(result.next.href, "/breakthrough");
  assert.match(result.cards[1].detail, /Week 2/);
  assert.ok(result.cards[1].detail.includes(plan.weeks[1].actions[0].label));
});

test("completed plans lead to evidence review, without declaring mastery", () => {
  const plan = createBreakthroughPlan(profile);
  const result = read({[BREAKTHROUGH_STORAGE_KEY]: {profile, completedActionIds: plan.weeks.flatMap((week) => week.actions.map((action) => action.id))}});
  assert.equal(result.cards[1].percent, 100);
  assert.equal(result.cards[1].complete, true);
  assert.equal(result.next.href, "/log");
  assert.doesNotMatch(JSON.stringify(result), /mastered|streak/i);
});

test("tempo continuation uses the next unchecked rung, including a back-off", () => {
  const ladder = buildTempoLadder(tempoInput);
  assert.ok(ladder.ok);
  const index = ladder.value.rungs.findIndex((rung) => rung.kind === "backoff");
  assert.ok(index > 0);
  const result = read({[TEMPO_STORAGE_KEY]: {input: tempoInput, completedRungIds: ladder.value.rungs.slice(0, index).map((rung) => rung.id)}});
  assert.equal(result.next.href, "/tempo");
  assert.match(result.cards[2].detail, new RegExp(`${ladder.value.rungs[index].bpm} BPM`));
});

test("evidence counts real sessions and uses the latest date, not storage order", () => {
  const entries = [
    {id: "new", date: "2026-10-10", focus: "Chord changes", metric: "tempo", value: 80, note: "Clean"},
    {id: "old", date: "2026-10-08", focus: "Scales", metric: "tempo", value: 70, note: "Steady"},
  ] as const;
  const result = read({[LOG_STORAGE_KEY]: storedLogPayload([...entries])});
  assert.equal(result.cards[3].metric, "2 sessions logged");
  assert.equal(result.cards[3].title, "Chord changes");
  assert.match(result.cards[3].detail, /2026-10-10 · 80 BPM/);
  assert.equal(result.next.href, "/log");
});

test("invalid and future storage shapes are ignored without being written or removed", () => {
  const result = readPracticeWorkspace((key) => key === SESSION_STORAGE_KEY ? "{broken" : JSON.stringify({version: 999, input: {minutes: -1}}));
  assert.equal(result.hasSavedWork, false);
  assert.equal(result.storageUnavailable, false);
});

test("blocked storage leaves actionable tools and reports the unavailable saved overview", () => {
  const result = readPracticeWorkspace(() => { throw new Error("SecurityError"); });
  assert.equal(result.storageUnavailable, true);
  assert.equal(result.hasSavedWork, false);
  assert.equal(result.cards.length, 4);
});

test("reading after another tab clears a plan removes its continuation", () => {
  const values: Record<string, unknown> = {[BREAKTHROUGH_STORAGE_KEY]: {profile, completedActionIds: []}};
  assert.equal(read(values).hasSavedWork, true);
  delete values[BREAKTHROUGH_STORAGE_KEY];
  assert.equal(read(values).hasSavedWork, false);
});
