/**
 * Tempo ladder generation.
 *
 * Pure, deterministic, and dependency-free: no React, no `window`, no DOM. Node
 * runs this file directly under `--experimental-strip-types`, so every rule the
 * tool enforces is testable without a browser.
 *
 * The shape of a ladder is not a straight line. Three things make tempo work
 * hold, and all three are generated here rather than left to the player:
 *
 *   1. A step ceiling. Each increase is capped near a fixed proportion of the
 *      tempo you are leaving, so the same ladder is gentle at 60 BPM and still
 *      makes real progress at 200.
 *   2. Hold rungs. A session that repeats the previous tempo instead of adding
 *      to it. The tempo you can only reach once is not a tempo you own.
 *   3. Back-off rungs. A session that drops below the last tempo reached and
 *      climbs back through the rungs already passed. Re-covering ground is what
 *      turns a top speed into a floor.
 *
 * Errors are returned, never thrown. The caller is a form handler that has to
 * put a sentence on screen and often a one-tap correction next to it, so the
 * result type carries the suggested fix alongside the message.
 */

/** localStorage key. Bump the version when the stored shape changes. */
export const TEMPO_STORAGE_KEY = "guitarhub.tempo.v1";

/** Slowest tempo a metronome is useful at for passage work. */
export const BPM_MIN = 30;
/** Fastest tempo this tool will build toward. */
export const BPM_MAX = 300;
/** A ladder shorter than this cannot hold a baseline, a climb and a back-off. */
export const MIN_SESSIONS = 4;
/** Past this, a ladder stops being a plan and becomes a calendar. */
export const MAX_SESSIONS = 24;

/** A step is capped near this share of the tempo being left behind. */
const SAFE_STEP_RATIO = 0.08;
/** Below this the proportional cap would round to nothing. */
const MIN_STEP_BPM = 2;
/** Above this a single step stops being one adjustment. */
const MAX_STEP_BPM = 10;
/**
 * The narrowest gap worth a ladder: two climbs of the smallest step a rung is
 * allowed to take. Anything under `MIN_STEP_BPM` sits inside your own timing
 * noise, so a gap that cannot hold two of them is not a ladder, it is a nudge.
 * Derived rather than typed, so it cannot drift away from the step floor.
 */
export const MIN_GAP_BPM = 2 * MIN_STEP_BPM;
/** Loop guard. Every safe step moves at least MIN_STEP_BPM, so this is slack. */
const STEP_GUARD = 400;

/**
 * How far a rung may be nudged toward a rounder metronome number, as a share of
 * the step size at that tempo. Small enough that the ladder keeps its spacing.
 */
const BEAUTIFY_RATIO = 0.4;

/** Penalty added to a candidate's distance score, by how round the number is. */
const MULTIPLE_OF_FIVE_PENALTY = 0;
const MULTIPLE_OF_TWO_PENALTY = 0.7;
const ODD_NUMBER_PENALTY = 1.4;

export type TempoRungKind = "baseline" | "climb" | "hold" | "backoff" | "target";

export type TempoRung = {
  id: string;
  /** 1-indexed session number. Every rung is one practice session. */
  session: number;
  kind: TempoRungKind;
  bpm: number;
  /** Back-off rungs only: the tempo you walk back up to inside the session. */
  returnBpm: number | null;
  label: string;
  instruction: string;
  passCondition: string;
};

export type TempoInput = {
  currentBpm: number;
  targetBpm: number;
  sessions: number;
};

export type TempoLadder = {
  currentBpm: number;
  targetBpm: number;
  sessions: number;
  climbCount: number;
  holdCount: number;
  backoffCount: number;
  /** The largest single increase anywhere in the ladder. */
  largestStepBpm: number;
  rungs: TempoRung[];
  summary: string;
};

export type TempoErrorCode =
  | "current-not-a-number"
  | "current-out-of-range"
  | "target-not-a-number"
  | "target-out-of-range"
  | "target-not-above-current"
  | "gap-too-small"
  | "gap-too-wide"
  | "sessions-not-a-number"
  | "sessions-out-of-range"
  | "sessions-too-few"
  | "sessions-too-many";

export type TempoLadderError = {
  code: TempoErrorCode;
  /** Written as copy. The UI renders it verbatim. */
  message: string;
  /** Set for "sessions-too-few" and "sessions-too-many": a count that works. */
  suggestedSessions?: number;
  /** Set for "gap-too-wide": an interim target the first ladder can reach. */
  suggestedTarget?: number;
};

export type TempoLadderResult =
  | { ok: true; value: TempoLadder }
  | { ok: false; error: TempoLadderError };

export type StoredTempoState = {
  input: TempoInput;
  completedRungIds: string[];
};

/* ------------------------------------------------------------------ *
 * Step sizing
 * ------------------------------------------------------------------ */

/** Pin a number into the playable range. Fractions round to the nearest BPM. */
export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return BPM_MIN;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
}

/**
 * The largest increase allowed when leaving `bpm`. Proportional in the middle,
 * with a floor so slow ladders still move and a ceiling so fast ones stay
 * honest.
 */
export function safeStepBpm(bpm: number): number {
  const proportional = Math.round(bpm * SAFE_STEP_RATIO);
  return Math.min(MAX_STEP_BPM, Math.max(MIN_STEP_BPM, proportional));
}

/** The fewest increases that can cover the gap without breaking the cap. */
function minimumClimbSteps(currentBpm: number, targetBpm: number): number {
  let bpm = currentBpm;
  let steps = 0;
  while (bpm < targetBpm && steps < STEP_GUARD) {
    bpm = Math.min(targetBpm, bpm + safeStepBpm(bpm));
    steps += 1;
  }
  return steps;
}

/** The tempo reachable in `steps` maximum-size steps. Used to suggest a target. */
function reachableBpm(currentBpm: number, steps: number): number {
  let bpm = currentBpm;
  for (let i = 0; i < steps && bpm < BPM_MAX; i += 1) {
    bpm = Math.min(BPM_MAX, bpm + safeStepBpm(bpm));
  }
  return bpm;
}

/* ------------------------------------------------------------------ *
 * Ladder shape
 * ------------------------------------------------------------------ */

type LadderLayout = {
  climbCount: number;
  holdCount: number;
  backoffCount: number;
};

/**
 * Split a session budget into climbs, holds and back-offs, or return null when
 * that budget cannot produce a ladder worth running.
 *
 * Feasibility fails in exactly two directions, which is what lets
 * `minimumSessions` and `maximumSessions` find the ends by scanning: too few
 * sessions cannot cover the gap inside the step cap, and too many leave more
 * holds than there are climbs to hold onto.
 */
function layoutFor(
  currentBpm: number,
  targetBpm: number,
  sessions: number,
): LadderLayout | null {
  // Every caller below is exported, and `sessionOptions`, `minimumSessions` and
  // `recommendedSessions` are all reachable from a half-typed form field. NaN
  // fails every comparison in this function, so without this guard the layout
  // falls through and comes back full of NaN instead of null.
  if (
    !Number.isInteger(currentBpm) ||
    !Number.isInteger(targetBpm) ||
    !Number.isInteger(sessions)
  ) {
    return null;
  }

  const bodyLength = sessions - 1;
  if (bodyLength < 3) return null;

  const gap = targetBpm - currentBpm;
  const backoffCount = Math.min(3, Math.max(1, Math.floor(bodyLength / 5)));
  const budget = bodyLength - backoffCount;
  const required = minimumClimbSteps(currentBpm, targetBpm);
  // No more climbs than the gap can give each of them a real step. Dividing by
  // the whole BPM instead would allow a ladder of 1 BPM climbs, which is the
  // same timing noise `MIN_GAP_BPM` refuses at the entrance.
  const maxClimbs = Math.min(budget, Math.floor(gap / MIN_STEP_BPM));

  if (required > maxClimbs) return null;

  const climbCount = Math.max(
    required,
    Math.min(maxClimbs, Math.ceil(budget * 0.75)),
  );
  const holdCount = budget - climbCount;

  if (climbCount < 2) return null;
  // Every insert sits after one of the non-final climbs, two deep at most.
  if (holdCount + backoffCount > 2 * (climbCount - 1)) return null;

  return { climbCount, holdCount, backoffCount };
}

/** The shortest ladder that covers this gap safely, or null if none does. */
export function minimumSessions(
  currentBpm: number,
  targetBpm: number,
): number | null {
  for (let sessions = MIN_SESSIONS; sessions <= MAX_SESSIONS; sessions += 1) {
    if (layoutFor(currentBpm, targetBpm, sessions)) return sessions;
  }
  return null;
}

/** The longest ladder still worth running for this gap, or null if none is. */
export function maximumSessions(
  currentBpm: number,
  targetBpm: number,
): number | null {
  for (let sessions = MAX_SESSIONS; sessions >= MIN_SESSIONS; sessions -= 1) {
    if (layoutFor(currentBpm, targetBpm, sessions)) return sessions;
  }
  return null;
}

/** Every session count that builds a ladder for this gap, ascending. */
export function sessionOptions(
  currentBpm: number,
  targetBpm: number,
): number[] {
  const lowest = minimumSessions(currentBpm, targetBpm);
  const highest = maximumSessions(currentBpm, targetBpm);
  if (lowest === null || highest === null) return [];

  const options: number[] = [];
  for (let sessions = lowest; sessions <= highest; sessions += 1) {
    options.push(sessions);
  }
  return options;
}

/**
 * A default that leaves room for holds instead of running the ladder at its
 * safety limit from the first session.
 */
export function recommendedSessions(
  currentBpm: number,
  targetBpm: number,
): number | null {
  const lowest = minimumSessions(currentBpm, targetBpm);
  const highest = maximumSessions(currentBpm, targetBpm);
  if (lowest === null || highest === null) return null;
  return Math.min(highest, Math.max(lowest, Math.round(lowest * 1.4)));
}

/* ------------------------------------------------------------------ *
 * Tempo selection
 * ------------------------------------------------------------------ */

function roundnessPenalty(value: number): number {
  if (value % 5 === 0) return MULTIPLE_OF_FIVE_PENALTY;
  if (value % 2 === 0) return MULTIPLE_OF_TWO_PENALTY;
  return ODD_NUMBER_PENALTY;
}

/**
 * The best whole tempo strictly between two rungs: near the midpoint, and on a
 * metronome number where that costs little. Null when the two rungs are
 * adjacent.
 *
 * Splitting a segment can never break the step cap. Both halves are smaller
 * than the original, and `safeStepBpm` never shrinks as the tempo rises, so a
 * step that was legal from the lower rung stays legal from the split point.
 */
function splitPoint(lower: number, upper: number): number | null {
  const midpoint = (lower + upper) / 2;
  let best: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let value = lower + 1; value < upper; value += 1) {
    const score = Math.abs(value - midpoint) + roundnessPenalty(value);
    if (score < bestScore) {
      best = value;
      bestScore = score;
    }
  }

  return best;
}

/**
 * The same choice as `splitPoint`, but refusing any value that would leave an
 * illegal step on either side. Used where both neighbours are fixed.
 */
function legalSplitPoint(lower: number, upper: number): number | null {
  const midpoint = (lower + upper) / 2;
  const reach = safeStepBpm(lower);
  let best: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let value = lower + 1; value < upper; value += 1) {
    if (value - lower > reach) break;
    if (upper - value > safeStepBpm(value)) continue;

    const score = Math.abs(value - midpoint) + roundnessPenalty(value);
    if (score < bestScore) {
      best = value;
      bestScore = score;
    }
  }

  return best;
}

/**
 * The fewest rungs that reach the target, each taking the largest safe step.
 *
 * The last step is whatever is left over, which regularly leaves something like
 * "climb to 89, then target 90". When that happens the rung below the target is
 * re-placed so the final two steps share the remaining distance instead.
 */
function greedyClimb(currentBpm: number, targetBpm: number): number[] {
  const path: number[] = [];
  let bpm = currentBpm;
  while (bpm < targetBpm && path.length < STEP_GUARD) {
    bpm = Math.min(targetBpm, bpm + safeStepBpm(bpm));
    path.push(bpm);
  }

  if (path.length >= 2) {
    const last = path.length - 1;
    const anchor = last >= 2 ? path[last - 2] : currentBpm;
    const finalSpan = path[last] - path[last - 1];
    const previousSpan = path[last - 1] - anchor;

    if (finalSpan * 2 < previousSpan) {
      const levelled = legalSplitPoint(anchor, targetBpm);
      if (levelled !== null) path[last - 1] = levelled;
    }
  }

  return path;
}

/** Subdivide the greedy path until it has exactly `climbCount` rungs. */
function expandClimb(
  currentBpm: number,
  targetBpm: number,
  climbCount: number,
): number[] {
  const path = greedyClimb(currentBpm, targetBpm);

  while (path.length < climbCount) {
    let widestIndex = -1;
    let widestSpan = 1;

    for (let index = 0; index < path.length; index += 1) {
      const lower = index === 0 ? currentBpm : path[index - 1];
      const span = path[index] - lower;
      if (span > widestSpan) {
        widestSpan = span;
        widestIndex = index;
      }
    }

    if (widestIndex === -1) break;

    const lower = widestIndex === 0 ? currentBpm : path[widestIndex - 1];
    const point = splitPoint(lower, path[widestIndex]);
    if (point === null) break;

    path.splice(widestIndex, 0, point);
  }

  return path;
}

/**
 * Nudge interior rungs onto rounder metronome numbers.
 *
 * The final rung is the target and never moves. Three guards keep the pass from
 * buying a round number at the ladder's expense: the step cap is rechecked
 * against both neighbours, the move is limited to a fraction of a step, and a
 * candidate is rejected unless it leaves the smaller of its two adjacent steps
 * at least as large as before. Without that last rule the pass happily turns a
 * balanced 70-73-76 into 70-75-76, where the 1 BPM step is not a session.
 */
function beautifyClimb(path: number[], currentBpm: number): number[] {
  const tuned = [...path];

  for (let index = 0; index < tuned.length - 1; index += 1) {
    const lower = index === 0 ? currentBpm : tuned[index - 1];
    const upper = tuned[index + 1];
    const original = tuned[index];
    const reach = Math.max(2, Math.round(safeStepBpm(original) * BEAUTIFY_RATIO));
    const balance = Math.min(original - lower, upper - original);

    let best = original;
    let bestRank = roundnessPenalty(original);
    let bestDistance = 0;

    for (
      let value = Math.max(lower + 1, original - reach);
      value <= Math.min(upper - 1, original + reach);
      value += 1
    ) {
      if (value - lower > safeStepBpm(lower)) continue;
      if (upper - value > safeStepBpm(value)) continue;
      if (Math.min(value - lower, upper - value) < balance) continue;

      const rank = roundnessPenalty(value);
      const distance = Math.abs(value - original);
      if (rank < bestRank || (rank === bestRank && distance < bestDistance)) {
        best = value;
        bestRank = rank;
        bestDistance = distance;
      }
    }

    tuned[index] = best;
  }

  return tuned;
}

/* ------------------------------------------------------------------ *
 * Rung copy
 * ------------------------------------------------------------------ */

const CLIMB_INSTRUCTIONS = [
  (bpm: number, previous: number) =>
    `Set the metronome to ${bpm}. Play one slow pass at ${previous} first so your hands know the shape, then take it here.`,
  (bpm: number) =>
    `${bpm}. Start with the hardest bar on its own, then run the whole passage without stopping at the mistake.`,
  (bpm: number) =>
    `${bpm}. Count two full bars in before the first note so the tempo is set, not guessed.`,
];

function plural(count: number, singular: string, many: string): string {
  return `${count} ${count === 1 ? singular : many}`;
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

function buildRungs(
  currentBpm: number,
  climbs: number[],
  holdsAt: number[],
  backoffsAt: number[],
): TempoRung[] {
  const rungs: TempoRung[] = [];

  const push = (rung: Omit<TempoRung, "id" | "session">) => {
    const session = rungs.length + 1;
    rungs.push({ ...rung, id: `${rung.kind}-${session}-${rung.bpm}`, session });
  };

  push({
    kind: "baseline",
    bpm: currentBpm,
    returnBpm: null,
    label: `Baseline: ${currentBpm} BPM`,
    instruction: `Play the passage at ${currentBpm} with the metronome on and no stopping. This is the tempo you already own, so treat it as a measurement, not a warm-up.`,
    passCondition: `Three passes in a row with no missed notes and no rushing. If you cannot get three, your real baseline is lower: drop 4 BPM and build the ladder from there.`,
  });

  for (let index = 0; index < climbs.length; index += 1) {
    const bpm = climbs[index];
    const previous = index === 0 ? currentBpm : climbs[index - 1];
    const isTarget = index === climbs.length - 1;

    if (isTarget) {
      push({
        kind: "target",
        bpm,
        returnBpm: null,
        label: `Target: ${bpm} BPM`,
        instruction: `${bpm}, whole passage, in context. Play what comes before it and what comes after it, so the tempo has to survive an entrance and an exit.`,
        passCondition: `Three clean passes at ${bpm}, then one recorded pass you would let another player hear.`,
      });
    } else {
      const write = CLIMB_INSTRUCTIONS[index % CLIMB_INSTRUCTIONS.length];
      push({
        kind: "climb",
        bpm,
        returnBpm: null,
        label: `Climb to ${bpm} BPM`,
        instruction: write(bpm, previous),
        passCondition: `Three clean passes in a row before the next session moves up. A pass you recovered from is not a clean pass.`,
      });
    }

    const slot = index + 1;
    if (slot > climbs.length - 1) continue;

    for (let hold = 0; hold < holdsAt[slot]; hold += 1) {
      push({
        kind: "hold",
        bpm,
        returnBpm: null,
        label: `Hold at ${bpm} BPM`,
        instruction: `Stay at ${bpm}. Nothing new this session: same passage, same tempo, more repetitions. Reaching a tempo once and holding it are different skills.`,
        passCondition: `Five clean passes across the session, and the fifth should cost less than the first. If it does not, hold here again.`,
      });
    }

    for (let backoff = 0; backoff < backoffsAt[slot]; backoff += 1) {
      const dropIndex = index - 2;
      const dropBpm = dropIndex < 0 ? currentBpm : climbs[dropIndex];
      // Rungs strictly between the drop and the return, which are the stops the
      // instruction sends you through. `allocateSlots` keeps back-offs off the
      // first slot wherever the ladder is long enough to have a second one; on
      // the shortest ladders there is nothing in between, and the copy has to
      // say what the session actually is rather than name stops that are not
      // there.
      const stops = climbs.filter((rung) => rung > dropBpm && rung < bpm).length;
      push({
        kind: "backoff",
        bpm: dropBpm,
        returnBpm: bpm,
        label: `Back off to ${dropBpm} BPM`,
        instruction:
          stops > 0
            ? `Drop to ${dropBpm} and climb back to ${bpm} inside this one session, stopping at every rung you have already passed. Going back over ground you covered is what turns your top speed into your floor.`
            : `Drop to ${dropBpm} and climb back to ${bpm} inside this one session, both tempos in the same sitting. Reaching ${bpm} from below on demand is what turns your top speed into your floor.`,
        passCondition:
          stops > 0
            ? `One clean pass at every stop on the way up. If a stop fails, that tempo is what the next session works on.`
            : `One clean pass at ${dropBpm}, then one at ${bpm} without a break between them. If the second fails, ${bpm} is what the next session works on.`,
      });
    }
  }

  return rungs;
}

/**
 * Even placement, walking to a neighbouring slot when a slot is full.
 *
 * Holds may sit anywhere. Back-offs take a floor of slot 2, because a back-off
 * in slot 1 drops to the baseline and climbs back to the first rung with
 * nothing in between: that session repeats sessions 1 and 2 in order and calls
 * it new work. Skewing the preferred slot was not enough on its own — the
 * clamp erased the skew on every short ladder — so the floor is applied to the
 * claim itself. On the shortest ladders there is no slot 2 to move to, and
 * `buildRungs` writes that rung different copy instead of promising stops that
 * do not exist.
 */
const BACKOFF_LOWEST_SLOT = 2;

function allocateSlots(
  climbCount: number,
  holdCount: number,
  backoffCount: number,
): { holdsAt: number[]; backoffsAt: number[] } {
  const holdsAt = new Array<number>(climbCount + 1).fill(0);
  const backoffsAt = new Array<number>(climbCount + 1).fill(0);
  const used = new Array<number>(climbCount + 1).fill(0);
  const highest = Math.max(1, climbCount - 1);

  const claim = (preferred: number, floorSlot: number): number => {
    const lowest = Math.min(highest, Math.max(1, floorSlot));
    const anchor = Math.min(highest, Math.max(lowest, preferred));
    for (let distance = 0; distance <= climbCount; distance += 1) {
      const candidates =
        distance === 0 ? [anchor] : [anchor + distance, anchor - distance];
      for (const slot of candidates) {
        if (slot >= lowest && slot <= highest && used[slot] < 2) {
          used[slot] += 1;
          return slot;
        }
      }
    }
    used[highest] += 1;
    return highest;
  };

  for (let index = 0; index < holdCount; index += 1) {
    const preferred = Math.round(((index + 1) * climbCount) / (holdCount + 1));
    holdsAt[claim(preferred, 1)] += 1;
  }

  // Skewed one slot later than the holds: a back-off only means something once
  // there are rungs below the current one to climb back through.
  for (let index = 0; index < backoffCount; index += 1) {
    const preferred = Math.round(
      ((index + 1) * (climbCount + 1)) / (backoffCount + 1),
    );
    backoffsAt[claim(preferred, BACKOFF_LOWEST_SLOT)] += 1;
  }

  return { holdsAt, backoffsAt };
}

/* ------------------------------------------------------------------ *
 * Validation and the public entry point
 * ------------------------------------------------------------------ */

function fail(
  code: TempoErrorCode,
  message: string,
  extra?: { suggestedSessions?: number; suggestedTarget?: number },
): TempoLadderResult {
  return { ok: false, error: { code, message, ...extra } };
}

function wholeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/**
 * Build a ladder, or explain exactly why the numbers cannot make one.
 *
 * Takes `unknown` because the same function validates a restored localStorage
 * payload. Nothing downstream trusts a field it did not narrow here.
 */
export function buildTempoLadder(input: unknown): TempoLadderResult {
  if (!input || typeof input !== "object") {
    return fail(
      "current-not-a-number",
      "Enter your current clean tempo and a target tempo in beats per minute.",
    );
  }

  const record = input as Record<string, unknown>;
  const currentBpm = wholeNumber(record.currentBpm);
  const targetBpm = wholeNumber(record.targetBpm);
  const sessions = wholeNumber(record.sessions);

  if (currentBpm === null) {
    return fail(
      "current-not-a-number",
      "Enter your current clean tempo as a whole number of beats per minute.",
    );
  }
  if (currentBpm < BPM_MIN || currentBpm > BPM_MAX) {
    return fail(
      "current-out-of-range",
      `Your current tempo has to sit between ${BPM_MIN} and ${BPM_MAX} BPM.`,
    );
  }
  if (targetBpm === null) {
    return fail(
      "target-not-a-number",
      "Enter your target tempo as a whole number of beats per minute.",
    );
  }
  if (targetBpm < BPM_MIN || targetBpm > BPM_MAX) {
    return fail(
      "target-out-of-range",
      `Your target tempo has to sit between ${BPM_MIN} and ${BPM_MAX} BPM.`,
    );
  }
  if (targetBpm === currentBpm) {
    return fail(
      "target-not-above-current",
      "Your target is the tempo you already play cleanly. Pick a target above it.",
    );
  }
  if (targetBpm < currentBpm) {
    return fail(
      "target-not-above-current",
      "Your target is below your current clean tempo. A ladder climbs, so set the higher number as the target.",
    );
  }
  if (targetBpm - currentBpm < MIN_GAP_BPM) {
    return fail(
      "gap-too-small",
      `A gap under ${MIN_GAP_BPM} BPM sits inside your own timing noise. Aim at least ${MIN_GAP_BPM} BPM above your clean tempo.`,
    );
  }
  if (sessions === null) {
    return fail(
      "sessions-not-a-number",
      "Choose how many practice sessions the ladder should take.",
    );
  }
  if (sessions < MIN_SESSIONS || sessions > MAX_SESSIONS) {
    return fail(
      "sessions-out-of-range",
      `A ladder runs between ${MIN_SESSIONS} and ${MAX_SESSIONS} sessions.`,
    );
  }

  const layout = layoutFor(currentBpm, targetBpm, sessions);

  if (!layout) {
    const lowest = minimumSessions(currentBpm, targetBpm);
    const highest = maximumSessions(currentBpm, targetBpm);

    if (lowest === null || highest === null) {
      const bodyLength = MAX_SESSIONS - 1;
      const reachable = reachableBpm(currentBpm, bodyLength - 3);
      const suggestedTarget = clampBpm(Math.floor(reachable / 5) * 5);
      return fail(
        "gap-too-wide",
        `${targetBpm} BPM is further than one ladder should reach from ${currentBpm}. Build the first ladder to ${suggestedTarget}, prove it, then start the next one from there.`,
        { suggestedTarget },
      );
    }
    if (sessions < lowest) {
      return fail(
        "sessions-too-few",
        `${sessions} sessions would force steps bigger than your hands can absorb. This gap needs at least ${lowest}.`,
        { suggestedSessions: lowest },
      );
    }
    return fail(
      "sessions-too-many",
      `${targetBpm - currentBpm} BPM does not need ${sessions} sessions. ${highest} is as long as this ladder should run.`,
      { suggestedSessions: highest },
    );
  }

  const climbs = beautifyClimb(
    expandClimb(currentBpm, targetBpm, layout.climbCount),
    currentBpm,
  );
  const { holdsAt, backoffsAt } = allocateSlots(
    layout.climbCount,
    layout.holdCount,
    layout.backoffCount,
  );
  const rungs = buildRungs(currentBpm, climbs, holdsAt, backoffsAt);

  let largestStepBpm = 0;
  let previous = currentBpm;
  for (const bpm of climbs) {
    largestStepBpm = Math.max(largestStepBpm, bpm - previous);
    previous = bpm;
  }

  const summary = `${sessions} sessions from ${currentBpm} to ${targetBpm} BPM: ${plural(layout.climbCount, "climb", "climbs")}, ${plural(layout.holdCount, "hold", "holds")}, ${plural(layout.backoffCount, "back-off", "back-offs")}, and no single step larger than ${largestStepBpm} BPM.`;

  return {
    ok: true,
    value: {
      currentBpm,
      targetBpm,
      sessions,
      climbCount: layout.climbCount,
      holdCount: layout.holdCount,
      backoffCount: layout.backoffCount,
      largestStepBpm,
      rungs,
      summary,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

function rungIds(ladder: TempoLadder): Set<string> {
  return new Set(ladder.rungs.map((rung) => rung.id));
}

/** Drop duplicates and anything that is not a rung of this ladder. */
export function normalizeTempoProgress(
  ladder: TempoLadder,
  candidate: unknown,
): string[] {
  if (!Array.isArray(candidate)) return [];
  const recognized = rungIds(ladder);
  return [
    ...new Set(
      candidate.filter(
        (id): id is string => typeof id === "string" && recognized.has(id),
      ),
    ),
  ];
}

/** Whole-number percentage of the ladder's sessions marked done. */
export function tempoProgressPercent(
  ladder: TempoLadder,
  candidate: unknown,
): number {
  const done = normalizeTempoProgress(ladder, candidate).length;
  if (ladder.rungs.length === 0) return 0;
  return Math.round((done / ladder.rungs.length) * 100);
}

/**
 * Validate a restored payload by rebuilding from it. `buildTempoLadder` is the
 * only definition of a valid input, so there is no second one to drift.
 */
export function restoreTempoState(candidate: unknown): StoredTempoState | null {
  if (!candidate || typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;
  if (!record.input || typeof record.input !== "object") return null;

  const inputRecord = record.input as Record<string, unknown>;
  const input = {
    currentBpm: inputRecord.currentBpm,
    targetBpm: inputRecord.targetBpm,
    sessions: inputRecord.sessions,
  } as TempoInput;

  const result = buildTempoLadder(input);
  if (!result.ok) return null;

  return {
    input,
    completedRungIds: normalizeTempoProgress(
      result.value,
      record.completedRungIds,
    ),
  };
}
