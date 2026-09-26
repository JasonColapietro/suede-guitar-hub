import type { ToneLesson, ToneModule, ToneModuleId } from "./types.ts";
import { PICKUPS } from "./modules/pickups.ts";
import { AMPS } from "./modules/amps.ts";
import { PEDALS } from "./modules/pedals.ts";
import { SIGNAL_CHAIN } from "./modules/signal-chain.ts";
import { POWER } from "./modules/power.ts";
import { RECORDING } from "./modules/recording.ts";
import { RECIPES } from "./modules/recipes.ts";

export type { ToneLesson, ToneModule, ToneModuleId } from "./types.ts";

/**
 * The tone course, in teaching order: the source (pickups), the voice (amps),
 * the colour (pedals), how they connect (signal chain), what keeps them quiet
 * (power), how to capture the result (recording), and the sounds you can build
 * from all of it (recipes).
 */
export const TONE_MODULES: readonly ToneModule[] = [PICKUPS, AMPS, PEDALS, SIGNAL_CHAIN, POWER, RECORDING, RECIPES];

/** Every lesson in course order. */
export const TONE_LESSONS: readonly ToneLesson[] = TONE_MODULES.flatMap(part => part.lessons);

export const toneLessonHref = (id: string) => `/tone/${id}`;

export function getToneLesson(id: string): ToneLesson | undefined {
  return TONE_LESSONS.find(lesson => lesson.id === id);
}

export function toneModule(id: ToneModuleId): ToneModule {
  const found = TONE_MODULES.find(part => part.id === id);
  if (!found) throw new Error(`Unknown tone module ${id}`);
  return found;
}

/** Total reading and exercise time, in minutes. */
export const TONE_COURSE_MINUTES = TONE_LESSONS.reduce((total, lesson) => total + lesson.minutes, 0);
