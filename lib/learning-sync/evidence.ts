import type { LearningAttempt } from "../learning-account/contracts.ts";
import { allLessons, getLesson } from "../learning/curriculum.ts";
import { getLessonInstructions, parseReadingQuizAttempt } from "../learning/instructions.ts";
import { parseProgress, parseReadingQuizProgress, withLessonRecord, withReadingQuizEvidence, type LearningProgress, type LessonRecord, type ReadingQuizProgress } from "../learning/progress.ts";
import { parseStageTwoHistory, type StageTwoHistory } from "../learning/stage-two.ts";

export const syncLessonMap = new Map((["guitar", "voice"] as const).flatMap(track => allLessons(track).map(({ lesson }) => [lesson.id, track] as const)));
const ordered = (attempts: readonly LearningAttempt[]) => [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

/** Merge immutable answer snapshots; an answer cannot be revised by a later snapshot. */
export function mergeAccountReading(local: ReadingQuizProgress, cloud: readonly LearningAttempt[]): ReadingQuizProgress {
  const attempts = new Map(local.attempts.map(attempt => [attempt.id, structuredClone(attempt)]));
  for (const event of ordered(cloud)) {
    if (event.track !== local.track || event.kind !== "reading" || event.source === "legacy") continue;
    const quiz = getLessonInstructions(event.lessonId)?.quiz;
    const incoming = quiz ? parseReadingQuizAttempt(event.details.readingQuizAttempt, event.lessonId, quiz) : null;
    if (!incoming) continue;
    const previous = attempts.get(incoming.id);
    if (!previous) { attempts.set(incoming.id, incoming); continue; }
    if (previous.lessonId !== incoming.lessonId || previous.createdAt !== incoming.createdAt) continue;
    for (const [question, answer] of Object.entries(incoming.answers)) {
      const existing = previous.answers[question];
      if (!existing || answer.answeredAt < existing.answeredAt || (answer.answeredAt === existing.answeredAt && answer.optionIndex < existing.optionIndex)) previous.answers[question] = answer;
    }
  }
  return parseReadingQuizProgress(JSON.stringify({ ...local, attempts: [...attempts.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) }), local.track);
}

/** Cloud transport validation never establishes lesson completion. Re-run current curriculum rules. */
export function mergeAccountProgress(local: LearningProgress, reading: ReadingQuizProgress, cloud: readonly LearningAttempt[]): LearningProgress {
  let progress = local;
  for (const attempt of ordered(cloud)) {
    if (attempt.track !== local.track || attempt.kind === "reading" || attempt.source === "legacy" || attempt.disposition === "insufficientSignal") continue;
    // Raw manual/study events remain evidence in their own history; only a saved lesson reflection is a lesson record.
    if (attempt.source !== "measured" && attempt.details.localSource !== "selfReported" && attempt.disposition !== "manualOverride") continue;
    const spec = getLesson(local.track, attempt.lessonId)?.lesson.practiceSpec;
    const measured = attempt.source === "measured" && attempt.disposition === "scored";
    const scoreEvidence = attempt.details.practiceScore;
    const evidence = scoreEvidence && typeof scoreEvidence === "object" && !Array.isArray(scoreEvidence) ? scoreEvidence as Record<string, unknown> : {};
    const completeTargets = !!spec && evidence.targetCount === spec.targets.length && typeof evidence.matchedTargets === "number" && Number.isInteger(evidence.matchedTargets) && evidence.matchedTargets >= 0 && evidence.matchedTargets <= spec.targets.length && attempt.score !== null && attempt.score <= Math.round(evidence.matchedTargets / spec.targets.length * 100);
    const fullSeconds = spec && attempt.bpm ? Math.floor(((spec.targets.at(-1)?.beat ?? 0) + 1) * 60 / attempt.bpm) : Infinity;
    const completeDuration = attempt.practiceSeconds !== null && attempt.practiceSeconds >= fullSeconds;
    const record: LessonRecord = {
      updatedAt: attempt.createdAt, practiceSeconds: Math.floor(attempt.practiceSeconds ?? 0),
      source: measured ? "measured" : "selfReported", score: measured ? attempt.score : null,
      assessment: measured ? completeTargets && completeDuration && spec && attempt.score !== null && attempt.score >= spec.passScore ? "ready" : "repeat" : attempt.assessment,
      ...(measured && attempt.bpm !== null ? { bpm: attempt.bpm } : {}),
      ...(measured && attempt.exerciseRevision !== null ? { practiceSpecRevision: attempt.exerciseRevision } : {}),
    };
    const previous = progress.lessons[attempt.lessonId];
    const next = withLessonRecord(progress, attempt.lessonId, record, attempt.id);
    progress = previous && previous.updatedAt > record.updatedAt ? { ...next, lessons: { ...next.lessons, [attempt.lessonId]: previous } } : next;
  }
  const normalized = parseProgress(JSON.stringify(progress), local.track, allLessons(local.track).map(({ lesson }) => lesson.id));
  return withReadingQuizEvidence(normalized, mergeAccountReading(reading, cloud));
}

export function mergeAccountStageTwo(local: StageTwoHistory, cloud: readonly LearningAttempt[]): StageTwoHistory {
  const changes = new Map(local.changes.map(attempt => [attempt.id, attempt]));
  const studies = new Map(local.studies.map(attempt => [attempt.id, attempt]));
  for (const event of ordered(cloud)) {
    if (event.track !== local.track || event.source !== "selfReported") continue;
    const manual = event.details.chordChangeAttempt;
    const change = manual && typeof manual === "object" && !Array.isArray(manual) ? { ...manual, interrupted: "interrupted" in manual ? manual.interrupted : !("completedMinute" in manual && manual.completedMinute === true) } : null;
    const decoded = parseStageTwoHistory(JSON.stringify({ version: 1, track: local.track, changes: change ? [change] : [], studies: event.details.studyPracticeAttempt ? [event.details.studyPracticeAttempt] : [] }), local.track);
    for (const attempt of decoded.changes) { const previous = changes.get(attempt.id); if (attempt.lessonId === event.lessonId && (!previous || previous.count === null)) changes.set(attempt.id, attempt); }
    for (const attempt of decoded.studies) if (attempt.lessonId === event.lessonId && !studies.has(attempt.id)) studies.set(attempt.id, attempt);
  }
  return { ...local, changes: [...changes.values()], studies: [...studies.values()] };
}
