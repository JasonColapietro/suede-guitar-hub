import type { PracticeResult } from "../audio/practice.ts";

/** Best saved microphone result per Advanced Lab drill, kept in this browser. */
export type DrillRecord = { score: number; bpm: number; passed: boolean; updatedAt: string; attempts: number };
export type DrillProgress = Record<string, DrillRecord>;

export const DRILL_PROGRESS_KEY = "guitarhub.advanced.v1";

export function parseDrillProgress(raw: string | null, validIds: readonly string[]): DrillProgress {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return {};
    const out: DrillProgress = {};
    for (const [id, record] of Object.entries(value as Record<string, unknown>)) {
      if (!validIds.includes(id) || !record || typeof record !== "object") continue;
      const r = record as Partial<DrillRecord>;
      if (typeof r.score !== "number" || !Number.isFinite(r.score) || typeof r.bpm !== "number" || !Number.isFinite(r.bpm) || typeof r.passed !== "boolean" || typeof r.updatedAt !== "string") continue;
      out[id] = { score: Math.max(0, Math.min(100, r.score)), bpm: r.bpm, passed: r.passed, updatedAt: r.updatedAt, attempts: typeof r.attempts === "number" && r.attempts > 0 ? Math.floor(r.attempts) : 1 };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Keep the stronger of two results. A pass beats a non-pass, then a faster
 * tempo, then a higher score, so the saved record always shows the best
 * evidence rather than the latest.
 */
export function withDrillResult(progress: DrillProgress, id: string, result: PracticeResult, now: string): DrillProgress {
  if (result.disposition !== "scored" || result.score === null || result.passed === null) return progress;
  const previous = progress[id];
  const candidate: DrillRecord = { score: result.score, bpm: Math.round(result.bpm), passed: result.passed, updatedAt: now, attempts: (previous?.attempts ?? 0) + 1 };
  if (!previous) return { ...progress, [id]: candidate };
  const better = Number(candidate.passed) - Number(previous.passed) || candidate.bpm - previous.bpm || candidate.score - previous.score;
  return { ...progress, [id]: better > 0 ? candidate : { ...previous, attempts: candidate.attempts } };
}
