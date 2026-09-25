/**
 * The three front doors to GuitarHub. Every "where do I start?" surface (the
 * homepage, /start, the lesson path) reads from this list so the level names,
 * stage ranges and destinations cannot drift apart.
 */
export type PlayerLevelId = "beginner" | "intermediate" | "advanced";

export type PlayerLevel = {
  id: PlayerLevelId;
  label: string;
  /** What a player at this level can already do. Written so they recognise themselves. */
  canAlready: string;
  /** What GuitarHub gives them next. */
  next: string;
  /** Curriculum stages this level starts in, inclusive. */
  stages: readonly [number, number];
  href: string;
  cta: string;
};

export const PLAYER_LEVELS: readonly PlayerLevel[] = [
  {
    id: "beginner",
    label: "New to guitar",
    canAlready: "You have a guitar and maybe a chord or two.",
    next: "Hold, tune and pick cleanly, then your first two chords in time.",
    stages: [1, 2],
    href: "/learn/guitar#stage-1",
    cta: "Start at stage 1",
  },
  {
    id: "intermediate",
    label: "Know your open chords",
    canAlready: "You change between open chords and can strum a song through.",
    next: "Scales, alternate picking, barre chords, twelve-bar blues and your first solos.",
    stages: [3, 5],
    href: "/learn/guitar#stage-3",
    cta: "Jump to stage 3",
  },
  {
    id: "advanced",
    label: "Advanced player",
    canAlready: "Barre chords, the pentatonic box and a few solos are already under your fingers.",
    next: "Scored drills for modes, arpeggios, legato, in-tune bends, funk sixteenths and triplet feels.",
    stages: [6, 7],
    href: "/advanced",
    cta: "Open the Advanced Lab",
  },
] as const;

export function levelForStage(stage: number): PlayerLevel | undefined {
  return PLAYER_LEVELS.find(level => stage >= level.stages[0] && stage <= level.stages[1]);
}
