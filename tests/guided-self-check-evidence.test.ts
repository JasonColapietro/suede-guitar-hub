import test from "node:test";
import assert from "node:assert/strict";
import { attemptFromLessonRecord } from "../lib/learning-auth/sync.ts";
import { parseLearningAttempt, type LearningAttempt } from "../lib/learning-account/contracts.ts";
import { mergeAccountProgress, syncLessonMap } from "../lib/learning-sync/evidence.ts";
import { emptyProgress, emptyReadingQuizProgress } from "../lib/learning/progress.ts";
import { allLessons } from "../lib/learning/curriculum.ts";
import { getLessonInstructions } from "../lib/learning/instructions.ts";

const id = "a0000000-0000-4000-8000-000000000001";
const createdAt = "2026-09-08T00:00:00.000Z";
const eligibleIds = ["g-l1-m1-01", "g-l5-m1-02", "g-l5-m2-04", "g-l5-m1-07"];
function reflection(lessonId: string, patch: Partial<LearningAttempt> = {}) {
  return parseLearningAttempt({ version: 1, id, track: "guitar", lessonId, kind: "study", createdAt,
    practiceSeconds: 43, exerciseRevision: null, source: "selfReported", disposition: "reflection",
    assessment: "ready", score: null, bpm: null,
    details: { localSource: "selfReported", reflectionType: "guidedSelfCheck" }, ...patch }, syncLessonMap);
}
function derive(event: LearningAttempt) {
  return mergeAccountProgress(emptyProgress(event.track), emptyReadingQuizProgress(event.track), [event]).lessons[event.lessonId];
}

test("current guided concepts, exercises, songs and checkpoints retain explicit self-checked completion", () => {
  for (const lessonId of eligibleIds) {
    const event = reflection(lessonId);
    const record = derive(event);
    assert.equal(record.assessment, "ready", lessonId);
    assert.equal(record.source, "selfReported"); assert.equal(record.score, null);
    assert.equal(record.updatedAt, createdAt); assert.equal(record.practiceSeconds, 43);
    assert.equal(record.practiceSpecRevision, undefined); assert.equal(record.bpm, undefined);
    const progress = mergeAccountProgress(emptyProgress("guitar"), emptyReadingQuizProgress("guitar"), [event]);
    assert.equal(progress.measuredAttempts?.length ?? 0, 0);
    assert.deepEqual(mergeAccountProgress(progress, emptyReadingQuizProgress("guitar"), [event]), progress);
  }
});

test("legacy reflection labels remain compatible only for current guided content", () => {
  for (const details of [{ localSource: "selfReported" }, { localSource: "selfReported", reflectionType: "concept" }]) {
    assert.equal(derive(reflection(eligibleIds[1], { details })).assessment, "ready");
  }
  const outline = allLessons("guitar").find(({ lesson }) => !lesson.practiceSpec && !getLessonInstructions(lesson.id))!.lesson;
  for (const lessonId of [outline.id, "g-l1-m1-02", "g-l1-m3-04"]) {
    assert.notEqual(derive(reflection(lessonId))?.assessment, "ready", lessonId);
  }
  const voice = allLessons("voice")[0].lesson;
  assert.notEqual(derive(reflection(voice.id, { track: "voice" }))?.assessment, "ready");
});

test("raw events, overrides, unknown labels and mixed evidence cannot claim a guided self-check", () => {
  const lessonId = eligibleIds[1];
  const base = reflection(lessonId);
  for (const patch of [
    { kind: "manualCount" as const }, { kind: "microphone" as const },
    { disposition: "manualOverride" as const }, { assessment: "repeat" as const },
    { details: {} }, { details: { localSource: "selfReported", reflectionType: "verifiedSkill" } },
    ...["practiceScore", "readingQuizAttempt", "chordChangeAttempt", "studyPracticeAttempt"].map(key => ({ details: { ...base.details, [key]: null } })),
  ]) assert.notEqual(derive({ ...base, ...patch })?.assessment, "ready", JSON.stringify(patch));
  const before = emptyProgress("guitar");
  assert.deepEqual(mergeAccountProgress(before, emptyReadingQuizProgress("guitar"), [reflection(lessonId, { track: "guitar" })]).measuredAttempts ?? [], []);
  assert.deepEqual(mergeAccountProgress(emptyProgress("voice"), emptyReadingQuizProgress("voice"), [base]), emptyProgress("voice"));
});

test("new lesson exports label an authored self-check without manufacturing a score or elapsed time", () => {
  for (const lessonId of eligibleIds) {
    const record = { updatedAt: createdAt, practiceSeconds: 0, assessment: "ready" as const, source: "selfReported" as const, score: null };
    const event = attemptFromLessonRecord(id, "guitar", lessonId, record, syncLessonMap);
    assert.equal(event.details.reflectionType, "guidedSelfCheck");
    assert.equal(event.source, "selfReported"); assert.equal(event.score, null); assert.equal(event.practiceSeconds, 0);
    assert.equal(event.createdAt, createdAt); assert.equal(event.id, id);
    assert.equal(derive(event).assessment, "ready");
  }
});
