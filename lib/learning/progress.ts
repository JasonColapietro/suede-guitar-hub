import type { TrackId } from "./models.ts";
export type Assessment = "repeat" | "ready";
export interface LessonRecord {
  updatedAt: string;
  practiceSeconds: number;
  assessment: Assessment;
  source: "selfReported" | "measured";
  score: number | null;
}
export interface LearningProgress { version: 1; track: TrackId; lessons: Record<string, LessonRecord> }
export function progressKey(track: TrackId) { return `guitarhub.learning.v1.${track}`; }
export function emptyProgress(track: TrackId): LearningProgress { return { version: 1, track, lessons: {} }; }
/** Never trust browser storage: discard unknown IDs, tracks, values and malformed data. */
export function parseProgress(raw: string | null, track: TrackId, validLessonIds: readonly string[]): LearningProgress {
  const clean = emptyProgress(track);
  if (!raw || raw.length > 200_000) return clean;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || value.track !== track || !value.lessons || typeof value.lessons !== "object" || Array.isArray(value.lessons)) return clean;
    for (const id of validLessonIds) {
      if (!Object.hasOwn(value.lessons, id)) continue;
      const entry = value.lessons[id];
      if (!entry || typeof entry !== "object" || !["ready", "repeat"].includes(entry.assessment) || !["selfReported", "measured"].includes(entry.source)) continue;
      if (typeof entry.updatedAt !== "string" || !Number.isFinite(Date.parse(entry.updatedAt))) continue;
      if (!Number.isInteger(entry.practiceSeconds) || entry.practiceSeconds < 0 || entry.practiceSeconds > 86400) continue;
      if (entry.source === "measured" && (typeof entry.score !== "number" || !Number.isFinite(entry.score) || entry.score < 0 || entry.score > 100)) continue;
      clean.lessons[id] = {
        updatedAt: new Date(entry.updatedAt).toISOString(),
        practiceSeconds: entry.practiceSeconds,
        assessment: entry.assessment,
        source: entry.source,
        score: entry.source === "measured" ? entry.score : null,
      };
    }
  } catch { /* Corrupt or older data starts a clean learning path. */ }
  return clean;
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
