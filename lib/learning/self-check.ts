import { getLesson } from "./curriculum.ts";
import { getLessonInstructions } from "./instructions.ts";
import type { TrackId } from "./models.ts";

/** Eligibility for an explicit learner reflection; never a measured performance result. */
export function allowsGuidedSelfCheck(track: TrackId, lessonId: string): boolean {
  const lesson = getLesson(track, lessonId)?.lesson;
  const instruction = getLessonInstructions(lessonId);
  return !!lesson && !lesson.practiceSpec && !!instruction && !instruction.quiz &&
    instruction.criteria.length > 0 && instruction.criteria.every(criterion => criterion.trim().length > 0);
}
