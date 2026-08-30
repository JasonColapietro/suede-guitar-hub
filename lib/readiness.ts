/**
 * Song readiness scoring.
 *
 * Pure, deterministic, and free of React and browser APIs so it runs directly
 * under `node --test`. The client component owns state, DOM, and the literal
 * localStorage calls; every rule about what a valid song is, what a score
 * means, and what to do next lives here.
 *
 * The model: ten checks a player can answer honestly with yes or no, weighted
 * so that the two failures which end a performance outright carry more than any
 * other single check. The score is a checklist total, not a
 * measurement of playing — the copy on /readiness says so, and so does the
 * band summary at the top of the range.
 */

export type ReadinessCriterionId =
  | "cold-start"
  | "mistake-recovery"
  | "full-tempo"
  | "form-from-memory"
  | "twice-in-a-row"
  | "recorded-and-heard"
  | "played-for-someone"
  | "standing"
  | "clean-ending"
  | "any-section";

export type ReadinessCriterion = {
  id: ReadinessCriterionId;
  /** The checkbox label. Written so that "yes" is a fact, not a feeling. */
  label: string;
  /** One sentence on what the check is actually testing. */
  detail: string;
  /** Share of the score. Higher means a failure here costs more. */
  weight: number;
  /** What to do about it, concrete enough to run in one session. */
  instruction: string;
};

export type ReadinessBandId =
  | "practice-room"
  | "good-day"
  | "nearly-there"
  | "stage-ready";

export type ReadinessBand = {
  id: ReadinessBandId;
  label: string;
  /** Lowest score that falls in this band. */
  min: number;
  summary: string;
};

export type ReadinessAssessment = {
  /** 0-100, rounded. */
  score: number;
  earnedWeight: number;
  totalWeight: number;
  band: ReadinessBand;
  /** The recognized checks, deduped and in criteria order. */
  checkedIds: ReadinessCriterionId[];
  /** The heaviest unchecked criterion, or null when nothing is left. */
  nextAction: ReadinessCriterion | null;
};

export type ReadinessSong = {
  id: string;
  name: string;
  checkedIds: ReadinessCriterionId[];
};

export type RepertoireSummary = {
  songCount: number;
  averageScore: number;
  stageReady: number;
};

export const READINESS_STORAGE_KEY = "guitarhub.readiness.v1";

/** How many songs the browser-local tracker will hold. */
export const MAX_SONGS = 12;

/** Longest song name kept. Anything past this is cut, not rejected. */
export const MAX_SONG_NAME = 80;

/**
 * Order is priority order within a weight tier: when two unchecked criteria
 * carry the same weight, the earlier one is offered as the next action.
 */
export const READINESS_CRITERIA: readonly ReadinessCriterion[] = [
  {
    id: "cold-start",
    label: "You can start it cold, with no warm-up, and the opening holds.",
    detail:
      "Almost every real performance starts cold. A song that needs ten minutes of warm-up first is a song you can only play second.",
    weight: 3,
    instruction:
      "Tomorrow, before you play anything else, pick the guitar up and run the first section once. No warm-up, no second attempt. Whatever comes out is the honest starting point for this song.",
  },
  {
    id: "mistake-recovery",
    label: "When you make a mistake, you keep playing instead of stopping.",
    detail:
      "Stopping is a habit you rehearse. If every practice repetition ends at the error, the ending is what you have trained.",
    weight: 3,
    instruction:
      "Play it through once and finish no matter what breaks. Then play it again and fumble a chord on purpose, keeping the beat straight through it. The goal is to make carrying on the automatic response.",
  },
  {
    id: "full-tempo",
    label: "You can play it at the real tempo, not only your practice tempo.",
    detail:
      "Practice tempo and song tempo drift apart quietly, because nothing in the room is holding you to the faster one.",
    weight: 2,
    instruction:
      "Play it once against the recording or a metronome set to the actual tempo. Write down the first bar where you fall behind. That bar is the next thing to work on, not the whole song.",
  },
  {
    id: "form-from-memory",
    label: "You know the form without the tab: section order, repeats, ending.",
    detail:
      "Reading the form and knowing the form feel identical while the page is still open in front of you.",
    weight: 2,
    instruction:
      "Close the tab. Say the section order out loud, start to finish, before you play a note. Then play it that way and see where the map and the song disagree.",
  },
  {
    id: "twice-in-a-row",
    label: "You can play it twice in a row and the second take is not worse.",
    detail:
      "One good take can be luck. Two in a row is the start of a take you can count on.",
    weight: 2,
    instruction:
      "Play it twice back to back with no break in between. If the second one falls apart, the problem is tension or stamina rather than the notes, and the fix is where your hands grip hardest.",
  },
  {
    id: "recorded-and-heard",
    label: "You have recorded it and listened to the whole thing back.",
    detail:
      "Playing and listening use different attention. What you cannot hear while playing is usually obvious on playback.",
    weight: 2,
    instruction:
      "Record one take on your phone and listen to all of it without stopping. Write down the first thing you notice. A voice memo is enough; nothing needs to be uploaded anywhere.",
  },
  {
    id: "played-for-someone",
    label: "You have played it through with at least one person listening.",
    detail:
      "An audience changes your hands before it changes anything else about the performance.",
    weight: 2,
    instruction:
      "Play it for one person this week. One is enough. What matters is that somebody is in the room, you start anyway, and you do not stop to apologise partway through.",
  },
  {
    id: "standing",
    label: "You can play it standing, with the strap where you would wear it.",
    detail:
      "Standing moves the neck angle and reshapes the fretting hand, which is where a clean sitting part often goes sloppy.",
    weight: 1,
    instruction:
      "Stand up, set the strap at the height you would actually use, and run the hardest section four times. Adjust the strap, not your playing, if the reach has changed.",
  },
  {
    id: "clean-ending",
    label: "You can end it on purpose, the same way, twice.",
    detail:
      "Endings get the least practice and the most attention from anyone listening.",
    weight: 1,
    instruction:
      "Decide exactly how the last bar goes: which chord, how long it rings, when you mute it. Practice only the final eight bars until the ending comes out the same twice.",
  },
  {
    id: "any-section",
    label: "You can start from any section, not only from the top.",
    detail:
      "Only being able to start at the beginning is a sign the song is one long chain rather than parts you know.",
    weight: 1,
    instruction:
      "Pick a section from the middle and start there, cold, without running up to it. Do that for three different sections in one sitting.",
  },
];

export const READINESS_TOTAL_WEIGHT = READINESS_CRITERIA.reduce(
  (total, criterion) => total + criterion.weight,
  0,
);

/**
 * Bands are ranges of the 0-100 score, ordered low to high. The boundaries sit
 * between reachable scores, so a single heavy check is what moves a song from
 * one band into the next.
 */
export const READINESS_BANDS: readonly ReadinessBand[] = [
  {
    id: "practice-room",
    label: "Practice-room only",
    min: 0,
    summary:
      "This song works when the conditions are right. Nothing on the list has been tested against pressure yet, so there is no evidence either way about what happens when the conditions change.",
  },
  {
    id: "good-day",
    label: "Good-day only",
    min: 40,
    summary:
      "The notes are there when you are warm and on your own. The checks that are still open are the ones that decide whether it survives a cold start, a mistake, or a listener.",
  },
  {
    id: "nearly-there",
    label: "Nearly there",
    min: 65,
    summary:
      "Most of this holds up outside practice conditions. What is left is the gap between playing a song and performing one, and it is usually two or three specific things rather than a general lack of polish.",
  },
  {
    id: "stage-ready",
    label: "Stage-ready",
    min: 85,
    summary:
      "Every check on this list is either done or nearly done. The list is what this tool can see; it cannot hear your song, so the last test is still a room with someone in it.",
  },
];

const CRITERION_ORDER = new Map<string, number>(
  READINESS_CRITERIA.map((criterion, index) => [criterion.id, index]),
);

function isCriterionId(value: unknown): value is ReadinessCriterionId {
  return typeof value === "string" && CRITERION_ORDER.has(value);
}

/**
 * The funnel every checked-id list passes through. Drops anything the current
 * criteria list does not recognize, drops duplicates, and returns the survivors
 * in criteria order so stored state is canonical and comparable.
 */
export function normalizeCheckedIds(candidate: unknown): ReadinessCriterionId[] {
  if (!Array.isArray(candidate)) return [];
  const recognized = new Set(candidate.filter(isCriterionId));
  return READINESS_CRITERIA.filter((criterion) => recognized.has(criterion.id)).map(
    (criterion) => criterion.id,
  );
}

/** The band a raw 0-100 score falls in. Clamps, and never returns undefined. */
export function bandForScore(score: number): ReadinessBand {
  const clamped = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  let match = READINESS_BANDS[0];
  for (const band of READINESS_BANDS) {
    if (clamped >= band.min) match = band;
  }
  return match;
}

/**
 * The heaviest unchecked criterion, ties broken by list order. Null once every
 * criterion is checked, which is the component's cue to stop giving orders.
 */
export function nextReadinessAction(candidate: unknown): ReadinessCriterion | null {
  const checked = new Set(normalizeCheckedIds(candidate));
  let best: ReadinessCriterion | null = null;
  for (const criterion of READINESS_CRITERIA) {
    if (checked.has(criterion.id)) continue;
    if (!best || criterion.weight > best.weight) best = criterion;
  }
  return best;
}

export function scoreReadiness(candidate: unknown): ReadinessAssessment {
  const checkedIds = normalizeCheckedIds(candidate);
  const checked = new Set(checkedIds);
  const earnedWeight = READINESS_CRITERIA.reduce(
    (total, criterion) => (checked.has(criterion.id) ? total + criterion.weight : total),
    0,
  );
  const score =
    READINESS_TOTAL_WEIGHT === 0
      ? 0
      : Math.round((earnedWeight / READINESS_TOTAL_WEIGHT) * 100);

  return {
    score,
    earnedWeight,
    totalWeight: READINESS_TOTAL_WEIGHT,
    band: bandForScore(score),
    checkedIds,
    nextAction: nextReadinessAction(checkedIds),
  };
}

/**
 * Length-cap first, then strip angle brackets, then trim. Same order as
 * lib/application.ts: capping after stripping would let a long run of brackets
 * buy extra characters past the limit.
 */
function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_SONG_NAME).replace(/[<>]/g, "").trim();
}

/**
 * Ids are derived from the name rather than generated, which keeps this module
 * deterministic (no clock, no randomness) and makes "is this song already in
 * the list" a straight id comparison. Unicode property escapes keep non-Latin
 * titles from slugging down to nothing.
 */
export function songIdFromName(name: string): string {
  return cleanName(name)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48)
    .replace(/-+$/gu, "");
}

/** Throws with a sentence written to be rendered straight into the UI. */
export function createSong(name: string): ReadinessSong {
  const cleaned = cleanName(name);
  if (!cleaned) throw new Error("Name the song you are scoring.");

  const id = songIdFromName(cleaned);
  if (!id) throw new Error("Use a song name with at least one letter or number.");

  return { id, name: cleaned, checkedIds: [] };
}

export function addSong(
  songs: readonly ReadinessSong[],
  name: string,
): ReadinessSong[] {
  const song = createSong(name);

  if (songs.some((existing) => existing.id === song.id)) {
    throw new Error("That song is already in your list.");
  }
  if (songs.length >= MAX_SONGS) {
    throw new Error(
      `This tracker holds ${MAX_SONGS} songs. Remove one before adding another.`,
    );
  }

  return [...songs, song];
}

export function removeSong(
  songs: readonly ReadinessSong[],
  songId: string,
): ReadinessSong[] {
  return songs.filter((song) => song.id !== songId);
}

/**
 * Toggling routes through normalizeCheckedIds, so state can never hold an id
 * the criteria list does not recognize and what gets persisted is already
 * clean. An unrecognized criterionId is a no-op.
 */
export function toggleCriterion(
  songs: readonly ReadinessSong[],
  songId: string,
  criterionId: string,
): ReadinessSong[] {
  return songs.map((song) => {
    if (song.id !== songId) return song;
    const next = song.checkedIds.includes(criterionId as ReadinessCriterionId)
      ? song.checkedIds.filter((id) => id !== criterionId)
      : [...song.checkedIds, criterionId];
    return { ...song, checkedIds: normalizeCheckedIds(next) };
  });
}

/**
 * Restore from parsed localStorage. Returns null when the stored value is not
 * this tool's shape at all (the component's cue to delete the key), and an
 * array otherwise — dropping individual songs that are unusable rather than
 * discarding a whole repertoire over one bad entry.
 */
export function restoreReadinessState(candidate: unknown): ReadinessSong[] | null {
  if (!candidate || typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;
  if (!Array.isArray(record.songs)) return null;

  const songs: ReadinessSong[] = [];
  const seen = new Set<string>();

  for (const entry of record.songs) {
    if (!entry || typeof entry !== "object") continue;

    const songRecord = entry as Record<string, unknown>;
    const name = cleanName(songRecord.name);
    if (!name) continue;

    // The id is derived from the name, never read back from the payload. It is
    // the only identity `addSong` and `removeSong` know, and `addSong` refuses
    // a duplicate by comparing ids — so a stored id that does not match the one
    // this name derives (a hand-edited store, or a future schema that issues
    // real ids) would walk straight past that check and put the same song in
    // the list twice, each copy with its own checklist.
    const id = songIdFromName(name);
    if (!id || seen.has(id)) continue;

    seen.add(id);
    songs.push({ id, name, checkedIds: normalizeCheckedIds(songRecord.checkedIds) });
    if (songs.length >= MAX_SONGS) break;
  }

  return songs;
}

export function summarizeRepertoire(
  songs: readonly ReadinessSong[],
): RepertoireSummary {
  if (songs.length === 0) {
    return { songCount: 0, averageScore: 0, stageReady: 0 };
  }

  const assessments = songs.map((song) => scoreReadiness(song.checkedIds));
  const total = assessments.reduce((sum, assessment) => sum + assessment.score, 0);

  return {
    songCount: songs.length,
    averageScore: Math.round(total / songs.length),
    stageReady: assessments.filter(
      (assessment) => assessment.band.id === "stage-ready",
    ).length,
  };
}
