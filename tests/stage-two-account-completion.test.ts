import test from "node:test";
import assert from "node:assert/strict";
import { parseLearningAttempt, type LearningAttempt } from "../lib/learning-account/contracts.ts";
import { mergeAccountProgress, syncLessonMap } from "../lib/learning-sync/evidence.ts";
import { emptyProgress, emptyReadingQuizProgress } from "../lib/learning/progress.ts";
import { getInstructionAsset } from "../lib/learning/instructions.ts";
import { studyPosition, type ManualChangeAttempt, type StudyAttempt } from "../lib/learning/stage-two.ts";

const baseTime = Date.parse("2026-09-19T12:00:00.000Z");
let sequence = 0;
function uuid() { return `a0000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`; }
function event(lessonId: string, patch: Partial<LearningAttempt> = {}) {
  return parseLearningAttempt({ version: 1, id: uuid(), track: "guitar", lessonId, kind: "study",
    createdAt: new Date(baseTime + sequence * 1000).toISOString(), practiceSeconds: 0,
    exerciseRevision: null, source: "selfReported", disposition: "reflection", assessment: "ready",
    score: null, bpm: null, details: { localSource: "selfReported", reflectionType: "guidedSelfCheck" },
    ...patch }, syncLessonMap);
}
function reflection(lessonId: string) { return event(lessonId); }
function importedAssessment(lessonId: string, attempts: LearningAttempt[]) {
  return mergeAccountProgress(emptyProgress("guitar"), emptyReadingQuizProgress("guitar"), attempts).lessons[lessonId]?.assessment;
}

function manualEvidence(lessonId: string, count: number): LearningAttempt {
  const attempt: ManualChangeAttempt = { id: uuid(), lessonId,
    createdAt: new Date(baseTime + sequence * 1000).toISOString(), startingChord: "A", count,
    durationSeconds: 60, completedMinute: true, interrupted: false };
  return event(lessonId, { kind: "manualCount", assessment: "repeat", details: { chordChangeAttempt: attempt } });
}

const asset = getInstructionAsset("stage2-first-light-study");
if (asset.kind !== "study") throw new Error("Missing authored stage-two study");
const study = asset.study;
function studyEvidence(lessonId: string): LearningAttempt {
  const bpm = study.defaultBPM;
  const attempt: StudyAttempt = { id: uuid(), lessonId, studyId: study.id,
    createdAt: new Date(baseTime + sequence * 1000).toISOString(), bpm, firstBar: 1,
    lastBar: study.barCount, variantId: study.variants.find(item => item.isDefault)?.id ?? study.variants[0].id,
    practiceSeconds: studyPosition(study, (study.countInBeats + study.barCount * study.beatsPerBar) * 60 / bpm, bpm, 1, study.barCount).musicSeconds,
    usedBacking: false, usedClicks: true, interrupted: false, timelineFinished: true,
    learnerPlayedAllBars: true, reviewBar: null };
  return event(lessonId, { assessment: "repeat", practiceSeconds: attempt.practiceSeconds, bpm,
    details: { studyPracticeAttempt: attempt } });
}

test("stage-two guided reflections cannot import completion without their required playing evidence", () => {
  for (const lessonId of ["g-l2-m3-02", "g-l2-m3-06", "g-l2-m2-01", "g-l2-m2-04"]) {
    assert.equal(importedAssessment(lessonId, [reflection(lessonId)]), "repeat", lessonId);
  }
});

test("a qualifying full-minute count can precede completion for both manual-count lessons", () => {
  for (const [lessonId, count] of [["g-l2-m3-02", 1], ["g-l2-m3-06", 30]] as const) {
    assert.equal(importedAssessment(lessonId, [manualEvidence(lessonId, count), reflection(lessonId)]), "ready", lessonId);
  }
});

test("a self-reported full study take can precede completion for both study lessons", () => {
  for (const lessonId of ["g-l2-m2-01", "g-l2-m2-04"]) {
    assert.equal(importedAssessment(lessonId, [studyEvidence(lessonId), reflection(lessonId)]), "ready", lessonId);
  }
});

test("stage-two evidence recorded after a reflection does not retroactively complete it", () => {
  const lessonId = "g-l2-m3-02";
  assert.equal(importedAssessment(lessonId, [reflection(lessonId), manualEvidence(lessonId, 30)]), "repeat");
});
