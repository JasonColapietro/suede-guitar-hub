import test from "node:test";
import assert from "node:assert/strict";
import { getLesson, allLessons } from "../lib/learning/curriculum.ts";
import { scorePractice } from "../lib/audio/practice.ts";
import { emptyProgress, parseProgress, withLessonRecord, type LessonRecord } from "../lib/learning/progress.ts";

const updatedAt = "2026-09-08T00:00:00.000Z";
function save(lessonId: string, record: LessonRecord) {
  const written = withLessonRecord(emptyProgress("guitar"), lessonId, record, "completed-play-attempt");
  return parseProgress(JSON.stringify(written), "guitar", [lessonId]);
}
test("a self-check cannot complete any microphone lesson, including unversioned open strings", () => {
  const opening = getLesson("guitar", "g-l1-m1-02")!.lesson;
  assert.ok(opening.practiceSpec);
  assert.equal(opening.practiceSpec.revision, undefined);
  assert.equal(opening.practiceSpec.completionMinimumBPM, undefined);
  for (const { lesson } of allLessons("guitar").filter(({ lesson }) => lesson.practiceSpec)) {
    const result = save(lesson.id, { updatedAt, practiceSeconds: 300, assessment: "ready", source: "selfReported", score: null });
    assert.equal(result.lessons[lesson.id].assessment, "repeat", lesson.id);
    assert.equal(result.lessons[lesson.id].source, "selfReported");
    assert.equal(result.measuredAttempts?.length ?? 0, 0);
  }
});
test("an actual passing open-string score still completes the local lesson and retains measured history", () => {
  const lesson = getLesson("guitar", "g-l1-m1-02")!.lesson;
  const spec = lesson.practiceSpec!;
  const result = scorePractice(spec, spec.targets.map((target, index) => ({ time: index * 2, midi: target.midi, cents: 0, confidence: .95 })), 12);
  assert.equal(result.disposition, "scored"); assert.equal(result.passed, true);
  assert.equal(result.matchedTargets, spec.targets.length);
  const progress = save(lesson.id, { updatedAt, practiceSeconds: result.practiceSeconds, assessment: result.passed ? "ready" : "repeat", source: "measured", score: result.score, bpm: result.bpm });
  assert.equal(progress.lessons[lesson.id].assessment, "ready");
  assert.equal(progress.lessons[lesson.id].source, "measured");
  assert.equal(progress.measuredAttempts?.length, 1);
  assert.equal(save(lesson.id, { ...progress.lessons[lesson.id], score: spec.passScore - 1 }).lessons[lesson.id].assessment, "repeat");
});
test("manual-count, study and advanced guide self-checks remain eligible for their local reflection flow", () => {
  for (const lessonId of ["g-l2-m3-02", "g-l2-m2-04", "g-l5-m1-02"]) {
    assert.equal(getLesson("guitar", lessonId)!.lesson.practiceSpec, undefined);
    assert.equal(save(lessonId, { updatedAt, practiceSeconds: 60, assessment: "ready", source: "selfReported", score: null }).lessons[lessonId].assessment, "ready");
  }
});
