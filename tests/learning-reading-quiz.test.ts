import test from "node:test";
import assert from "node:assert/strict";
import { answerReadingQuestion, getLessonInstructions, readingQuizResult, type ReadingQuizAttempt } from "../lib/learning/instructions.ts";
import { emptyProgress, emptyReadingQuizProgress, parseProgress, parseReadingQuizProgress, readingQuizKey, withReadingQuizEvidence } from "../lib/learning/progress.ts";

const lessonId = "g-l1-m3-04";
const quiz = getLessonInstructions(lessonId)!.quiz!;
const time = "2026-09-04T12:00:00.000Z";
function attempt(id = "attempt-1"): ReadingQuizAttempt { return { id, lessonId, createdAt: time, answers: {} }; }
function completed(correctCount: number, id = "attempt-1") {
  return quiz.items.reduce((state, question, index) => answerReadingQuestion(quiz, state, question.id, index < correctCount ? question.correctOptionIndex : (question.correctOptionIndex + 1) % question.options.length, time), attempt(id));
}

test("authored reading pass counts first responses without a timer or microphone score", () => {
  assert.equal(readingQuizResult(quiz, attempt()), null);
  assert.equal(readingQuizResult(quiz, completed(7))?.passed, false);
  assert.deepEqual(readingQuizResult(quiz, completed(8)), { correctCount: 8, total: 10, passed: true, missedKinds: ["rhythm", "chord_start"] });
  assert.deepEqual(readingQuizResult(quiz, completed(10))?.missedKinds, []);
});

test("feedback and repeated submissions cannot change a first response in an attempt", () => {
  const question = quiz.items[0];
  const first = answerReadingQuestion(quiz, attempt(), question.id, 1, time);
  const retry = answerReadingQuestion(quiz, first, question.id, question.correctOptionIndex, time);
  assert.equal(retry, first);
  assert.equal(retry.answers[question.id].optionIndex, 1);
  assert.deepEqual(attempt().answers, {});
  for (const invalid of [-1, 10, 0.5, Number.NaN]) assert.equal(answerReadingQuestion(quiz, first, quiz.items[1].id, invalid, time), first);
  assert.equal(answerReadingQuestion(quiz, first, "unwritten-question", 0, time), first);
});

test("partial attempts resume with locked answers and completed retries retain the first attempt", () => {
  const first = completed(6, "first");
  const second = answerReadingQuestion(quiz, attempt("second"), quiz.items[0].id, 0, time);
  const raw = JSON.stringify({ version: 1, track: "guitar", attempts: [first, second], currentAttemptIds: { [lessonId]: "first" } });
  const restored = parseReadingQuizProgress(raw, "guitar");
  assert.deepEqual(restored.attempts, [first, second]);
  assert.equal(restored.currentAttemptIds[lessonId], "second");
  assert.equal(readingQuizResult(quiz, restored.attempts[1]), null);
  assert.equal(readingQuizResult(quiz, restored.attempts[0])?.correctCount, 6);
  assert.equal(answerReadingQuestion(quiz, restored.attempts[1], quiz.items[0].id, 1, time), restored.attempts[1]);
});

test("quiz histories reject malformed records and remain isolated from other tracks and lessons", () => {
  const valid = completed(9);
  const raw = JSON.stringify({ version: 1, track: "guitar", attempts: [valid, { ...valid, answers: {} }, { ...attempt("unknown"), lessonId: "g-l1-m1-01" }, { ...attempt("bad-date"), createdAt: "yesterday" }] });
  assert.deepEqual(parseReadingQuizProgress(raw, "guitar").attempts, [valid]);
  assert.deepEqual(parseReadingQuizProgress(raw, "voice"), emptyReadingQuizProgress("voice"));
  assert.deepEqual(parseReadingQuizProgress("{broken", "guitar"), emptyReadingQuizProgress("guitar"));
  assert.notEqual(readingQuizKey("guitar"), readingQuizKey("voice"));
});

test("reading completion is derived from validated answers and cannot inherit a forged stored score", () => {
  const lessonRecord = (readingQuizAttempt: ReadingQuizAttempt) => ({ updatedAt: time, practiceSeconds: 90, source: "readingQuiz", assessment: "ready", score: 100, readingQuizAttempt });
  const parse = (record: unknown) => parseProgress(JSON.stringify({ version: 1, track: "guitar", lessons: { [lessonId]: record } }), "guitar", [lessonId]).lessons[lessonId];
  assert.equal(parse(lessonRecord(completed(3))).assessment, "repeat");
  assert.equal(parse(lessonRecord(attempt())).assessment, "repeat");
  assert.equal(parse(lessonRecord(completed(8))).assessment, "ready");
  assert.equal(parse(lessonRecord(completed(10))).score, null);
  assert.equal(parse({ ...lessonRecord(completed(10)), readingQuizAttempt: { ...completed(10), lessonId: "g-l1-m1-01" } }), undefined);
  assert.equal(parse({ ...lessonRecord(completed(10)), readingQuizAttempt: undefined }), undefined);
  const invalidAnswer = completed(10);
  invalidAnswer.answers[quiz.items[0].id].optionIndex = 200;
  assert.equal(parse(lessonRecord(invalidAnswer)).assessment, "repeat");
});

test("a new unfinished retry does not erase past passes or become a new pass", () => {
  const history = parseReadingQuizProgress(JSON.stringify({ version: 1, track: "guitar", attempts: [completed(10, "first-pass"), attempt("retry")] }), "guitar");
  assert.equal(history.currentAttemptIds[lessonId], "retry");
  assert.equal(readingQuizResult(quiz, history.attempts[0])?.passed, true);
  assert.equal(readingQuizResult(quiz, history.attempts[1]), null);
  const oldPass = { ...emptyProgress("guitar"), lessons: { [lessonId]: { updatedAt: time, practiceSeconds: 60, source: "readingQuiz" as const, assessment: "ready" as const, score: null, readingQuizAttempt: history.attempts[0] } } };
  assert.equal(withReadingQuizEvidence(oldPass, history).lessons[lessonId].assessment, "repeat");
  assert.equal(oldPass.lessons[lessonId].assessment, "ready");
});

test("legacy self-report and microphone records cannot substitute for a reading result", () => {
  for (const source of ["selfReported", "measured"]) {
    const raw = JSON.stringify({ version: 1, track: "guitar", lessons: { [lessonId]: { updatedAt: time, practiceSeconds: 300, source, assessment: "ready", score: 100 } } });
    assert.equal(parseProgress(raw, "guitar", [lessonId]).lessons[lessonId].assessment, "repeat");
  }
  const history = parseReadingQuizProgress(JSON.stringify({ version: 1, track: "guitar", attempts: [completed(8)] }), "guitar");
  const record = withReadingQuizEvidence(emptyProgress("guitar"), history).lessons[lessonId];
  assert.equal(record.source, "readingQuiz");
  assert.equal(record.assessment, "ready");
  assert.equal(record.score, null);
});
