import source from "./data/instruction-index.json" with { type: "json" };

/** Authored prerequisite lists, server side. The browser's guided index (catalog.json) leaves them out. */
export const lessonPrerequisites: readonly { id: string; prerequisiteLessonIds: readonly string[] }[] =
  source.lessons.map(lesson => ({ id: lesson.id, prerequisiteLessonIds: lesson.prerequisiteLessonIds }));
