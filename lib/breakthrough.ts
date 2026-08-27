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
};

export type BreakthroughWeek = {
  week: number;
  title: string;
  focus: string;
  resource: { label: string; href: string };
  evidence: string;
  crewPrompt: string;
  actions: BreakthroughAction[];
};

export type BreakthroughPlan = {
  goal: GoalId;
  title: string;
  finishLine: string;
  cadence: string;
  experienceLabel: string;
  weeks: BreakthroughWeek[];
};

export type StoredBreakthroughState = {
  profile: BreakthroughProfile;
  completedActionIds: string[];
};

export const BREAKTHROUGH_STORAGE_KEY = "guitarhub.breakthrough.v1";

type WeekTemplate = Omit<BreakthroughWeek, "week" | "actions"> & {
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

function getTemplate(goal: GoalId): GoalTemplate {
  const template = BREAKTHROUGH_GOALS.find((candidate) => candidate.id === goal);
  if (!template) throw new Error("Choose a supported breakthrough goal.");
  return template;
}

export function createBreakthroughPlan(
  profile: BreakthroughProfile,
): BreakthroughPlan {
  if (!Number.isInteger(profile.daysPerWeek) || profile.daysPerWeek < 3 || profile.daysPerWeek > 6) {
    throw new Error("Choose 3 to 6 practice days per week.");
  }
  if (
    !Number.isInteger(profile.minutesPerSession) ||
    profile.minutesPerSession < 15 ||
    profile.minutesPerSession > 60
  ) {
    throw new Error("Choose 15 to 60 minutes per practice session.");
  }
  if (!(profile.experience in EXPERIENCE_LABELS)) {
    throw new Error("Choose a supported experience level.");
  }

  const template = getTemplate(profile.goal);
  return {
    goal: template.id,
    title: template.title,
    finishLine: template.finishLine,
    cadence: `${profile.daysPerWeek} days x ${profile.minutesPerSession} minutes`,
    experienceLabel: EXPERIENCE_LABELS[profile.experience],
    weeks: template.weeks.map((week, weekIndex) => ({
      week: weekIndex + 1,
      title: week.title,
      focus: week.focus,
      resource: week.resource,
      evidence: week.evidence,
      crewPrompt: week.crewPrompt,
      actions: week.actions.map((label, actionIndex) => ({
        id: `${template.id}-w${weekIndex + 1}-a${actionIndex + 1}`,
        label,
      })),
    })),
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
