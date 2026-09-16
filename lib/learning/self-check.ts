import { getLesson } from "./curriculum.ts";
import { hasInstructionQuiz, hasInstructionSelfCheck } from "./instruction-index.ts";
import type { TrackId } from "./models.ts";

/** Eligibility for an explicit learner reflection; never a measured performance result. */
export function allowsGuidedSelfCheck(track: TrackId, lessonId: string): boolean {
  const lesson = getLesson(track, lessonId)?.lesson;
  return !!lesson && !lesson.practiceSpec && !hasInstructionQuiz(lessonId) && hasInstructionSelfCheck(lessonId);
}
