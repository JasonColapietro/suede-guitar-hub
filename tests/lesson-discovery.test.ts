import test from "node:test";
import assert from "node:assert/strict";
import { lessonFilters, type LessonFilter } from "../lib/learning/lesson-filter.ts";
import { browseLessons } from "../lib/learning/library.ts";
import { guitarLessonLevels, searchGuitarLessons } from "../lib/learning/lesson-search.ts";

test("stage choices cover every lesson once and retain curriculum order", () => {
  const all = searchGuitarLessons("all");
  assert.deepEqual(guitarLessonLevels, [...new Set(all.map(lesson => lesson.levelName))]);
  const byStage = guitarLessonLevels.flatMap(level => searchGuitarLessons("all", "", level));
  assert.deepEqual(byStage.map(lesson => lesson.id), all.map(lesson => lesson.id));
});

test("the lazy library and server library agree when type, query and stage are combined", () => {
  for (const filter of Object.keys(lessonFilters) as LessonFilter[]) {
    for (const level of ["", ...guitarLessonLevels]) {
      for (const query of ["", "chord", "oasis", "pentatonic", "no-such-topic"]) {
        assert.deepEqual(
          searchGuitarLessons(filter, query, level).map(lesson => lesson.id),
          browseLessons("guitar", filter, query, level).map(entry => entry.lesson.id),
          `${filter} / ${level} / ${query}`,
        );
      }
    }
  }
});

test("song search narrows within a collection and broadens without discarding the query", () => {
  const oasis = searchGuitarLessons("songs", "oasis", "Popular Song Companions");
  assert.equal(oasis.length, 2);
  assert.ok(oasis.every(lesson => lesson.type === "song" && lesson.title.includes("Oasis")));
  assert.deepEqual(searchGuitarLessons("songs", "oasis", "Sound Check"), []);
  assert.deepEqual(searchGuitarLessons("all", "oasis").map(lesson => lesson.id), oasis.map(lesson => lesson.id));
});

test("stage filtering keeps word normalization and microphone constraints intact", () => {
  const query = searchGuitarLessons("microphone", " ÓASIS  ", "Popular Song Companions");
  assert.equal(query.length, 2);
  assert.ok(query.every(lesson => lesson.mic && lesson.levelName === "Popular Song Companions"));
  assert.deepEqual(searchGuitarLessons("microphone", "", "Barre Line"), []);
  assert.deepEqual(searchGuitarLessons("all", "", "not-a-stage"), []);
  assert.deepEqual(searchGuitarLessons("all", "no-such-topic", "Sound Check"), []);
});
