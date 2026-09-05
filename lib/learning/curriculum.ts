import guitar from "./data/guitar.json" with { type: "json" };
import voice from "./data/voice.json" with { type: "json" };
import { validateCurriculum, type TrackId } from "./models.ts";
export type { TrackId, PracticeSpec, Lesson, LearningModule, LearningLevel, Curriculum } from "./models.ts";

export const curricula = {
  guitar: validateCurriculum(guitar, "guitar"),
  voice: validateCurriculum(voice, "voice"),
};
export const trackNames = { guitar: "Guitar", voice: "Voice" } as const;
export function isTrackId(value: string): value is TrackId { return value === "guitar" || value === "voice"; }
export function allLessons(track: TrackId) {
  return curricula[track].levels.flatMap((level) => level.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module, level }))));
}
/** Web has no StoreKit entitlement bridge. Paid lessons remain previews. */
export function isModuleAvailable(track: TrackId, moduleId: string) { return moduleId === curricula[track].levels[0].modules[0].id; }
export function availableLessons(track: TrackId) { return allLessons(track).filter(({ module }) => isModuleAvailable(track, module.id)); }
export function getLesson(track: TrackId, lessonId: string) { return allLessons(track).find(({ lesson }) => lesson.id === lessonId); }
export function lessonHref(track: TrackId, lessonId: string) { return `/learn/${track}/${encodeURIComponent(lessonId)}`; }
