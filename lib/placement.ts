/**
 * The /start placement: five questions about what a player's hands can do
 * today, and the one starting point the answers point to. Pure data and one
 * pure function, no React and no browser API, so the routing is tested rather
 * than eyeballed.
 *
 * The three destinations are the three entries in `PLAYER_LEVELS`
 * (lib/levels.ts), so the placement can never send a player somewhere the
 * level cards do not also go.
 */
import { PLAYER_LEVELS, type PlayerLevel, type PlayerLevelId } from "./levels.ts";

/** 0 is "not yet", 1 is "partly", 2 is "yes, reliably". */
export type PlacementScore = 0 | 1 | 2;

export const PLACEMENT_QUESTIONS = [
  {
    id: "chords",
    prompt: "Can you play G, C, D and E minor with every string ringing clearly?",
    options: ["Not yet", "Most of them, with a buzz or two", "Yes, without looking"],
  },
  {
    id: "changes",
    prompt: "Can you switch between two open chords and keep a steady strum going?",
    options: ["Not yet", "With a pause before each change", "Yes, at song tempo"],
  },
  {
    id: "barre",
    prompt: "Can you play an F barre chord with every note sounding?",
    options: ["Not yet", "On a good day", "Yes, and I move it up the neck"],
  },
  {
    id: "lead",
    prompt: "Can you improvise a phrase over a blues with the minor pentatonic?",
    options: ["Not yet", "I know the box, but it sounds like a scale", "Yes, in more than one position"],
  },
  {
    id: "song",
    prompt: "Can you play one complete song from start to finish without stopping?",
    options: ["Not yet", "A simple strummed song", "Yes, riffs or solo included"],
  },
] as const satisfies readonly {
  id: string;
  prompt: string;
  options: readonly [string, string, string];
}[];

export type PlacementQuestionId = (typeof PLACEMENT_QUESTIONS)[number]["id"];
export type PlacementAnswers = Record<PlacementQuestionId, PlacementScore>;

/**
 * Where the answers point.
 *
 * The Advanced Lab assumes the barre chord and the pentatonic box are already
 * under the fingers (its level card says so), so it needs a reliable barre, at
 * least the box, and a song played through. Stage 3 assumes chord changes that
 * keep time with the strum, because it builds the other open chords and songs
 * on top of them. Everyone else starts at stage 1, which moves quickly when it
 * is easy.
 */
export function placeLevel(answers: PlacementAnswers): PlayerLevelId {
  if (answers.barre === 2 && answers.lead >= 1 && answers.song >= 1) return "advanced";
  if (answers.chords >= 1 && answers.changes === 2) return "intermediate";
  return "beginner";
}

export function levelById(id: PlayerLevelId): PlayerLevel {
  const level = PLAYER_LEVELS.find((entry) => entry.id === id);
  if (!level) throw new Error(`Unknown player level: ${id}`);
  return level;
}

/** The result card's copy for each destination: what to work on first, and a free step to take today. */
export const PLACEMENT_RESULTS: Record<
  PlayerLevelId,
  { heading: string; firstFocus: string; freeStep: { label: string; href: string } }
> = {
  beginner: {
    heading: "Start at stage 1.",
    firstFocus:
      "Your first job is a clean sound: a tuned guitar, a relaxed fretting hand and one note that rings every time. Stage 2 then adds A and D and your first timed chord changes.",
    freeStep: { label: "Run the free A-to-D chord routine today", href: "/learn/guitar/routine" },
  },
  intermediate: {
    heading: "Jump to stage 3.",
    firstFocus:
      "Your changes keep time, so start where the open chords fill out: all eight open shapes, a capo and any three-chord song. Stage 4 brings single notes and the first scale, and stage 5 is the barre chord and the blues.",
    freeStep: { label: "Build a free 30-day plan around one song", href: "/breakthrough" },
  },
  advanced: {
    heading: "Go straight to the Advanced Lab.",
    firstFocus:
      "Your fundamentals are in place. Pick one drill just below your ceiling, get it clean in Practice mode, then let Play mode tell you when to push the tempo.",
    freeStep: { label: "Find the habit capping your speed in 2 minutes", href: "/diagnose" },
  },
};
