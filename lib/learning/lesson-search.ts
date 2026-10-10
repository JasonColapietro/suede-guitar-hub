/**
 * The guitar lesson search, loaded on demand: LessonLibrary imports this
 * module dynamically when the search panel opens, so the titles and summaries
 * it searches never ride in the learning path's first-load JavaScript.
 */
import index from "./data/lesson-search-guitar.json" with { type: "json" };
import { guidedLessonIds } from "./instruction-index.ts";
import type { LessonSearchEntry, LessonSearchIndex } from "./catalog.ts";
import { lessonMatcher, type LessonFilter } from "./lesson-filter.ts";

const guided = new Set(guidedLessonIds);
const lessons = (index as unknown as LessonSearchIndex).lessons.map(lesson => ({ ...lesson, isGuided: guided.has(lesson.id) }));

export type SearchResult = LessonSearchEntry & { isGuided: boolean };
export function searchGuitarLessons(filter: LessonFilter = "guided", query = ""): SearchResult[] {
  return lessons.filter(lessonMatcher(filter, query));
}
