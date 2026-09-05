import { isFullStudyTake, manualChangeRate, type ChordStudy, type ManualChangeAttempt, type StudyAttempt } from "./stage-two.ts";

export interface StageTwoEvidence { ready: boolean; practiceSeconds: number }
export const noStageTwoEvidence: StageTwoEvidence = { ready: false, practiceSeconds: 0 };

function wholeSeconds(seconds: number) {
  return Number.isFinite(seconds) ? Math.floor(Math.max(0, Math.min(86400, seconds))) : 0;
}

export function manualPracticeEvidence(attempt: ManualChangeAttempt | undefined, checkpoint: boolean, earlyReadinessCount: number): StageTwoEvidence {
  const rate = attempt ? manualChangeRate(attempt) : null;
  return { ready: rate !== null && (!checkpoint || rate >= earlyReadinessCount), practiceSeconds: wholeSeconds(attempt?.durationSeconds ?? 0) };
}

export function studyPracticeEvidence(attempt: StudyAttempt | undefined, study: ChordStudy): StageTwoEvidence {
  return { ready: !!attempt && isFullStudyTake(attempt, study), practiceSeconds: wholeSeconds(attempt?.practiceSeconds ?? 0) };
}

/** A saved exercise supplies this reflection's duration. The optional sidebar
 * timer may overlap it, so never add that timer to recorded exercise time. */
export function lessonPracticeSeconds(timerSeconds: number, ...evidence: StageTwoEvidence[]): number {
  const recordedSeconds = Math.max(0, ...evidence.map(item => wholeSeconds(item.practiceSeconds)));
  return recordedSeconds > 0 ? recordedSeconds : wholeSeconds(timerSeconds);
}
