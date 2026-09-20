import source from "./data/instruction-index.json" with { type: "json" };
import { validateInstructionQuiz, type InstructionQuiz } from "./reading-quiz.ts";

const lessons = new Map(source.lessons.map(lesson => [lesson.id, lesson]));

export const guidedLessonIds = source.lessons.map(lesson => lesson.id);
export const lessonPrerequisites: readonly { id: string; prerequisiteLessonIds: readonly string[] }[] =
  source.lessons.map(lesson => ({ id: lesson.id, prerequisiteLessonIds: lesson.prerequisiteLessonIds }));

export function isGuidedLesson(lessonId: string): boolean {
  return lessons.has(lessonId);
}

export function getInstructionQuiz(lessonId: string): InstructionQuiz | undefined {
  const quiz = lessons.get(lessonId)?.quiz;
  return quiz ? validateInstructionQuiz(quiz as InstructionQuiz) : undefined;
}

/** Derived from the authored criteria without shipping lesson prose to client surfaces. */
export function hasInstructionSelfCheck(lessonId: string): boolean {
  return lessons.get(lessonId)?.hasSelfCheckCriteria === true;
}

export function hasInstructionQuiz(lessonId: string): boolean {
  return !!lessons.get(lessonId)?.quiz;
}

/** IDs for authored practice assets that LessonSession requires before a
 * guided reflection can mark the lesson ready. */
export function getInstructionStageEvidenceAssetIds(lessonId: string): readonly string[] {
  return lessons.get(lessonId)?.stageEvidenceAssetIds ?? [];
}
