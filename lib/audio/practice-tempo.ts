import type { PracticeSpec } from './practice.ts';
export interface TempoAttempt { bpm: number; score: number | null; disposition: 'scored' | 'insufficientSignal'; passed: boolean | null; specRevision?: number }
export type TempoReason = 'buildingEvidence' | 'repeatToConsolidate' | 'readyToIncrease' | 'reduceAndRebuild';

/** The adaptive-tempo grid, promoted out of the function body.
 *
 * 25 per cent to 125 per cent of the spec tempo in five per cent steps is the
 * same grid the sing repository uses for vocal practice, and until these were
 * named that agreement was a coincidence no test could notice. They are
 * serialized by `contracts/web-practice.ts`; changing one fails that contract. */
export const TEMPO_MINIMUM_RATIO = .25, TEMPO_MAXIMUM_RATIO = 1.25, TEMPO_INCREMENT_RATIO = .05;
/** A score under this is a reduction regardless of the spec's own pass score. */
export const TEMPO_FLOOR_SCORE = 60;
/** Advancing needs two consecutive attempts at or above this, and the pass score. */
export const TEMPO_ADVANCE_SCORE = 90;
/** Only the last three attempts at the current tempo count, and two are the
 * minimum before the recommendation is anything but "keep gathering evidence". */
export const TEMPO_EVIDENCE_WINDOW = 3, TEMPO_EVIDENCE_MINIMUM = 2;
/** Attempts count as "at the current tempo" within this many BPM of it. */
export const TEMPO_BPM_MATCH_EPSILON = .01;

/** Follows the native AdaptiveDifficulty public contract, including revision and tempo evidence boundaries. */
export function recommendPracticeTempo(spec: PracticeSpec, currentBPM: number, attempts: TempoAttempt[]): { bpm: number; reason: TempoReason } {
  const minimum = spec.bpm * TEMPO_MINIMUM_RATIO, maximum = spec.bpm * TEMPO_MAXIMUM_RATIO;
  const current = Math.min(maximum, Math.max(minimum, currentBPM));
  const gradable = attempts.filter(attempt => (spec.revision === undefined || attempt.specRevision === spec.revision) && attempt.disposition === 'scored' && attempt.score !== null && Number.isFinite(attempt.bpm) && Math.abs(attempt.bpm - current) < TEMPO_BPM_MATCH_EPSILON).slice(-TEMPO_EVIDENCE_WINDOW);
  const latest = gradable.at(-1);
  let reason: TempoReason = 'buildingEvidence', requested = current;
  if (latest && latest.score !== null) {
    if (latest.score < TEMPO_FLOOR_SCORE || latest.score < spec.passScore) reason = 'reduceAndRebuild';
    else if (gradable.length >= TEMPO_EVIDENCE_MINIMUM && gradable.slice(-TEMPO_EVIDENCE_MINIMUM).every(attempt => attempt.score! >= TEMPO_ADVANCE_SCORE && attempt.score! >= spec.passScore)) reason = 'readyToIncrease';
    else if (gradable.length >= TEMPO_EVIDENCE_MINIMUM) reason = 'repeatToConsolidate';
  }
  // Move exactly one grid step from the current tempo. Snapping a half-BPM
  // rounded 5% change could cross a grid point and skip a step (76 BPM failed
  // went to 68.4, not 72.2; 105% failed went to 95%, not 100%). Same arithmetic
  // as native AdaptiveDifficulty; contracts/learning.json pins both.
  const increment = spec.bpm * TEMPO_INCREMENT_RATIO, steps = current / increment;
  if (reason === 'reduceAndRebuild') requested = (Math.ceil(steps - 1e-6) - 1) * increment;
  if (reason === 'readyToIncrease') requested = (Math.floor(steps + 1e-6) + 1) * increment;
  return { bpm: Math.min(maximum, Math.max(minimum, requested)), reason };
}
