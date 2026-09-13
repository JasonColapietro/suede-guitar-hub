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

export function hasInstructionQuiz(lessonId: string): boolean {
  return !!lessons.get(lessonId)?.quiz;
}
