import guitar from "./data/guitar.json" with { type: "json" };
import voice from "./data/voice.json" with { type: "json" };
import songGuitar from "./data/song-guitar.json" with { type: "json" };
import { validateCurriculum, type TrackId } from "./models.ts";
export type { TrackId, PracticeSpec, Lesson, LearningModule, LearningLevel, Curriculum } from "./models.ts";

const guitarPath = validateCurriculum(guitar, "guitar");
const songs = validateCurriculum(songGuitar, "guitar");
const insertion = guitarPath.levels.findIndex(level => level.id === "g-l5");
const songInsertion = insertion < 0 ? guitarPath.levels.length : insertion;
export const curricula = {
  guitar: { ...guitarPath, version: Math.max(guitarPath.version, songs.version), levels: [...guitarPath.levels.slice(0, songInsertion), ...songs.levels, ...guitarPath.levels.slice(songInsertion)] },
  voice: validateCurriculum(voice, "voice"),
};
export const trackNames = { guitar: "Guitar", voice: "Voice" } as const;
export function isTrackId(value: string): value is TrackId { return value === "guitar" || value === "voice"; }
export function allLessons(track: TrackId) {
  return curricula[track].levels.flatMap((level) => level.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module, level }))));
}
/**
 * The sampler: the one module every visitor can open regardless of entitlement.
 *
 * This is pinned to `samplerLessonIds` in the iOS-generated
 * `contracts/learning.json` and asserted by tests/learning-parity.test.ts, so
 * its definition is not this repo's to change. For "is this module behind the
 * paywall", use `isFreeModule`.
 */
export function isModuleAvailable(track: TrackId, moduleId: string) { return moduleId === curricula[track].levels[0].modules[0].id; }

/**
 * Whether a module's level is declared free in the curriculum data.
 *
 * `LearningLevel.access` has been in every catalog from the start — `g-l1`,
 * `g-l2`, `v-l1` and `v-l2` are `"free"`, the rest `"paid"` — and nothing read
 * it. The gate was `isModuleAvailable` alone, so exactly one module per track
 * opened and the other nine free-marked modules were paywalled. The data and
 * the code had two different definitions of "free" and the data lost.
 *
 * A level with no `access` field is not free: `g-songs` omits it deliberately
 * and its instruction note places it in the paid guided catalog.
 */
export function isFreeModule(track: TrackId, moduleId: string) {
  return curricula[track].levels.some(
    (level) => level.access === "free" && level.modules.some((module) => module.id === moduleId),
  );
}
export function availableLessons(track: TrackId) { return allLessons(track).filter(({ module }) => isModuleAvailable(track, module.id)); }
export function getLesson(track: TrackId, lessonId: string) { return allLessons(track).find(({ lesson }) => lesson.id === lessonId); }
export function lessonHref(track: TrackId, lessonId: string) { return `/learn/${track}/${encodeURIComponent(lessonId)}`; }
