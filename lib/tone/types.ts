/**
 * The shape of the GuitarHub tone course.
 *
 * A course is seven modules; a module is a handful of lessons; a lesson is
 * prose sections, the points worth keeping, one hands-on exercise, and a short
 * check. Everything is plain data so the pages, the tests and the structured
 * data all read the same objects.
 *
 * Copy rules (enforced where a test can, and by review where it cannot):
 * - Original writing. No quoted manuals, no borrowed diagrams.
 * - No claims about a named artist's rig; recipes describe sounds, not people.
 * - Numbers are the conventional, checkable ones (9 V centre-negative, 250k
 *   pots for single coils, 8 ohm loads). When a value varies by product, say
 *   so rather than picking one.
 * - Safety first where it applies: tube amps hold lethal voltages, and a tube
 *   amp must never run without a speaker load.
 */

export type ToneModuleId = "pickups" | "amps" | "pedals" | "signal-chain" | "power" | "recording" | "recipes";

export type ToneSection = {
  heading: string;
  /** Plain-text paragraphs. No markup; the page renders each as a <p>. */
  paragraphs: readonly string[];
};

export type ToneQuestion = {
  q: string;
  /** Two to four answers. */
  options: readonly string[];
  /** Index into `options` of the one correct answer. */
  answer: number;
  /** Why the answer is right, shown after the learner answers. */
  why: string;
};

export type ToneExercise = {
  title: string;
  steps: readonly string[];
  /** Optional GuitarHub tool that helps with the exercise, e.g. "/tools/pedal-lab". */
  tool?: string;
};

/** A tone recipe: a sound described by its settings. Only the recipes module uses these. */
export type ToneRecipe = {
  /** The pedal lab preset id that reproduces it, when there is one. */
  preset?: string;
  guitar: string;
  pickup: string;
  amp: string;
  /** Knob settings as "name: value" pairs on a 0 to 10 scale where that applies. */
  settings: readonly string[];
  pedals: readonly string[];
  hands: string;
};

export type ToneLesson = {
  /** URL slug, unique across the whole course, lowercase-hyphenated. */
  id: string;
  module: ToneModuleId;
  title: string;
  /** One sentence for cards and the meta description, under 160 characters. */
  summary: string;
  minutes: number;
  sections: readonly ToneSection[];
  /** Three to five one-sentence takeaways. */
  keyPoints: readonly string[];
  exercise: ToneExercise;
  /** Two to four questions. */
  quiz: readonly ToneQuestion[];
  recipe?: ToneRecipe;
};

export type ToneModule = {
  id: ToneModuleId;
  title: string;
  /** One sentence. */
  blurb: string;
  lessons: readonly ToneLesson[];
};
