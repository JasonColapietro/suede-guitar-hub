import { allLessons, type TrackId } from "./curriculum.ts";
import { guidedLessonIds } from "./instruction-index.ts";
import { lessonMatcher, type LessonFilter } from "./lesson-filter.ts";
export { lessonFilters, type LessonFilter } from "./lesson-filter.ts";

const guided = new Set(guidedLessonIds);

/** The native library's filter and word-search semantics, over the full server-side curriculum. */
export function browseLessons(track: TrackId, filter: LessonFilter = "guided", query = "") {
  const matches = lessonMatcher(filter, query);
  return allLessons(track).map(entry => ({ ...entry, isGuided: guided.has(entry.lesson.id) })).filter(entry => matches({
    title: entry.lesson.title, summary: entry.lesson.summary, type: entry.lesson.type, mic: !!entry.lesson.practiceSpec,
    isGuided: entry.isGuided, moduleName: entry.module.name, levelName: entry.level.name,
  }));
}
