import type { TrackId } from "./models.ts";
import { getLessonInstructions, parseReadingQuizAttempt, readingQuizResult, type ReadingQuizAttempt } from "./instructions.ts";
import { getLesson } from "./curriculum.ts";
export type Assessment = "repeat" | "ready";
export interface LessonRecord {
  updatedAt: string;
  practiceSeconds: number;
  assessment: Assessment;
  source: "selfReported" | "measured" | "readingQuiz";
  score: number | null;
  readingQuizAttempt?: ReadingQuizAttempt;
  bpm?: number;
  completionMinimumBPM?: number;
  practiceSpecRevision?: number;
}
export interface MeasuredAttempt { id: string; lessonId: string; record: LessonRecord }
export interface LearningProgress { version: 1; track: TrackId; lessons: Record<string, LessonRecord>; measuredAttempts?: MeasuredAttempt[] }
export function progressKey(track: TrackId) { return `guitarhub.learning.v1.${track}`; }
export function emptyProgress(track: TrackId): LearningProgress { return { version: 1, track, lessons: {} }; }
/** Never trust browser storage: discard unknown IDs, tracks, values and malformed data. */
export function parseProgress(raw: string | null, track: TrackId, validLessonIds: readonly string[]): LearningProgress {
  const clean = emptyProgress(track);
  if (!raw) return clean;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || value.track !== track || !value.lessons || typeof value.lessons !== "object" || Array.isArray(value.lessons)) return clean;
    for (const id of validLessonIds) {
      if (!Object.hasOwn(value.lessons, id)) continue;
      const entry = value.lessons[id];
      const authoredSpec = getLesson(track, id)?.lesson.practiceSpec;
      const requiredBPM = authoredSpec?.completionMinimumBPM;
      const requiredRevision = authoredSpec?.revision;
      if (!entry || typeof entry !== "object" || !["ready", "repeat"].includes(entry.assessment) || !["selfReported", "measured", "readingQuiz"].includes(entry.source)) continue;
      if (typeof entry.updatedAt !== "string" || !Number.isFinite(Date.parse(entry.updatedAt))) continue;
      if (!Number.isInteger(entry.practiceSeconds) || entry.practiceSeconds < 0 || entry.practiceSeconds > 86400) continue;
      if (entry.source === "measured" && (typeof entry.score !== "number" || !Number.isFinite(entry.score) || entry.score < 0 || entry.score > 100)) continue;
      if (entry.source === "measured" && entry.bpm !== undefined && (typeof entry.bpm !== "number" || !Number.isFinite(entry.bpm) || entry.bpm <= 0 || entry.bpm > 400)) continue;
      if (entry.source === "measured" && entry.completionMinimumBPM !== undefined && (entry.bpm === undefined || typeof entry.completionMinimumBPM !== "number" || !Number.isFinite(entry.completionMinimumBPM) || entry.completionMinimumBPM < 20 || entry.completionMinimumBPM > 300)) continue;
      if (entry.practiceSpecRevision !== undefined && (!Number.isInteger(entry.practiceSpecRevision) || entry.practiceSpecRevision < 1 || entry.practiceSpecRevision > 1_000_000)) continue;
      if (entry.source === "readingQuiz") {
        const quiz = getLessonInstructions(id)?.quiz;
        const attempt = quiz ? parseReadingQuizAttempt(entry.readingQuizAttempt, id, quiz) : null;
        if (!quiz || !attempt) continue;
        const result = readingQuizResult(quiz, attempt);
        clean.lessons[id] = { updatedAt: new Date(entry.updatedAt).toISOString(), practiceSeconds: entry.practiceSeconds, assessment: result?.passed ? "ready" : "repeat", source: "readingQuiz", score: null, readingQuizAttempt: attempt };
        continue;
      }
      clean.lessons[id] = {
        updatedAt: new Date(entry.updatedAt).toISOString(),
        practiceSeconds: entry.practiceSeconds,
        assessment: getLessonInstructions(id)?.quiz || (requiredRevision !== undefined && (entry.source !== "measured" || entry.practiceSpecRevision !== requiredRevision || entry.score < authoredSpec!.passScore)) || (requiredBPM !== undefined && (entry.source !== "measured" || entry.bpm === undefined || entry.bpm < requiredBPM || entry.score < authoredSpec!.passScore)) || (entry.source === "measured" && entry.completionMinimumBPM !== undefined && entry.bpm < entry.completionMinimumBPM) ? "repeat" : entry.assessment,
        source: entry.source,
        score: entry.source === "measured" ? entry.score : null,
        ...(entry.source === "measured" && entry.bpm !== undefined ? { bpm: entry.bpm } : {}),
        ...(entry.source === "measured" && entry.completionMinimumBPM !== undefined ? { completionMinimumBPM: entry.completionMinimumBPM } : {}),
        ...(entry.source === "measured" && entry.practiceSpecRevision !== undefined ? { practiceSpecRevision: entry.practiceSpecRevision } : {}),
      };
    }
    if (Array.isArray(value.measuredAttempts)) {
      const seen = new Set<string>();
      for (const attempt of value.measuredAttempts) {
        if (!attempt || typeof attempt.id !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(attempt.id) || seen.has(attempt.id) || !validLessonIds.includes(attempt.lessonId)) continue;
        const decoded = parseProgress(JSON.stringify({ version: 1, track, lessons: { [attempt.lessonId]: attempt.record } }), track, [attempt.lessonId]).lessons[attempt.lessonId];
        if (decoded?.source !== "measured") continue;
        (clean.measuredAttempts ??= []).push({ id: attempt.id, lessonId: attempt.lessonId, record: decoded }); seen.add(attempt.id);
      }
    }
  } catch { /* Corrupt or older data starts a clean learning path. */ }
  return clean;
}

/** Preserve every measured result when replacing a lesson's current reflection. */
export function withLessonRecord(progress: LearningProgress, lessonId: string, record: LessonRecord, attemptId: string): LearningProgress {
  if (record.source === "measured" && progress.measuredAttempts?.some(attempt => attempt.id === attemptId)) return progress;
  const measuredAttempts = [...(progress.measuredAttempts ?? [])];
  const previous = progress.lessons[lessonId];
  if (previous?.source === "measured" && !measuredAttempts.some(attempt => attempt.lessonId === lessonId && attempt.record.updatedAt === previous.updatedAt && attempt.record.score === previous.score && attempt.record.bpm === previous.bpm && attempt.record.practiceSpecRevision === previous.practiceSpecRevision)) {
    measuredAttempts.push({ id: `legacy-${lessonId}-${Date.parse(previous.updatedAt)}`, lessonId, record: previous });
  }
  if (record.source === "measured" && !measuredAttempts.some(attempt => attempt.id === attemptId)) measuredAttempts.push({ id: attemptId, lessonId, record });
  return { ...progress, lessons: { ...progress.lessons, [lessonId]: record }, ...(measuredAttempts.length ? { measuredAttempts } : {}) };
}

export interface ReadingQuizProgress { version: 1; track: TrackId; attempts: ReadingQuizAttempt[]; currentAttemptIds: Record<string, string> }
export function readingQuizKey(track: TrackId) { return `guitarhub.reading.v1.${track}`; }
export function emptyReadingQuizProgress(track: TrackId): ReadingQuizProgress { return { version: 1, track, attempts: [], currentAttemptIds: {} }; }
/** Quiz history survives access changes; lesson eligibility is a separate concern. */
export function parseReadingQuizProgress(raw: string | null, track: TrackId): ReadingQuizProgress {
  const clean = emptyReadingQuizProgress(track);
  if (!raw) return clean;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || value.track !== track || !Array.isArray(value.attempts)) return clean;
    const seen = new Set<string>();
    for (const item of value.attempts) {
      if (!item || typeof item.lessonId !== "string" || !item.lessonId.startsWith(`${track[0]}-`)) continue;
      const quiz = getLessonInstructions(item.lessonId)?.quiz;
      const attempt = quiz ? parseReadingQuizAttempt(item, item.lessonId, quiz) : null;
      if (!attempt || seen.has(attempt.id)) continue;
      seen.add(attempt.id); clean.attempts.push(attempt);
      clean.currentAttemptIds[attempt.lessonId] = attempt.id;
    }
    // The most recently appended valid attempt is current. A stale pointer
    // cannot make an older pass stand in for a newer unfinished retry.
  } catch { /* Malformed history cannot create a quiz result. */ }
  return clean;
}
/** Independent answer history is authoritative over an older lesson snapshot. */
export function withReadingQuizEvidence(progress: LearningProgress, reading: ReadingQuizProgress): LearningProgress {
  if (progress.track !== reading.track) return progress;
  const lessons = { ...progress.lessons };
  for (const [lessonId, attemptId] of Object.entries(reading.currentAttemptIds)) {
    const attempt = reading.attempts.find(item => item.id === attemptId && item.lessonId === lessonId);
    const quiz = getLessonInstructions(lessonId)?.quiz;
    if (!attempt || !quiz) continue;
    const result = readingQuizResult(quiz, attempt);
    const answeredAt = Object.values(attempt.answers).map(answer => answer.answeredAt).sort().at(-1);
    lessons[lessonId] = { updatedAt: answeredAt ?? attempt.createdAt, practiceSeconds: lessons[lessonId]?.practiceSeconds ?? 0, source: "readingQuiz", assessment: result?.passed ? "ready" : "repeat", score: null, readingQuizAttempt: attempt };
  }
  return { ...progress, lessons };
}
export function nextLessonId(ids: readonly string[], progress: LearningProgress) {
  return ids.find((id) => progress.lessons[id]?.assessment !== "ready") ?? ids[0];
}
export function completedCount(ids: readonly string[], progress: LearningProgress) {
  return ids.filter((id) => progress.lessons[id]?.assessment === "ready").length;
}
export function elapsedSeconds(accumulatedMs: number, startedAt: number | null, now: number) {
  return Math.min(86400, Math.floor((Math.max(0, accumulatedMs) + (startedAt === null ? 0 : Math.max(0, now - startedAt))) / 1000));
}
