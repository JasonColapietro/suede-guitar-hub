import test from "node:test";
import assert from "node:assert/strict";
import { getInstructionAsset } from "../lib/learning/instructions.ts";
import { manualMinuteResult, parseStageTwoHistory, studyPosition, type ManualChangeAttempt, type StudyAttempt } from "../lib/learning/stage-two.ts";
import { lessonPracticeSeconds, manualPracticeEvidence, noStageTwoEvidence, studyPracticeEvidence } from "../lib/learning/stage-two-evidence.ts";

const asset = getInstructionAsset("stage2-first-light-study");
if (asset.kind !== "study") throw new Error("Missing authored study");
const study = asset.study;
const minute: ManualChangeAttempt = {
  id: "manual-minute", lessonId: "g-l2-m3-06", createdAt: "2026-09-04T12:00:00Z",
  startingChord: "A", count: 30, ...manualMinuteResult(10, 70, false),
};
const take: StudyAttempt = {
  id: "full-study", lessonId: "g-l2-m2-04", studyId: study.id, createdAt: "2026-09-04T12:10:00Z",
  bpm: 60, firstBar: 1, lastBar: 16, variantId: "one-per-bar",
  practiceSeconds: studyPosition(study, 68, 60, 1, 16).musicSeconds,
  usedBacking: false, usedClicks: true, interrupted: false, timelineFinished: true,
  learnerPlayedAllBars: true, reviewBar: null,
};

test("a saved qualifying minute supplies lesson duration with the sidebar timer untouched", () => {
  const evidence = manualPracticeEvidence(minute, true, 30);
  assert.equal(evidence.ready, true);
  assert.equal(lessonPracticeSeconds(0, evidence), 60);
  assert.equal(lessonPracticeSeconds(1, evidence), 60, "an unrelated one-second timer cannot replace the full minute");
});

test("overlapping sidebar time is never added to or substituted for the recorded exercise", () => {
  const evidence = manualPracticeEvidence(minute, true, 30);
  assert.equal(lessonPracticeSeconds(60, evidence), 60);
  assert.equal(lessonPracticeSeconds(90, evidence), 60);
  assert.equal(lessonPracticeSeconds(300, studyPracticeEvidence(take, study)), 64);
});

test("partial, uncounted and below-target trials retain time without supplying checkpoint readiness", () => {
  const partial = manualPracticeEvidence({ ...minute, ...manualMinuteResult(10, 28.75, true) }, true, 30);
  assert.deepEqual(partial, { ready: false, practiceSeconds: 18 });
  assert.equal(lessonPracticeSeconds(0, partial), 18, "a partial attempt can support a revisit reflection");
  assert.deepEqual(manualPracticeEvidence({ ...minute, count: null }, true, 30), { ready: false, practiceSeconds: 60 });
  assert.deepEqual(manualPracticeEvidence({ ...minute, count: 29 }, true, 30), { ready: false, practiceSeconds: 60 });
  assert.equal(manualPracticeEvidence({ ...minute, count: 29 }, false, 30).ready, true,
    "the ordinary exercise keeps its existing full-minute criterion");
});

test("a full study supplies its actual musical duration and excludes the count-in", () => {
  const evidence = studyPracticeEvidence(take, study);
  assert.deepEqual(evidence, { ready: true, practiceSeconds: 64 });
  assert.equal(lessonPracticeSeconds(0, evidence), 64);
  assert.equal(lessonPracticeSeconds(68, evidence), 64, "four count-in beats cannot inflate the reflection");
  const faster = { ...take, bpm: 75, practiceSeconds: studyPosition(study, 54.4, 75, 1, 16).musicSeconds };
  assert.deepEqual(studyPracticeEvidence(faster, study), { ready: true, practiceSeconds: 51 });
});

test("an interrupted or unconfirmed study supports review without qualifying as a full take", () => {
  for (const patch of [{ interrupted: true }, { timelineFinished: false }, { learnerPlayedAllBars: false }]) {
    const evidence = studyPracticeEvidence({ ...take, ...patch }, study);
    assert.equal(evidence.ready, false);
    assert.equal(lessonPracticeSeconds(0, evidence), 64);
  }
});

test("no saved playing attempt, including Listen, supplies no study duration or readiness", () => {
  assert.deepEqual(studyPracticeEvidence(undefined, study), noStageTwoEvidence);
  assert.deepEqual(manualPracticeEvidence(undefined, true, 30), noStageTwoEvidence);
  assert.equal(lessonPracticeSeconds(0, noStageTwoEvidence), 0);
  assert.equal(lessonPracticeSeconds(42, noStageTwoEvidence), 42, "ordinary sidebar-only practice remains available");
  assert.equal(noStageTwoEvidence.ready, false, "running a timer does not establish required playing evidence");
});

test("reloaded saved attempts carry their original duration instead of a new sidebar session", () => {
  const restored = parseStageTwoHistory(JSON.stringify({ version: 1, track: "guitar", changes: [minute], studies: [take] }), "guitar");
  assert.deepEqual(manualPracticeEvidence(restored.changes.at(-1), true, 30), { ready: true, practiceSeconds: 60 });
  assert.deepEqual(studyPracticeEvidence(restored.studies.at(-1), study), { ready: true, practiceSeconds: 64 });
});
