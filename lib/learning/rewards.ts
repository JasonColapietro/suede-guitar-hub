/**
 * Light progress signals: stars for scored attempts, and a practice log that
 * yields a day streak and a weekly goal. Deliberately small. Stars only ever
 * describe a real measured result, and the log only counts days on which the
 * learner saved a result, so nothing here can be earned by opening a page.
 */

export type Stars = 0 | 1 | 2 | 3;

/**
 * Microphone results: 1 star for a scored attempt of 60% or more, 2 for a
 * pass at any tempo, 3 for a pass at or above the goal tempo.
 */
export function starsForResult(result: { score: number | null; passed: boolean | null; bpm: number }, goalBpm?: number): Stars {
  if (result.score === null || result.passed === null) return 0;
  if (result.passed && (goalBpm === undefined || result.bpm >= goalBpm - .5)) return 3;
  if (result.passed) return 2;
  return result.score >= 60 ? 1 : 0;
}

/** Tap-along scores, which have no pass mark of their own. */
export function starsForTapScore(score: number): Stars {
  return score >= 95 ? 3 : score >= 80 ? 2 : score >= 60 ? 1 : 0;
}

export type PracticeLog = { version: 1; days: Record<string, number>; weeklyGoal: number };
export const PRACTICE_LOG_KEY = "guitarhub.practice-log.v1";
export const DEFAULT_WEEKLY_GOAL = 4;

/** Local calendar day, so a late-night session counts for the day it felt like. */
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parsePracticeLog(raw: string | null): PracticeLog {
  const empty: PracticeLog = { version: 1, days: {}, weeklyGoal: DEFAULT_WEEKLY_GOAL };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw) as Partial<PracticeLog>;
    const days: Record<string, number> = {};
    for (const [key, seconds] of Object.entries(value.days ?? {})) if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) days[key] = Math.min(86400, Math.round(seconds));
    const goal = typeof value.weeklyGoal === "number" && value.weeklyGoal >= 1 && value.weeklyGoal <= 7 ? Math.round(value.weeklyGoal) : DEFAULT_WEEKLY_GOAL;
    return { version: 1, days, weeklyGoal: goal };
  } catch { return empty; }
}

export function withPractice(log: PracticeLog, date: Date, seconds: number): PracticeLog {
  const key = dayKey(date);
  return { ...log, days: { ...log.days, [key]: Math.min(86400, (log.days[key] ?? 0) + Math.max(0, Math.round(seconds))) } };
}

/**
 * Consecutive practised days ending today, or ending yesterday when today has
 * not been practised yet (the streak is still alive until the day is over).
 */
export function streak(log: PracticeLog, today: Date): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!(dayKey(cursor) in log.days)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dayKey(cursor) in log.days) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

/** Days practised in the current Monday-to-Sunday week. */
export function daysThisWeek(log: PracticeLog, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  let count = 0;
  for (let i = 0; i < 7; i++) { const day = new Date(start); day.setDate(start.getDate() + i); if (dayKey(day) in log.days) count++; }
  return count;
}

/** Best stars across a lesson's saved microphone attempts. */
export function bestLessonStars(attempts: readonly { lessonId: string; record: { score: number | null; assessment: string; bpm?: number; completionMinimumBPM?: number } }[], lessonId: string): Stars {
  let best: Stars = 0;
  for (const attempt of attempts) {
    if (attempt.lessonId !== lessonId || attempt.record.score === null) continue;
    const stars = starsForResult({ score: attempt.record.score, passed: attempt.record.assessment === "ready", bpm: attempt.record.bpm ?? 0 }, attempt.record.completionMinimumBPM);
    if (stars > best) best = stars;
  }
  return best;
}
