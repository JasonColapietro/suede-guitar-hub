/**
 * What the learning path renders, built on the server.
 *
 * LearningPath is a client component because lesson status, the open stage and
 * the "continue" card follow progress saved in the browser. It used to import
 * the whole curriculum (and the Advanced Lab drills) to draw the page, which
 * shipped every lesson summary, practice target and the voice track to the
 * browser. The page now builds this outline from the server-side curriculum
 * and passes it down: names, titles and the few flags each row shows, keyed by
 * the ids the browser's progress and access checks already use.
 */
import { curricula, type TrackId } from "./curriculum.ts";
import { hasInstructionQuiz } from "./instruction-index.ts";
import { levelForStage } from "../levels.ts";
import { drillHref, getDrill } from "../advanced/drills.ts";
import type { LessonType } from "./models.ts";

export interface PathLesson { id: string; title: string; type: LessonType; minutes: number; mic: boolean; quiz: boolean }
export interface PathModule { id: string; name: string; promise: string; lessons: PathLesson[] }
export interface PathLevel { id: string; stage?: number; name: string; subtitle: string; who?: string; modules: PathModule[]; extras: { href: string; title: string }[] }
export interface PathOutline { track: TrackId; stageCount: number; levels: PathLevel[] }

/**
 * Advanced Lab drills that belong alongside a stage. The path covers the
 * ground in lessons; these add a scored drill where a skill otherwise only
 * appears in passing.
 */
const STAGE_EXTRAS: Record<number, readonly string[]> = {
  2: ["musical-alphabet-low-e"],
  5: ["movable-shape-roots"],
  6: ["every-c", "three-note-legato-g-major"],
  7: ["blues-landing-notes", "funk-sixteenths"],
};

export function learningPathOutline(track: TrackId): PathOutline {
  const levels = curricula[track].levels;
  return {
    track,
    stageCount: levels.filter(level => level.stage).length,
    levels: levels.map(level => ({
      id: level.id,
      ...(level.stage !== undefined ? { stage: level.stage } : {}),
      name: level.name,
      subtitle: level.subtitle,
      ...(level.stage !== undefined && levelForStage(level.stage) ? { who: levelForStage(level.stage)!.label } : {}),
      modules: level.modules.map(module => ({
        id: module.id,
        name: module.name,
        promise: module.promise,
        lessons: module.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, type: lesson.type, minutes: lesson.minutes, mic: !!lesson.practiceSpec, quiz: hasInstructionQuiz(lesson.id) })),
      })),
      extras: (level.stage !== undefined ? STAGE_EXTRAS[level.stage] ?? [] : []).flatMap(id => {
        const drill = getDrill(id);
        return drill ? [{ href: drillHref(id), title: drill.title }] : [];
      }),
    })),
  };
}
