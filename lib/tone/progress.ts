/**
 * Tone course progress, kept in this browser only.
 *
 * A lesson is recorded one of two ways, and the record says which: the learner
 * answered every question in its check correctly ("quiz"), or they marked it
 * read themselves ("read"). A quiz pass is never downgraded by a later
 * "read", and the best quiz score is kept rather than the latest.
 */

export type ToneLessonRecord = {
  how: "quiz" | "read";
  /** Correct answers on the best attempt, when the check was taken. */
  score: number | null;
  total: number | null;
  updatedAt: string;
};

export type ToneProgress = Record<string, ToneLessonRecord>;

export const TONE_PROGRESS_KEY = "guitarhub.tone.v1";

export function parseToneProgress(raw: string | null, validIds: readonly string[]): ToneProgress {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: ToneProgress = {};
    for (const [id, record] of Object.entries(value as Record<string, unknown>)) {
      if (!validIds.includes(id) || !record || typeof record !== "object") continue;
      const r = record as Partial<ToneLessonRecord>;
      if ((r.how !== "quiz" && r.how !== "read") || typeof r.updatedAt !== "string") continue;
      const score = typeof r.score === "number" && Number.isFinite(r.score) ? Math.max(0, Math.floor(r.score)) : null;
      const total = typeof r.total === "number" && Number.isFinite(r.total) && r.total > 0 ? Math.floor(r.total) : null;
      out[id] = { how: r.how, score: score !== null && total !== null ? Math.min(score, total) : null, total: score !== null ? total : null, updatedAt: r.updatedAt };
    }
    return out;
  } catch {
    return {};
  }
}

/** Record a finished check. Only a perfect score completes a lesson by quiz. */
export function withQuizResult(progress: ToneProgress, id: string, score: number, total: number, now: string): ToneProgress {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return progress;
  const clamped = Math.max(0, Math.min(total, Math.floor(score)));
  // A check with a wrong answer records nothing: the page shows which ones and
  // why, and the lesson stays open until the check is passed or marked read.
  if (clamped !== total || progress[id]?.how === "quiz") return progress;
  return { ...progress, [id]: { how: "quiz", score: clamped, total, updatedAt: now } };
}

/** The learner says they read it. Never replaces a quiz pass. */
export function withLessonRead(progress: ToneProgress, id: string, now: string): ToneProgress {
  if (progress[id]) return progress;
  return { ...progress, [id]: { how: "read", score: null, total: null, updatedAt: now } };
}

export function withoutLesson(progress: ToneProgress, id: string): ToneProgress {
  if (!progress[id]) return progress;
  const next = { ...progress };
  delete next[id];
  return next;
}

/** Completed lessons out of `ids`, for a module or the whole course. */
export function completedCount(progress: ToneProgress, ids: readonly string[]): number {
  return ids.filter(id => progress[id]).length;
}

/** The first lesson in course order that is not yet recorded, or null when all are. */
export function nextToneLesson(progress: ToneProgress, ids: readonly string[]): string | null {
  return ids.find(id => !progress[id]) ?? null;
}
