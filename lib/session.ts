/**
 * Practice session allocation.
 *
 * Pure, deterministic, and dependency-free: no React, no `window`, no DOM. Node
 * runs this file directly under `--experimental-strip-types`, so every rule the
 * tool enforces is testable without a browser.
 *
 * The problem this solves is not "divide the time up". It is that the honest
 * division of a short session is not five small pieces — it is two real ones
 * and three blocks that should not have been started. Three things follow from
 * that, and all three are generated here rather than left to the player:
 *
 *   1. Whole minutes that sum to exactly the total. A plan that adds up to 44
 *      of your 45 minutes is a rounding bug wearing a practice plan. The
 *      remainder is distributed explicitly, by largest fractional part, with
 *      ties broken deterministically — never left to float.
 *   2. Minimum viable blocks. Every block has a size below which starting it
 *      costs more than skipping it. A block that lands under its minimum is
 *      dropped and its minutes go to the blocks that survived, which is why a
 *      15-minute session comes back with two blocks rather than five stubs.
 *   3. A lead block that is genuinely the largest. Choosing a focus has to
 *      change the shape of the session, not just its labels, so the block that
 *      repairs the thing you named is guaranteed the biggest share of the time.
 *
 * Errors are returned, never thrown. The caller is a form handler that has to
 * put a sentence on screen and often a one-tap correction next to it, so the
 * result type carries the suggested fix alongside the message.
 */

/** localStorage key. Bump the version when the stored shape changes. */
export const SESSION_STORAGE_KEY = "guitarhub.session.v1";

/** Below this there is no session to plan, only one thing to do. */
export const MIN_SESSION_MINUTES = 5;
/** Past three hours this stops being a session and becomes a day. */
export const MAX_SESSION_MINUTES = 180;

export type SessionFocus =
  | "tempo-ceiling"
  | "memorise"
  | "transition"
  | "upkeep";

export type SessionBlockKind =
  | "warmup"
  | "repair"
  | "tempo"
  | "repertoire"
  | "coldstart";

export type SessionInput = {
  minutes: number;
  focus: SessionFocus;
};

export type SessionBlock = {
  id: string;
  kind: SessionBlockKind;
  /** 1-indexed position in the session. Blocks are run in this order. */
  position: number;
  minutes: number;
  /** Full heading. Changes with the focus for the repair block. */
  name: string;
  /** Two or three words. Used in the summary line and in badges. */
  shortName: string;
  /** Why the block is in the session at all. */
  purpose: string;
  /** What to actually do for those minutes. */
  doThis: string;
};

/**
 * Why a block is not in the session.
 *
 * `under-minimum` is the ordinary case: the block's share of this length came
 * out below the size that makes it worth starting. `funded-lead` is the last
 * resort — the block was at a workable size and was given up anyway, because
 * the only way left to get the lead block to its own minimum was to stop
 * splitting the time with it.
 *
 * The distinction is not decorative. The two cases need different sentences,
 * and collapsing them into one produced a reason that was false: a block
 * dropped to fund the lead was told it could not be afforded, by a session
 * that had just proved it could.
 */
export type DropCause = "under-minimum" | "funded-lead";

export type DroppedBlock = {
  kind: SessionBlockKind;
  name: string;
  cause: DropCause;
  /** Written as copy. The UI renders it verbatim. */
  reason: string;
};

export type SessionPlan = {
  minutes: number;
  focus: SessionFocus;
  focusLabel: string;
  /** The block guaranteed the largest share. Derived from the weights. */
  leadKind: SessionBlockKind;
  blocks: SessionBlock[];
  /** Blocks the total could not afford, with the reason each was left out. */
  dropped: DroppedBlock[];
  summary: string;
};

export type SessionErrorCode =
  | "minutes-not-a-number"
  | "minutes-too-few"
  | "minutes-too-many"
  | "focus-unknown";

export type SessionPlanError = {
  code: SessionErrorCode;
  /** Written as copy. The UI renders it verbatim. */
  message: string;
  /** Set for both range refusals: a length that does build. */
  suggestedMinutes?: number;
};

export type SessionPlanResult =
  | { ok: true; value: SessionPlan }
  | { ok: false; error: SessionPlanError };

export type StoredSessionState = {
  input: SessionInput;
  completedBlockIds: string[];
};

/* ------------------------------------------------------------------ *
 * The blocks
 * ------------------------------------------------------------------ */

/** Session order. Also the tie-break order everywhere below. */
const BLOCK_ORDER: readonly SessionBlockKind[] = [
  "warmup",
  "repair",
  "tempo",
  "repertoire",
  "coldstart",
];

/**
 * The size below which a block is not worth starting.
 *
 * `repair` is deliberately the largest of these, and that is load-bearing
 * rather than editorial. `elevateLead` guarantees the lead block the biggest
 * share by moving single minutes off its nearest rival, and it may only do so
 * while the rival stays at or above its own floor. Because the lead's floor is
 * strictly higher than every other floor, a rival that has caught up with the
 * lead always has a minute to spare. Lower this one under any of the others and
 * that guarantee stops holding at short totals.
 */
const MINIMUM_MINUTES: Record<SessionBlockKind, number> = {
  warmup: 3,
  repair: 6,
  tempo: 5,
  repertoire: 5,
  coldstart: 4,
};

/**
 * Share of the session each block asks for, by focus. Each row sums to 100, so
 * a weight reads directly as a percentage of an undropped session.
 *
 * The lead block — the one with the largest weight — is `repair` for the three
 * specific focuses and `repertoire` for general upkeep. Nothing keys off those
 * names: `leadOf` reads the table, so changing a weight changes the shape of
 * the session rather than desynchronising the code from it.
 */
const WEIGHTS: Record<SessionFocus, Record<SessionBlockKind, number>> = {
  "tempo-ceiling": {
    warmup: 12,
    repair: 34,
    tempo: 28,
    repertoire: 16,
    coldstart: 10,
  },
  memorise: {
    warmup: 10,
    repair: 36,
    tempo: 12,
    repertoire: 28,
    coldstart: 14,
  },
  transition: {
    warmup: 12,
    repair: 38,
    tempo: 18,
    repertoire: 20,
    coldstart: 12,
  },
  upkeep: {
    warmup: 16,
    repair: 18,
    tempo: 20,
    repertoire: 30,
    coldstart: 16,
  },
};

export const SESSION_FOCUSES: readonly {
  value: SessionFocus;
  label: string;
  blurb: string;
}[] = [
  {
    value: "tempo-ceiling",
    label: "Raise a tempo ceiling",
    blurb: "One passage will not go faster without falling apart.",
  },
  {
    value: "memorise",
    label: "Memorise a song",
    blurb: "You can play it with the page in front of you, and not without it.",
  },
  {
    value: "transition",
    label: "Repair a transition",
    blurb: "Both parts are fine. The join between them is not.",
  },
  {
    value: "upkeep",
    label: "General upkeep",
    blurb: "Nothing is broken. You want a session that keeps things moving.",
  },
];

const FOCUS_VALUES: readonly SessionFocus[] = SESSION_FOCUSES.map(
  (option) => option.value,
);

/* ------------------------------------------------------------------ *
 * Block copy
 * ------------------------------------------------------------------ */

const SHARED: Record<
  SessionBlockKind,
  { name: string; shortName: string; purpose: string }
> = {
  warmup: {
    name: "Warm-up with intent",
    shortName: "Warm-up",
    purpose:
      "Getting your hands working on the material this session is about, instead of on whatever they reach for first.",
  },
  repair: {
    name: "The repair target",
    shortName: "Repair",
    purpose: "The one thing this session exists to change.",
  },
  tempo: {
    name: "Tempo work",
    shortName: "Tempo",
    purpose:
      "Moving one thing faster in steps small enough that nothing has to break to get there.",
  },
  repertoire: {
    name: "Repertoire under pressure",
    shortName: "Repertoire",
    purpose:
      "Playing something you already know, under a condition harder than your practice chair.",
  },
  coldstart: {
    name: "Cold-start test",
    shortName: "Cold start",
    purpose:
      "Finding out whether today's work survives a stop. What you can only do while already warm is not yours yet.",
  },
};

/** The repair block is the focus made concrete, so all three fields change. */
const REPAIR: Record<
  SessionFocus,
  { name: string; purpose: string; doThis: string }
> = {
  "tempo-ceiling": {
    name: "The bar that breaks first",
    purpose:
      "The passage is not equally slow everywhere. One bar collapses before the rest, and your ceiling is that bar's ceiling.",
    doThis:
      "Find the single bar that fails first when you push the tempo. Loop that bar on its own, slower than the passage, until three passes in a row are clean. Then play it with one bar either side, because a bar that only works in isolation has not been repaired.",
  },
  memorise: {
    name: "The section you cannot start from",
    purpose:
      "You can already play the song from the top. Memory only counts once you can start anywhere inside it.",
    doThis:
      "Pick a point in the song you cannot begin from, and begin from it. Play four bars forward from there, from memory, until it is reliable. Then begin from the bar before it. Memory gets built backwards into the places you avoid.",
  },
  transition: {
    name: "The transition that stalls",
    purpose:
      "Both sides of the join are already playable. What is missing is the move between them, which you have never practised on its own.",
    doThis:
      "Play the last beat before the change and the first beat after it, and nothing else. Slow enough that your hand can be watched. Repeat until the move happens with no pause in the middle, then add one beat on each side.",
  },
  upkeep: {
    name: "The weakest thing you played this week",
    purpose:
      "Upkeep still needs a target. Without one, the session turns into a run-through of what you can already do.",
    doThis:
      "Name the one thing that went worst this week: a chord, a bar, a change, a rhythm. Work only on that here, slower than you can play it, until it is no longer the worst thing.",
  },
};

const WARMUP_DO: Record<SessionFocus, string> = {
  "tempo-ceiling":
    "Play the passage at a tempo you can hold without thinking about it, hands only, no metronome. You are listening for the first place a finger arrives late — that is what the next block works on.",
  memorise:
    "Play the section once with the notation in front of you, slowly. Then look away and play as far as you get. Where you stop is where this session starts.",
  transition:
    "Play the two bars either side of the join separately and slowly, without connecting them. Both sides go under your hands before you try to make them meet.",
  upkeep:
    "Two minutes on something that makes your hands work — a scale shape, a chord loop, one riff — then the first thing you plan to practise, at half speed.",
};

const TEMPO_DO: Record<SessionFocus, string> = {
  "tempo-ceiling":
    "Set the metronome at a tempo you already play cleanly and take one small step up at a time. Three clean passes before every increase. When a step fails, drop back to the last one that held and finish the block there.",
  memorise:
    "Run the section at one steady tempo, slow enough that you never guess the next bar. Speed is not the work here. Not stopping is.",
  transition:
    "Set the metronome slow and play through the join in time, without stopping at it. Once four passes in a row hold, move the metronome up one small step and repeat.",
  upkeep:
    "Take a piece you can already play and run it against the click slightly below your comfortable tempo. Playing under tempo on purpose is what shows you where you have been rushing.",
};

const REPERTOIRE_DO: Record<SessionFocus, string> = {
  "tempo-ceiling":
    "Play a song you know all the way through at full tempo without stopping for anything. If you make a mistake, keep going. Stopping is the habit this block exists to untrain.",
  memorise:
    "Play the parts of the song you already hold from memory, end to end, with nothing in front of you. Note every point where you reached for the page rather than looked at it.",
  transition:
    "Play the whole piece the transition belongs to, once, at a tempo you can hold. The join has to survive in context, not only inside a loop.",
  upkeep:
    "Pick one song you can play and perform it: standing up, or recorded, or for whoever is in the house. One condition that is not your usual chair.",
};

const COLDSTART_DO: Record<SessionFocus, string> = {
  "tempo-ceiling":
    "Put the guitar down and leave it for two minutes. Come back and play the bar you repaired, at the tempo you reached, on the first attempt with no run-up.",
  memorise:
    "Put the guitar down and leave it for two minutes. Come back and start the song from the point you worked on today, from memory, with no lead-in.",
  transition:
    "Put the guitar down and leave it for two minutes. Come back and play the transition once, cold, at the tempo you finished on.",
  upkeep:
    "Put the guitar down and leave it for two minutes. Come back and play the thing you worked on today, once, on the first attempt.",
};

const DO_THIS: Record<
  Exclude<SessionBlockKind, "repair">,
  Record<SessionFocus, string>
> = {
  warmup: WARMUP_DO,
  tempo: TEMPO_DO,
  repertoire: REPERTOIRE_DO,
  coldstart: COLDSTART_DO,
};

function blockCopy(
  kind: SessionBlockKind,
  focus: SessionFocus,
): { name: string; shortName: string; purpose: string; doThis: string } {
  if (kind === "repair") {
    const repair = REPAIR[focus];
    return {
      name: repair.name,
      shortName: SHARED.repair.shortName,
      purpose: repair.purpose,
      doThis: repair.doThis,
    };
  }

  return { ...SHARED[kind], doThis: DO_THIS[kind][focus] };
}

/* ------------------------------------------------------------------ *
 * Apportionment
 * ------------------------------------------------------------------ */

/** Fractional parts within this of each other count as tied. */
const EPSILON = 1e-9;

function orderIndex(kind: SessionBlockKind): number {
  return BLOCK_ORDER.indexOf(kind);
}

/** The heaviest block still in the session. Ties fall to the earlier block. */
function leadOf(
  active: readonly SessionBlockKind[],
  weights: Record<SessionBlockKind, number>,
): SessionBlockKind {
  return [...active].sort((a, b) => {
    if (weights[a] !== weights[b]) return weights[b] - weights[a];
    return orderIndex(a) - orderIndex(b);
  })[0];
}

/**
 * Largest-remainder apportionment: whole minutes summing to exactly `total`.
 *
 * Every block takes the floor of its exact share, which leaves a remainder of
 * strictly fewer minutes than there are blocks. Those go one each to the blocks
 * with the largest discarded fraction — heavier block first on a tie, then
 * session order — so the same input always produces the same split and no
 * minute is ever invented or lost. Rounding each share independently, the
 * obvious approach, does neither: it drifts by a minute or two in both
 * directions depending on the total.
 */
function apportion(
  total: number,
  active: readonly SessionBlockKind[],
  weights: Record<SessionBlockKind, number>,
): Map<SessionBlockKind, number> {
  const minutes = new Map<SessionBlockKind, number>();
  const fraction = new Map<SessionBlockKind, number>();

  if (active.length === 0) return minutes;

  const totalWeight = active.reduce((sum, kind) => sum + weights[kind], 0);
  let assigned = 0;

  for (const kind of active) {
    // A zero total weight cannot happen with the table above, but the fallback
    // costs one comparison and keeps a future weight of 0 from producing NaN
    // minutes rather than an even split.
    const share =
      totalWeight > 0
        ? (total * weights[kind]) / totalWeight
        : total / active.length;
    const whole = Math.floor(share);
    minutes.set(kind, whole);
    fraction.set(kind, share - whole);
    assigned += whole;
  }

  const queue = [...active].sort((a, b) => {
    const fa = fraction.get(a) ?? 0;
    const fb = fraction.get(b) ?? 0;
    if (Math.abs(fa - fb) > EPSILON) return fb - fa;
    if (weights[a] !== weights[b]) return weights[b] - weights[a];
    return orderIndex(a) - orderIndex(b);
  });

  // Bounded by construction — the discarded fractions sum to less than the
  // block count — but taken modulo the queue length so a floating-point
  // surprise cannot index past the end and write `undefined + 1`.
  const remainder = Math.max(0, total - assigned);
  for (let index = 0; index < remainder; index += 1) {
    const kind = queue[index % queue.length];
    minutes.set(kind, (minutes.get(kind) ?? 0) + 1);
  }

  return minutes;
}

/**
 * Drop blocks that came out under their minimum, one at a time, reapportioning
 * the whole total across the survivors after each removal.
 *
 * One at a time matters. Removing every undersized block in a single pass
 * over-drops: a block sitting one minute short is often above its minimum once
 * a smaller block's minutes come back to it, and dropping both leaves a session
 * emptier than the total required.
 *
 * The lead block is never dropped while anything else is still active. It is
 * the block the player chose, and a session that discards the reason it was
 * built is not a shorter session, it is a different one. The corollary is that
 * when the lead is the only block under its minimum, the lightest block still
 * standing pays for it — a viable lead is the point of the plan, so a session
 * that keeps four adequate blocks and starves the one you asked for has
 * answered a question nobody asked.
 */
function allocate(
  total: number,
  focus: SessionFocus,
): {
  minutes: Map<SessionBlockKind, number>;
  active: SessionBlockKind[];
  dropped: { kind: SessionBlockKind; cause: DropCause }[];
} {
  const weights = WEIGHTS[focus];
  let active = [...BLOCK_ORDER];
  let minutes = apportion(total, active, weights);
  const dropped: { kind: SessionBlockKind; cause: DropCause }[] = [];

  // At most one removal per block, so the loop cannot outlive the block list.
  for (let pass = 0; pass < BLOCK_ORDER.length; pass += 1) {
    if (active.length <= 1) break;

    const lead = leadOf(active, weights);
    const undersized = active.filter(
      (kind) => (minutes.get(kind) ?? 0) < MINIMUM_MINUTES[kind],
    );
    if (undersized.length === 0) break;

    // Remove a block that is itself too small wherever one exists. When the
    // lead is the only block under its minimum, every other block is doing its
    // job at a viable size and one of them has to fund the lead instead.
    const tooSmall = undersized.filter((kind) => kind !== lead);
    const candidates =
      tooSmall.length > 0 ? tooSmall : active.filter((kind) => kind !== lead);
    if (candidates.length === 0) break;

    // Lightest first, and on a tie the block that comes later in the session:
    // the end of a session is where time is already most likely to be lost.
    const casualty = [...candidates].sort((a, b) => {
      if (weights[a] !== weights[b]) return weights[a] - weights[b];
      return orderIndex(b) - orderIndex(a);
    })[0];

    active = active.filter((kind) => kind !== casualty);
    dropped.push({
      kind: casualty,
      cause: tooSmall.length > 0 ? "under-minimum" : "funded-lead",
    });
    minutes = apportion(total, active, weights);
  }

  return { minutes, active, dropped };
}

/**
 * Guarantee the lead block strictly the largest share, by moving single minutes
 * off whichever block has caught up with it.
 *
 * Apportionment alone does not guarantee this. The lead always has the largest
 * exact share, so its floor is never smaller — but the remainder pass can hand
 * a minute to a rival and not to the lead, which is enough to tie or overtake
 * it by one. A focus that does not visibly change which block is biggest is a
 * label, not a plan, so the tie is broken here rather than tolerated.
 *
 * Transfers preserve the total exactly and never push a rival under its own
 * minimum. See the note on `MINIMUM_MINUTES` for why the second condition can
 * always be met while the lead is `repair`.
 */
function elevateLead(
  minutes: Map<SessionBlockKind, number>,
  active: readonly SessionBlockKind[],
  weights: Record<SessionBlockKind, number>,
): void {
  const lead = leadOf(active, weights);
  const rivals = active.filter((kind) => kind !== lead);
  if (rivals.length === 0) return;

  // Each pass either moves one minute to the lead or returns, and the lead
  // cannot gain more minutes than the session holds.
  const guard = active.reduce((sum, kind) => sum + (minutes.get(kind) ?? 0), 0);

  for (let pass = 0; pass <= guard; pass += 1) {
    const ranked = [...rivals].sort((a, b) => {
      const ma = minutes.get(a) ?? 0;
      const mb = minutes.get(b) ?? 0;
      if (ma !== mb) return mb - ma;
      // Take from the block with the least claim on the time, and on a tie
      // from the one later in the session.
      if (weights[a] !== weights[b]) return weights[a] - weights[b];
      return orderIndex(b) - orderIndex(a);
    });

    const leadMinutes = minutes.get(lead) ?? 0;
    if (leadMinutes > (minutes.get(ranked[0]) ?? 0)) return;

    // The largest rival is the natural donor, but any rival with a minute to
    // spare settles the tie just as well: the lead ends on one more minute
    // than the block it was level with either way. Walking the list rather
    // than giving up on the first rival that is already at its own floor is
    // what keeps the guarantee true rather than usually true.
    const donor = ranked.find(
      (kind) => (minutes.get(kind) ?? 0) - 1 >= MINIMUM_MINUTES[kind],
    );
    if (donor === undefined) return;

    minutes.set(donor, (minutes.get(donor) ?? 0) - 1);
    minutes.set(lead, leadMinutes + 1);
  }
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

function plural(count: number, singular: string, many: string): string {
  return `${count} ${count === 1 ? singular : many}`;
}

function buildBlocks(
  focus: SessionFocus,
  active: readonly SessionBlockKind[],
  minutes: Map<SessionBlockKind, number>,
): SessionBlock[] {
  return BLOCK_ORDER.filter((kind) => active.includes(kind)).map(
    (kind, index) => {
      const allocated = minutes.get(kind) ?? 0;
      return {
        id: `${focus}-${kind}-${allocated}`,
        kind,
        position: index + 1,
        minutes: allocated,
        ...blockCopy(kind, focus),
      };
    },
  );
}

/**
 * The sentence printed beside each block that is not in the session.
 *
 * Neither wording claims the session could not afford the block, and that is
 * the point. It usually could: the blocks have minimums totalling 23 minutes,
 * so a 30-minute session can seat all five at their floors. What it cannot do
 * is seat all five *and* give the block you chose the share that makes it the
 * repair rather than one item on a list. Dropping is how the weighting is
 * honoured, not how the arithmetic is balanced, and the copy now says so.
 */
function describeDropped(
  focus: SessionFocus,
  total: number,
  lead: SessionBlockKind,
  dropped: readonly { kind: SessionBlockKind; cause: DropCause }[],
): DroppedBlock[] {
  const causes = new Map(dropped.map((record) => [record.kind, record.cause]));

  return BLOCK_ORDER.filter((kind) => causes.has(kind)).map((kind) => {
    const { name } = blockCopy(kind, focus);
    const cause = causes.get(kind) ?? "under-minimum";
    const floor = plural(MINIMUM_MINUTES[kind], "minute", "minutes");

    return {
      kind,
      name,
      cause,
      // Deliberately does not repeat the block's name. `name` sits beside this
      // in the same type and the UI renders both, so a reason that opens with
      // the name reads as a stutter on screen.
      reason:
        cause === "under-minimum"
          ? `It needs at least ${floor} to be worth starting, and its share of a ${total}-minute session came out under that. Shortening it would have cost the setup time and returned nothing.`
          : `It came out at a workable size and was given up anyway: at ${total} minutes, freeing it was the only way left to get the ${blockCopy(lead, focus).shortName.toLowerCase()} block up to the ${plural(MINIMUM_MINUTES[lead], "minute", "minutes")} it needs, and that is the block you came here for.`,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Validation and the public entry point
 * ------------------------------------------------------------------ */

/** Pin a length into the workable range. Fractions round to the nearest minute. */
export function clampSessionMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_SESSION_MINUTES;
  return Math.min(
    MAX_SESSION_MINUTES,
    Math.max(MIN_SESSION_MINUTES, Math.round(value)),
  );
}

/** True only for one of the four focus values this tool knows about. */
export function isSessionFocus(value: unknown): value is SessionFocus {
  return (
    typeof value === "string" &&
    FOCUS_VALUES.includes(value as SessionFocus)
  );
}

export function sessionFocusLabel(focus: SessionFocus): string {
  return (
    SESSION_FOCUSES.find((option) => option.value === focus)?.label ?? "Practice"
  );
}

function fail(
  code: SessionErrorCode,
  message: string,
  extra?: { suggestedMinutes?: number },
): SessionPlanResult {
  return { ok: false, error: { code, message, ...extra } };
}

/**
 * Build a session plan, or explain exactly why the numbers cannot make one.
 *
 * Takes `unknown` because the same function validates a restored localStorage
 * payload. Nothing downstream trusts a field it did not narrow here.
 */
export function buildSessionPlan(input: unknown): SessionPlanResult {
  if (!input || typeof input !== "object") {
    return fail(
      "minutes-not-a-number",
      "Enter how many minutes you have, as a whole number.",
    );
  }

  const record = input as Record<string, unknown>;
  const minutes = record.minutes;

  if (typeof minutes !== "number" || !Number.isInteger(minutes)) {
    return fail(
      "minutes-not-a-number",
      "Enter how many minutes you have, as a whole number. Half minutes are not a practice block.",
    );
  }
  if (minutes < MIN_SESSION_MINUTES) {
    return fail(
      "minutes-too-few",
      `A session needs at least ${MIN_SESSION_MINUTES} minutes. Under that, skip the plan and play the one bar that is broken.`,
      { suggestedMinutes: MIN_SESSION_MINUTES },
    );
  }
  if (minutes > MAX_SESSION_MINUTES) {
    return fail(
      "minutes-too-many",
      `${MAX_SESSION_MINUTES} minutes is as long as one session should run. Past that, build a second session rather than a longer one.`,
      { suggestedMinutes: MAX_SESSION_MINUTES },
    );
  }
  if (!isSessionFocus(record.focus)) {
    return fail("focus-unknown", "Choose what this session is for.");
  }

  const focus = record.focus;
  const weights = WEIGHTS[focus];
  const { minutes: allocated, active, dropped } = allocate(minutes, focus);
  elevateLead(allocated, active, weights);

  const lead = leadOf(active, weights);
  const blocks = buildBlocks(focus, active, allocated);
  const list = blocks
    .map((block) => `${block.shortName} ${block.minutes}`)
    .join(", ");
  const accounting =
    blocks.length === 1
      ? `The whole ${minutes} minutes goes to it.`
      : `They add up to exactly ${minutes} minutes, with nothing left unassigned.`;
  // Not "there is not enough time for them", which was the previous wording and
  // was false at most lengths that drop anything: 30 minutes can seat all five
  // blocks at their floors. What it cannot do is seat all five and still weight
  // the session toward the block that was chosen.
  const tail =
    dropped.length > 0
      ? ` ${plural(dropped.length, "block was", "blocks were")} left out rather than shrunk below the size that makes ${dropped.length === 1 ? "it" : "them"} worth starting.`
      : "";

  return {
    ok: true,
    value: {
      minutes,
      focus,
      focusLabel: sessionFocusLabel(focus),
      leadKind: lead,
      blocks,
      dropped: describeDropped(focus, minutes, lead, dropped),
      summary: `${minutes} minutes, ${plural(blocks.length, "block", "blocks")}: ${list}. ${accounting}${tail}`,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

function blockIds(plan: SessionPlan): Set<string> {
  return new Set(plan.blocks.map((block) => block.id));
}

/** Drop duplicates and anything that is not a block of this plan. */
export function normalizeSessionProgress(
  plan: SessionPlan,
  candidate: unknown,
): string[] {
  if (!Array.isArray(candidate)) return [];
  const recognized = blockIds(plan);
  return [
    ...new Set(
      candidate.filter(
        (id): id is string => typeof id === "string" && recognized.has(id),
      ),
    ),
  ];
}

/** Minutes belonging to the blocks marked done. */
export function sessionMinutesDone(
  plan: SessionPlan,
  candidate: unknown,
): number {
  const done = new Set(normalizeSessionProgress(plan, candidate));
  return plan.blocks
    .filter((block) => done.has(block.id))
    .reduce((sum, block) => sum + block.minutes, 0);
}

/**
 * Whole-number percentage of the session marked done, weighted by minutes.
 *
 * Counting blocks instead would call a 4-minute cold-start test the same
 * fraction of the session as a 20-minute repair block, which is the one thing
 * the allocator spent all its effort not doing.
 */
export function sessionProgressPercent(
  plan: SessionPlan,
  candidate: unknown,
): number {
  if (plan.minutes <= 0) return 0;
  return Math.round((sessionMinutesDone(plan, candidate) / plan.minutes) * 100);
}

/**
 * Validate a restored payload by rebuilding from it. `buildSessionPlan` is the
 * only definition of a valid input, so there is no second one to drift.
 */
export function restoreSessionState(
  candidate: unknown,
): StoredSessionState | null {
  if (!candidate || typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;
  if (!record.input || typeof record.input !== "object") return null;

  const inputRecord = record.input as Record<string, unknown>;
  const input = {
    minutes: inputRecord.minutes,
    focus: inputRecord.focus,
  } as SessionInput;

  const result = buildSessionPlan(input);
  if (!result.ok) return null;

  return {
    input,
    completedBlockIds: normalizeSessionProgress(
      result.value,
      record.completedBlockIds,
    ),
  };
}
