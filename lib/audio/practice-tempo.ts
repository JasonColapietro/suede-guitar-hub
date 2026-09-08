import type { PracticeSpec } from './practice.ts';
export interface TempoAttempt { bpm: number; score: number | null; disposition: 'scored' | 'insufficientSignal'; passed: boolean | null; specRevision?: number }
export type TempoReason = 'buildingEvidence' | 'repeatToConsolidate' | 'readyToIncrease' | 'reduceAndRebuild';

/** Follows the native AdaptiveDifficulty public contract, including revision and tempo evidence boundaries. */
export function recommendPracticeTempo(spec: PracticeSpec, currentBPM: number, attempts: TempoAttempt[]): { bpm: number; reason: TempoReason } {
  const minimum = spec.bpm * .25, maximum = spec.bpm * 1.25;
  const current = Math.min(maximum, Math.max(minimum, currentBPM));
  const gradable = attempts.filter(attempt => (spec.revision === undefined || attempt.specRevision === spec.revision) && attempt.disposition === 'scored' && attempt.score !== null && Number.isFinite(attempt.bpm) && Math.abs(attempt.bpm - current) < .01).slice(-3);
  const latest = gradable.at(-1);
  let reason: TempoReason = 'buildingEvidence', requested = current;
  if (latest && latest.score !== null) {
    if (latest.score < 60 || latest.score < spec.passScore) { reason = 'reduceAndRebuild'; requested = Math.round(current * .95 * 2) / 2; }
    else if (gradable.length >= 2 && gradable.slice(-2).every(attempt => attempt.score! >= 90 && attempt.score! >= spec.passScore)) { reason = 'readyToIncrease'; requested = Math.round(current * 1.05 * 2) / 2; }
    else if (gradable.length >= 2) reason = 'repeatToConsolidate';
  }
  requested = Math.min(maximum, Math.max(minimum, requested));
  const increment = spec.bpm * .05;
  if (reason === 'reduceAndRebuild') requested = Math.floor(requested / increment) * increment;
  if (reason === 'readyToIncrease') requested = Math.ceil(requested / increment) * increment;
  return { bpm: Math.min(maximum, Math.max(minimum, requested)), reason };
}
