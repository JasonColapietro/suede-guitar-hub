export type GoalId =
  | "complete-song"
  | "rhythm-time"
  | "fretboard-map"
  | "improvised-solo";

export type ExperienceLevel =
  | "advanced-beginner"
  | "intermediate"
  | "returning";

export type BreakthroughProfile = {
  goal: GoalId;
  experience: ExperienceLevel;
  daysPerWeek: number;
  minutesPerSession: number;
};

export type BreakthroughAction = {
  id: string;
  label: string;
  /** Which practice day of the week this action belongs to, from 1. */
  day: number;
};

/** One part of every practice session, sized from the minutes available. */
export type BreakthroughSessionBlock = {
  label: string;
  minutes: number;
  detail: string;
};

export type BreakthroughWeek = {
  week: number;
  title: string;
  focus: string;
  resource: { label: string; href: string };
  evidence: string;
  crewPrompt: string;
  /** Level-appropriate pace for the week's work, as a share of full tempo. */
  tempoTarget: string;
  /** One action per practice day. */
  actions: BreakthroughAction[];
};

export type BreakthroughPlan = {
  goal: GoalId;
  title: string;
  finishLine: string;
  cadence: string;
  experienceLabel: string;
  /** How this level should approach the month, in one sentence. */
  approach: string;
  /** The shape of every session: warm-up, focused work, check. */
  sessionBlocks: BreakthroughSessionBlock[];
  weeklyMinutes: number;
  totalMinutes: number;
  weeks: BreakthroughWeek[];
};

export type StoredBreakthroughState = {
  profile: BreakthroughProfile;
  completedActionIds: string[];
};

export const BREAKTHROUGH_STORAGE_KEY = "guitarhub.breakthrough.v1";

type WeekTemplate = Omit<BreakthroughWeek, "week" | "actions" | "tempoTarget"> & {
  actions: readonly string[];
};

type GoalTemplate = {
  id: GoalId;
  title: string;
  shortLabel: string;
  finishLine: string;
  weeks: readonly WeekTemplate[];
};

export const BREAKTHROUGH_GOALS: readonly GoalTemplate[] = [
  {
    id: "complete-song",
    title: "Finish one song cleanly",
    shortLabel: "Complete a song",
    finishLine:
      "Record one complete song from count-in to final chord without stopping.",
    weeks: [
      {
        title: "Choose and baseline",
        focus: "Pick one song, map its sections, and record the honest starting take.",
        resource: {
          label: "Choose a Strumly song",
          href: "https://strumly.suedeai.ai/songs",
        },
        evidence: "A single-take baseline, even if it falls apart.",
        crewPrompt: "Name the section that breaks first and why you think it does.",
        actions: ["Choose one song", "Map its sections", "Record the baseline"],
      },
      {
        title: "Repair the transitions",
        focus: "Isolate the two joins that interrupt the performance.",
        resource: {
          label: "Open the chord reference",
          href: "https://strumly.suedeai.ai/chords",
        },
        evidence: "Three clean repetitions of each difficult transition.",
        crewPrompt: "Share the smallest tempo where the join stays clean.",
        actions: ["Find two weak joins", "Loop each join slowly", "Log clean tempo"],
      },
      {
        title: "Hold the form",
        focus: "Connect sections at a tempo where the whole arrangement survives.",
        resource: {
          label: "Set the Strumly metronome",
          href: "https://strumly.suedeai.ai/metronome",
        },
        evidence: "A full take with no restart and a written self-review.",
        crewPrompt: "Ask for feedback on one musical issue, not general approval.",
        actions: ["Set survival tempo", "Play two full takes", "Write one correction"],
      },
      {
        title: "Perform and prove",
        focus: "Make the final take musical, repeatable, and ready for review.",
        resource: {
          label: "Talk it through with the coach",
          href: "https://strumly.suedeai.ai/coach",
        },
        evidence: "The final complete-song take beside the Week 1 baseline.",
        crewPrompt: "Name the change you can hear between the two takes.",
        actions: ["Warm up the weak join", "Record final take", "Compare to baseline"],
      },
    ],
  },
  {
    id: "rhythm-time",
    title: "Lock rhythm to a steady pulse",
    shortLabel: "Improve rhythm",
    finishLine:
      "Record two minutes of the target groove against a click without losing the pulse.",
    weeks: [
      {
        title: "Find the drift",
        focus: "Record the groove and identify whether you rush, drag, or lose the subdivision.",
        resource: { label: "Open the metronome", href: "https://strumly.suedeai.ai/metronome" },
        evidence: "A baseline at the fastest tempo that remains recognizable.",
        crewPrompt: "Post your tempo and the beat where the drift begins.",
        actions: ["Choose one groove", "Record with click", "Mark the first drift"],
      },
      {
        title: "Own the subdivision",
        focus: "Count and mute the rhythm before adding pitch back in.",
        resource: { label: "Use the ear trainer", href: "https://strumly.suedeai.ai/ear-trainer" },
        evidence: "Thirty seconds of muted strumming that stays aligned.",
        crewPrompt: "Describe the subdivision in plain language.",
        actions: ["Count aloud", "Mute-strum the pattern", "Record 30 seconds"],
      },
      {
        title: "Add musical pressure",
        focus: "Move the groove into a real progression without sacrificing time.",
        resource: { label: "Pick a song progression", href: "https://strumly.suedeai.ai/songs" },
        evidence: "One minute with chord changes and the click still audible.",
        crewPrompt: "Ask whether the groove feels settled, rushed, or stiff.",
        actions: ["Choose progression", "Rehearse below ceiling", "Record one minute"],
      },
      {
        title: "Hold the pocket",
        focus: "Sustain the groove long enough that recovery, not luck, is visible.",
        resource: { label: "Review with the coach", href: "https://strumly.suedeai.ai/coach" },
        evidence: "The final two-minute take beside the Week 1 baseline.",
        crewPrompt: "Share the moment where you recovered without stopping.",
        actions: ["Set final tempo", "Record two minutes", "Compare the drift"],
      },
    ],
  },
  {
    id: "fretboard-map",
    title: "Navigate the fretboard on purpose",
    shortLabel: "Map the fretboard",
    finishLine:
      "Find and play the target notes or shape in three neck positions without hunting.",
    weeks: [
      {
        title: "Anchor the map",
        focus: "Choose one root and locate it cleanly across the sixth and fifth strings.",
        resource: { label: "Open the scale map", href: "https://strumly.suedeai.ai/scales" },
        evidence: "A narrated pass finding every target root.",
        crewPrompt: "Share the landmark that made one position click.",
        actions: ["Choose one root", "Find string anchors", "Record narrated pass"],
      },
      {
        title: "Connect two positions",
        focus: "Move one scale or chord idea between adjacent positions.",
        resource: { label: "Explore chord shapes", href: "https://strumly.suedeai.ai/chords" },
        evidence: "The same phrase played in two positions without a pause.",
        crewPrompt: "Name the note or interval that connects the positions.",
        actions: ["Choose one phrase", "Map two positions", "Connect without pause"],
      },
      {
        title: "Remove the visual crutch",
        focus: "Recall the map before checking the diagram.",
        resource: { label: "Test the map", href: "https://strumly.suedeai.ai/scales" },
        evidence: "Three prompted locations found from memory.",
        crewPrompt: "Give your crew one location prompt to answer cold.",
        actions: ["Hide the diagram", "Run three prompts", "Correct from map"],
      },
      {
        title: "Use the map musically",
        focus: "Play one idea across three positions while keeping the phrase intact.",
        resource: { label: "Ask the coach for a prompt", href: "https://strumly.suedeai.ai/coach" },
        evidence: "A final three-position performance beside the first narrated pass.",
        crewPrompt: "Explain one choice the map made available.",
        actions: ["Choose musical idea", "Play three positions", "Compare to baseline"],
      },
    ],
  },
  {
    id: "improvised-solo",
    title: "Build an intentional short solo",
    shortLabel: "Shape a solo",
    finishLine:
      "Perform a 30-second solo with a clear opening, development, and ending.",
    weeks: [
      {
        title: "Limit the vocabulary",
        focus: "Choose one small scale area and make three phrases from it.",
        resource: { label: "Choose a scale", href: "https://strumly.suedeai.ai/scales" },
        evidence: "Three distinct phrases with space between them.",
        crewPrompt: "Ask which phrase sounds most like a complete sentence.",
        actions: ["Choose scale area", "Write three phrases", "Record with space"],
      },
      {
        title: "Develop one idea",
        focus: "Repeat, answer, and vary the strongest phrase.",
        resource: { label: "Find a backing progression", href: "https://strumly.suedeai.ai/songs" },
        evidence: "One phrase followed by two audible variations.",
        crewPrompt: "Have the crew identify the original idea in each variation.",
        actions: ["Select core phrase", "Create two variations", "Record sequence"],
      },
      {
        title: "Build an arc",
        focus: "Arrange phrases so intensity rises and resolves.",
        resource: { label: "Set a steady pulse", href: "https://strumly.suedeai.ai/metronome" },
        evidence: "A 30-second draft with a deliberate last phrase.",
        crewPrompt: "Ask where the solo peaks and whether the ending lands.",
        actions: ["Order the phrases", "Choose the peak", "Record full draft"],
      },
      {
        title: "Perform the statement",
        focus: "Keep the form while allowing one spontaneous choice.",
        resource: { label: "Review with the coach", href: "https://strumly.suedeai.ai/coach" },
        evidence: "The final solo beside the Week 1 three-phrase baseline.",
        crewPrompt: "Name the one spontaneous choice worth keeping.",
        actions: ["Rehearse the arc", "Record final solo", "Compare to baseline"],
      },
    ],
  },
] as const;

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  "advanced-beginner": "Advanced beginner",
  intermediate: "Intermediate",
  returning: "Returning player",
};

export const MIN_DAYS_PER_WEEK = 3;
export const MAX_DAYS_PER_WEEK = 6;
export const MIN_MINUTES_PER_SESSION = 15;
export const MAX_MINUTES_PER_SESSION = 60;

type ExperienceProfile = {
  approach: string;
  /** Working pace for weeks 1 to 4, as a percentage of full tempo. */
  tempoPercents: readonly [number, number, number, number];
  /** What earns the next notch up inside a session. */
  moveUp: string;
};

/**
 * What changes with experience: the pace each week works at, and the rule
 * for raising it. An advanced beginner starts slow enough that the first pass
 * is clean; an intermediate player reaches full tempo in week 4; a returning
 * player starts under what their hands remember and catches up late.
 */
const EXPERIENCE_PROFILES: Record<ExperienceLevel, ExperienceProfile> = {
  "advanced-beginner": {
    approach:
      "Keep every action small: one passage at a time, slow enough that the first pass is clean.",
    tempoPercents: [60, 70, 80, 90],
    moveUp: "move up only after three clean passes in a row",
  },
  intermediate: {
    approach:
      "Work at the edge: once a pass is clean twice in a row, raise the tempo inside the same session.",
    tempoPercents: [70, 80, 90, 100],
    moveUp: "add 5% after two clean passes in a row",
  },
  returning: {
    approach:
      "Rebuild before you push: start under the tempo your hands remember and make week 1 about consistency, not speed.",
    tempoPercents: [55, 65, 80, 95],
    moveUp: "move up only after a clean pass on the first try of the day",
  },
};

/**
 * Practice days beyond the three core actions each week. Each one consolidates
 * the week's core work rather than adding new material, so a sixth day makes
 * the week deeper, not wider.
 */
const EXTRA_ACTIONS: readonly ((week: WeekTemplate) => string)[] = [
  () => "Repeat the hardest action from this week and note what changed",
  (week) => `Run a practice take of this week's evidence: ${lowerFirst(week.evidence)}`,
  () => "Replay this week's takes and write one correction for tomorrow",
];

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * Split one session into warm-up, focused work and a closing check.
 *
 * A fifth of the time each for the warm-up and the check, never under three
 * minutes, and the rest — always the largest share — for the week's action.
 */
export function sessionBlocksFor(minutes: number): BreakthroughSessionBlock[] {
  const warmup = Math.max(3, Math.round(minutes * 0.2));
  const check = Math.max(3, Math.round(minutes * 0.2));
  return [
    {
      label: "Warm-up",
      minutes: warmup,
      detail: "Slow run of yesterday's material, metronome on.",
    },
    {
      label: "Today's action",
      minutes: minutes - warmup - check,
      detail: "The one action scheduled for today, and nothing else.",
    },
    {
      label: "Check",
      minutes: check,
      detail: "One recorded pass, then a line on what moved.",
    },
  ];
}

/**
 * One action per practice day: the week's three core actions, with any extra
 * days spent consolidating before the last core action closes the week.
 *
 * Core actions keep the ids they always had (`…-a1` to `…-a3`) and extra days
 * use `…-x4` onwards, so changing the number of days keeps every tick on an
 * action that still exists.
 */
function weekActions(
  goal: GoalId,
  weekNumber: number,
  week: WeekTemplate,
  daysPerWeek: number,
): BreakthroughAction[] {
  const core = week.actions.map((label, index) => ({
    id: `${goal}-w${weekNumber}-a${index + 1}`,
    label,
  }));
  const extras = EXTRA_ACTIONS.slice(0, Math.max(0, daysPerWeek - core.length)).map(
    (write, index) => ({
      id: `${goal}-w${weekNumber}-x${core.length + index + 1}`,
      label: write(week),
    }),
  );
  const ordered = [...core.slice(0, -1), ...extras, ...core.slice(-1)];
  return ordered.map((action, index) => ({ ...action, day: index + 1 }));
}

function getTemplate(goal: GoalId): GoalTemplate {
  const template = BREAKTHROUGH_GOALS.find((candidate) => candidate.id === goal);
  if (!template) throw new Error("Choose a supported breakthrough goal.");
  return template;
}

/**
 * Build the four-week plan for one profile.
 *
 * Every input shapes it. Days per week sets how many actions each week holds
 * (one per practice day). Minutes per session sizes the warm-up, the focused
 * block and the closing check. Experience sets the working tempo each week and
 * the rule for raising it. Deterministic: the same profile always produces the
 * same plan and the same action ids.
 */
export function createBreakthroughPlan(
  profile: BreakthroughProfile,
): BreakthroughPlan {
  if (
    !Number.isInteger(profile.daysPerWeek) ||
    profile.daysPerWeek < MIN_DAYS_PER_WEEK ||
    profile.daysPerWeek > MAX_DAYS_PER_WEEK
  ) {
    throw new Error("Choose 3 to 6 practice days per week.");
  }
  if (
    !Number.isInteger(profile.minutesPerSession) ||
    profile.minutesPerSession < MIN_MINUTES_PER_SESSION ||
    profile.minutesPerSession > MAX_MINUTES_PER_SESSION
  ) {
    throw new Error("Choose 15 to 60 minutes per practice session.");
  }
  if (!Object.hasOwn(EXPERIENCE_LABELS, profile.experience)) {
    throw new Error("Choose a supported experience level.");
  }

  const template = getTemplate(profile.goal);
  const level = EXPERIENCE_PROFILES[profile.experience];
  const weeklyMinutes = profile.daysPerWeek * profile.minutesPerSession;
  return {
    goal: template.id,
    title: template.title,
    finishLine: template.finishLine,
    cadence: `${profile.daysPerWeek} days x ${profile.minutesPerSession} minutes`,
    experienceLabel: EXPERIENCE_LABELS[profile.experience],
    approach: level.approach,
    sessionBlocks: sessionBlocksFor(profile.minutesPerSession),
    weeklyMinutes,
    totalMinutes: weeklyMinutes * template.weeks.length,
    weeks: template.weeks.map((week, weekIndex) => {
      const percent = level.tempoPercents[weekIndex] ?? 100;
      return {
        week: weekIndex + 1,
        title: week.title,
        focus: week.focus,
        resource: week.resource,
        evidence: week.evidence,
        crewPrompt: week.crewPrompt,
        tempoTarget:
          percent >= 100
            ? `Full tempo this week; ${level.moveUp}.`
            : `Work at about ${percent}% of full tempo; ${level.moveUp}.`,
        actions: weekActions(template.id, weekIndex + 1, week, profile.daysPerWeek),
      };
    }),
  };
}

function actionIds(plan: BreakthroughPlan): Set<string> {
  return new Set(plan.weeks.flatMap((week) => week.actions.map((action) => action.id)));
}

export function normalizeProgress(
  plan: BreakthroughPlan,
  candidate: unknown,
): string[] {
  if (!Array.isArray(candidate)) return [];
  const recognized = actionIds(plan);
  return [...new Set(candidate.filter((id): id is string => typeof id === "string" && recognized.has(id)))];
}

export function progressPercent(
  plan: BreakthroughPlan,
  completedActionIds: unknown,
): number {
  const total = plan.weeks.reduce((count, week) => count + week.actions.length, 0);
  if (total === 0) return 0;
  return Math.round((normalizeProgress(plan, completedActionIds).length / total) * 100);
}

export function restoreBreakthroughState(
  candidate: unknown,
): StoredBreakthroughState | null {
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;
  if (!record.profile || typeof record.profile !== "object") return null;
  const profileRecord = record.profile as Record<string, unknown>;
  const profile = {
    goal: profileRecord.goal,
    experience: profileRecord.experience,
    daysPerWeek: profileRecord.daysPerWeek,
    minutesPerSession: profileRecord.minutesPerSession,
  } as BreakthroughProfile;

  try {
    const plan = createBreakthroughPlan(profile);
    return {
      profile,
      completedActionIds: normalizeProgress(plan, record.completedActionIds),
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Editing and shared progress
 * ------------------------------------------------------------------ */

export function sameBreakthroughProfile(
  left: BreakthroughProfile,
  right: BreakthroughProfile,
): boolean {
  return (
    left.goal === right.goal &&
    left.experience === right.experience &&
    left.daysPerWeek === right.daysPerWeek &&
    left.minutesPerSession === right.minutesPerSession
  );
}

/**
 * The stored state after changing the profile, carrying every checked action
 * the new plan still has.
 *
 * Action ids depend on the goal, the week and the action, not on the minutes
 * or the experience level, so editing those keeps every tick. Fewer days drops
 * only the extra-day actions that no longer exist; a new goal is a new plan.
 * What would be lost comes back as `dropped`, so the page can ask first.
 */
export function rebuildBreakthroughState(
  latest: StoredBreakthroughState | null,
  profile: BreakthroughProfile,
): { state: StoredBreakthroughState; dropped: string[] } {
  const plan = createBreakthroughPlan(profile);
  const valid = actionIds(plan);
  const previous = [...new Set(latest?.completedActionIds ?? [])];
  return {
    state: {
      profile,
      completedActionIds: previous.filter((id) => valid.has(id)),
    },
    dropped: previous.filter((id) => !valid.has(id)),
  };
}

/**
 * Mark one action done or not done on the latest stored plan. Returns `latest`
 * unchanged when another tab has replaced the plan the player was looking at.
 */
export function setBreakthroughActionDone(
  latest: StoredBreakthroughState | null,
  profile: BreakthroughProfile,
  actionId: string,
  done: boolean,
): StoredBreakthroughState | null {
  if (!latest || !sameBreakthroughProfile(latest.profile, profile)) return latest;
  const plan = createBreakthroughPlan(profile);
  const without = latest.completedActionIds.filter((id) => id !== actionId);
  return {
    profile: latest.profile,
    completedActionIds: normalizeProgress(plan, done ? [...without, actionId] : without),
  };
}
