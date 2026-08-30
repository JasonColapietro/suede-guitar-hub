/**
 * Practice Plateau Diagnostic — all scoring logic, no React and no browser API.
 *
 * How it works, in one paragraph. Nine questions ask what you actually do in a
 * practice session. Every option carries weights across five named blockers.
 * Answering scores each blocker, and each blocker's score is compared against
 * the most its own questions could possibly contribute to it — so a blocker
 * that appears in six questions cannot out-rank one that appears in three
 * simply by being asked about more often. The ranking is by that share, then by
 * raw score, then by the fixed order the blockers are declared in below. There
 * is no randomness anywhere: the same answers always produce the same result.
 *
 * Weights are deliberately not balanced to a common maximum. They are set to
 * whatever the question genuinely says about the blocker, and the share
 * calculation absorbs the imbalance. `maxScore` is derived from the question
 * table at module load, never hand-typed, so it cannot drift out of step with
 * the weights.
 */

export type BlockerId =
  | "no-target"
  | "never-at-tempo"
  | "no-feedback"
  | "comfortable-part"
  | "material-churn";

export type QuestionId =
  | "session-end"
  | "recording"
  | "full-tempo"
  | "broken-bar"
  | "new-material"
  | "last-finished"
  | "first-ten"
  | "who-checks"
  | "click";

export type BlockerWeights = Readonly<Partial<Record<BlockerId, number>>>;

export type DiagnosticOption = {
  id: string;
  label: string;
  weights: BlockerWeights;
};

export type DiagnosticQuestion = {
  id: QuestionId;
  /** The question itself. Rendered as the fieldset legend. */
  prompt: string;
  /** Optional clarifier so the question cannot be read two ways. */
  help?: string;
  options: readonly DiagnosticOption[];
};

export type Blocker = {
  id: BlockerId;
  name: string;
  /** One line naming the pattern. */
  summary: string;
  /** The prescription paragraph shown when this blocker wins. */
  prescription: string;
  /** One concrete thing to do in the next session. */
  firstMove: string;
  /** A guitarhub.org route. */
  guide: { label: string; href: string };
  /** A verified Strumly URL. */
  strumly: { label: string; href: string };
};

export type ScoredBlocker = Blocker & {
  score: number;
  /** The most this blocker could score if every question went against you. */
  maxScore: number;
  /** `score / maxScore` as a rounded percentage, 0-100. */
  share: number;
};

/**
 * A question id mapped to the id of the chosen option. Anything reaching this
 * type has been through `normalizeAnswers`, so every key is a real question and
 * every value is a real option of that question.
 */
export type DiagnosticAnswers = Readonly<Partial<Record<QuestionId, string>>>;

export type StoredDiagnosticState = {
  answers: DiagnosticAnswers;
  revealed: boolean;
};

export type Diagnosis =
  | {
      status: "incomplete";
      answered: number;
      total: number;
      unanswered: readonly QuestionId[];
    }
  | {
      status: "clear";
      answered: number;
      total: number;
      scores: readonly ScoredBlocker[];
    }
  | {
      status: "blocked";
      answered: number;
      total: number;
      /** Every blocker, ranked. `scores[0]` is `primary`. */
      scores: readonly ScoredBlocker[];
      primary: ScoredBlocker;
      /** Null when no second blocker scored at all. */
      runnerUp: ScoredBlocker | null;
      /**
       * How much weight the ranking can bear.
       * `faint`  — the strongest signal is still weak; little is badly wrong.
       * `narrow` — two blockers came out within ten points of each other.
       * `clear`  — one blocker leads by a real margin.
       */
      confidence: "faint" | "narrow" | "clear";
    };

export const DIAGNOSE_STORAGE_KEY = "guitarhub.diagnose.v1";

/**
 * Declaration order is the final tie-break. It runs from the most foundational
 * blocker to the most downstream: without a target nothing else can be
 * measured, and material churn is what you fall into once the rest has failed.
 * Changing this order changes which blocker wins a dead heat, so change it
 * deliberately or not at all.
 */
export const DIAGNOSTIC_BLOCKERS: readonly Blocker[] = [
  {
    id: "no-target",
    name: "No measurable target",
    summary:
      "Sessions end on the clock or on mood, not on a specific thing that changed.",
    prescription:
      "Before you pick up the guitar, write down the one thing that has to be true when you put it down. Not “work on the solo”. Something like “bar 17 into bar 18, four times in a row, no buzz”. A target that small is checkable, so the session either produced it or it did not, and you stop guessing whether the hour was worth anything. Keep the same target for as many sessions as it takes. Moving it every day is the same as not having one.",
    firstMove:
      "Write one sentence naming what has to be true before you stop tonight.",
    guide: {
      label: "How to run a 30-day challenge that ends in evidence",
      href: "/30-day-guitar-challenge",
    },
    strumly: {
      label: "Designing a practice routine",
      href: "https://strumly.suedeai.ai/guides/designing-a-practice-routine",
    },
  },
  {
    id: "never-at-tempo",
    name: "Never at tempo",
    summary:
      "You can play it slowly. Nothing yet proves it survives at the speed the music moves.",
    prescription:
      "Slow practice builds the shape. It does not prove the shape holds at speed, and the gap between those two is where a lot of stalled progress hides. Find the real tempo of the part, then find the fastest tempo you can play it cleanly today. Those two numbers are the ladder. Move up in small steps and treat any step you cannot play twice cleanly as the step to stay on. The point is not to arrive quickly. The point is that at some tempo the part is finished, and you know which tempo that is.",
    firstMove:
      "Find the song's real tempo, then the fastest clean tempo you have today. Write both down.",
    guide: {
      label: "A weekly routine for intermediate players",
      href: "/guitar-practice-routine-intermediate",
    },
    strumly: {
      label: "Work a full song at its own tempo",
      href: "https://strumly.suedeai.ai/book/lessons/lesson-pride-and-joy",
    },
  },
  {
    id: "no-feedback",
    name: "No feedback loop",
    summary:
      "Nothing outside your own hands is telling you whether it improved.",
    prescription:
      "How a passage feels while you play it is a poor guide to how it sounds, because the part of your attention that is playing is not free to listen. Record it. A phone on the table is enough. Then listen once with the guitar out of your hands and write down the first thing that is wrong, in words specific enough to practice. Do that at the start of a week and again at the end. The comparison replaces the feeling that you are probably getting better with something you can check.",
    firstMove:
      "Record thirty seconds today, listen back once, and write the first specific problem you hear.",
    guide: {
      label: "The GuitarHub method",
      href: "/method",
    },
    strumly: {
      label: "Practicing guitar with an AI coach",
      href: "https://strumly.suedeai.ai/guides/practicing-guitar-with-an-ai-coach",
    },
  },
  {
    id: "comfortable-part",
    name: "Practicing the comfortable part",
    summary: "Most of the session goes to the parts that already work.",
    prescription:
      "Playing a song through feels like practice and mostly is not. The passage you can already play gets another repetition it does not need, and the two bars that break get one attempt in context at full speed, which is the condition they are least likely to improve under. Cut the broken bar out. Loop it alone, slowly enough that it is correct, then add one bar back on each side. Give it the majority of the session and play the whole thing once at the end, to find out whether the repair held.",
    firstMove:
      "Name the bar that breaks, then spend the first twenty minutes on nothing else.",
    guide: {
      label: "What deliberate practice means at the instrument",
      href: "/deliberate-practice-guitar",
    },
    strumly: {
      label: "Smoother chord transitions",
      href: "https://strumly.suedeai.ai/guides/smoother-chord-transitions",
    },
  },
  {
    id: "material-churn",
    name: "Material churn",
    summary: "New material keeps arriving before the last piece was finished.",
    prescription:
      "Starting is the easy part, and it is the part that feels like progress, which is why it repeats. The cost is that nothing reaches the stage where it is difficult and useful. Close the intake for a month. Pick one song or one passage, decide in advance what finished means for it, and refuse every new tab and video until it is done. A finished piece teaches you something the started ones cannot, because only the finished one made you get through the part you would otherwise have quietly avoided.",
    firstMove:
      "Choose the one thing you will finish this month, and close everything else.",
    guide: {
      label: "Why guitar practice plateaus",
      href: "/guitar-practice-plateau",
    },
    strumly: {
      label: "Follow one Strumly learning path",
      href: "https://strumly.suedeai.ai/path",
    },
  },
];

export const DIAGNOSTIC_QUESTIONS: readonly DiagnosticQuestion[] = [
  {
    id: "session-end",
    prompt: "What ends a practice session?",
    options: [
      {
        id: "changed",
        label: "Something plays correctly that could not before",
        weights: {},
      },
      { id: "clock", label: "The clock runs out", weights: { "no-target": 3 } },
      {
        id: "worse",
        label: "It starts sounding worse instead of better",
        weights: { "no-target": 2, "no-feedback": 1 },
      },
      {
        id: "bored",
        label: "I lose interest and move to something else",
        weights: { "no-target": 2, "material-churn": 2 },
      },
    ],
  },
  {
    id: "recording",
    prompt: "When did you last record yourself and listen back?",
    help: "A phone voice memo counts.",
    options: [
      { id: "this-week", label: "This week", weights: {} },
      {
        id: "this-month",
        label: "Sometime this month",
        weights: { "no-feedback": 1 },
      },
      {
        id: "long-ago",
        label: "Longer ago than a month",
        weights: { "no-feedback": 3 },
      },
      {
        id: "never",
        label: "I have never recorded myself",
        weights: { "no-feedback": 4 },
      },
    ],
  },
  {
    id: "full-tempo",
    prompt: "The passage you are working on now: can you play it at the real tempo?",
    options: [
      {
        id: "holds",
        label: "Yes, and it holds up on a recording",
        weights: {},
      },
      {
        id: "sometimes",
        label: "Yes, but it falls apart on some takes",
        weights: { "never-at-tempo": 1, "no-feedback": 1 },
      },
      {
        id: "slow-only",
        label: "Only slowed down",
        weights: { "never-at-tempo": 3, "comfortable-part": 1 },
      },
      {
        id: "unknown-tempo",
        label: "I have never checked what the real tempo is",
        weights: { "never-at-tempo": 4, "no-target": 1 },
      },
    ],
  },
  {
    id: "broken-bar",
    prompt: "How much of a session goes to the specific bar that breaks?",
    options: [
      { id: "most", label: "Most of it. I loop the broken bar", weights: {} },
      {
        id: "some",
        label: "Some, but I play the whole thing through as well",
        weights: { "comfortable-part": 2 },
      },
      {
        id: "whole-only",
        label: "I play it start to finish and hope the bar catches up",
        weights: { "comfortable-part": 4, "no-target": 1 },
      },
      {
        id: "dont-know",
        label: "I could not tell you which bar breaks",
        weights: { "comfortable-part": 2, "no-feedback": 2, "no-target": 1 },
      },
    ],
  },
  {
    id: "new-material",
    prompt: "How many new songs or exercises have you started in the last month?",
    options: [
      {
        id: "one-two",
        label: "One or two, and I am still on them",
        weights: {},
      },
      { id: "three-four", label: "Three or four", weights: { "material-churn": 2 } },
      { id: "five-plus", label: "Five or more", weights: { "material-churn": 4 } },
      {
        id: "lost-count",
        label: "I follow whatever turns up",
        weights: { "material-churn": 4, "no-target": 2 },
      },
    ],
  },
  {
    id: "last-finished",
    prompt: "When did you last finish something and play it through at tempo on purpose?",
    options: [
      { id: "recent", label: "In the last two weeks", weights: {} },
      {
        id: "months",
        label: "Months ago",
        weights: { "material-churn": 2, "never-at-tempo": 1 },
      },
      {
        id: "never-finished",
        label: "I cannot remember finishing anything",
        weights: { "material-churn": 3, "no-target": 2 },
      },
    ],
  },
  {
    id: "first-ten",
    prompt: "What do you play in the first ten minutes?",
    options: [
      { id: "the-fix", label: "The thing I decided to fix", weights: {} },
      {
        id: "already-good",
        label: "Riffs and parts I already play well",
        weights: { "comfortable-part": 3 },
      },
      {
        id: "unrelated-drills",
        label: "Drills unrelated to what I am working on",
        weights: { "comfortable-part": 1, "no-target": 2 },
      },
      {
        id: "whatever",
        label: "Whatever my hands land on",
        weights: { "comfortable-part": 2, "no-target": 2 },
      },
    ],
  },
  {
    id: "who-checks",
    prompt: "What tells you whether it actually improved?",
    options: [
      {
        id: "compare",
        label: "A recording compared against an earlier one",
        weights: {},
      },
      {
        id: "person",
        label: "A teacher, a coach tool, or another player",
        weights: {},
      },
      {
        id: "feel",
        label: "How it felt while I was playing",
        weights: { "no-feedback": 3 },
      },
      {
        id: "nothing",
        label: "Nothing checks it",
        weights: { "no-feedback": 4, "no-target": 1 },
      },
    ],
  },
  {
    id: "click",
    prompt: "Against a click at the target tempo, what happens?",
    options: [
      { id: "locked", label: "It stays locked", weights: {} },
      {
        id: "drifts",
        label: "It drifts and I can hear where",
        weights: { "never-at-tempo": 1 },
      },
      { id: "falls-apart", label: "It falls apart", weights: { "never-at-tempo": 3 } },
      {
        id: "no-click",
        label: "I do not practice with a click",
        weights: { "never-at-tempo": 2 },
      },
    ],
  },
];

/** Declaration index per blocker. The final, deterministic tie-break. */
const BLOCKER_ORDER: Record<BlockerId, number> = DIAGNOSTIC_BLOCKERS.reduce(
  (order, blocker, index) => {
    order[blocker.id] = index;
    return order;
  },
  {} as Record<BlockerId, number>,
);

/**
 * The most any single question could contribute to each blocker, derived from
 * the question table for the same reason `MAX_SCORES` is.
 *
 * This is the yardstick for confidence. `MAX_SCORES` is not comparable across
 * blockers — it is 8 for two of them, 9 for a third and 12 for the rest — so a
 * share built on it means something different for each. One worst-case answer
 * worth 4 reads 50% against a ceiling of 8 and 33% against a ceiling of 12, and
 * a threshold on share therefore calls the same evidence weak for one blocker
 * and decisive for another. Raw weights are on one scale: a 4 means the same
 * thing wherever it appears. A lead no larger than what a single question could
 * have produced on its own is exactly what "faint" should mean, and measured
 * this way it reads the same for all five.
 */
const MAX_SINGLE_WEIGHTS: Record<BlockerId, number> = DIAGNOSTIC_BLOCKERS.reduce(
  (maxima, blocker) => {
    maxima[blocker.id] = DIAGNOSTIC_QUESTIONS.reduce((highest, question) => {
      const best = question.options.reduce(
        (inner, option) => Math.max(inner, option.weights[blocker.id] ?? 0),
        0,
      );
      return Math.max(highest, best);
    }, 0);
    return maxima;
  },
  {} as Record<BlockerId, number>,
);

/**
 * The most each blocker could score, derived from the question table rather
 * than hand-typed, so it cannot fall out of step with the weights above.
 */
const MAX_SCORES: Record<BlockerId, number> = DIAGNOSTIC_BLOCKERS.reduce(
  (maxima, blocker) => {
    maxima[blocker.id] = DIAGNOSTIC_QUESTIONS.reduce((total, question) => {
      const best = question.options.reduce(
        (highest, option) => Math.max(highest, option.weights[blocker.id] ?? 0),
        0,
      );
      return total + best;
    }, 0);
    return maxima;
  },
  {} as Record<BlockerId, number>,
);

function findQuestion(id: QuestionId): DiagnosticQuestion | undefined {
  return DIAGNOSTIC_QUESTIONS.find((question) => question.id === id);
}

/**
 * The single funnel for untrusted input. Keeps only pairs where the key is a
 * real question and the value is a real option *of that question*, so an option
 * id borrowed from a different question is rejected too.
 */
export function normalizeAnswers(candidate: unknown): DiagnosticAnswers {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return {};
  }
  const record = candidate as Record<string, unknown>;
  const answers: Partial<Record<QuestionId, string>> = {};

  for (const question of DIAGNOSTIC_QUESTIONS) {
    const value = record[question.id];
    if (typeof value !== "string") continue;
    if (!question.options.some((option) => option.id === value)) continue;
    answers[question.id] = value;
  }

  return answers;
}

/**
 * Every blocker, scored and ranked. Ranking is share first, then raw score,
 * then declaration order — a total ordering, so it does not depend on the
 * sort implementation or on the order the answers arrived in.
 */
export function scoreAnswers(candidate: unknown): readonly ScoredBlocker[] {
  const answers = normalizeAnswers(candidate);
  const totals: Record<BlockerId, number> = DIAGNOSTIC_BLOCKERS.reduce(
    (running, blocker) => {
      running[blocker.id] = 0;
      return running;
    },
    {} as Record<BlockerId, number>,
  );

  for (const question of DIAGNOSTIC_QUESTIONS) {
    const chosen = answers[question.id];
    if (!chosen) continue;
    const option = question.options.find((candidateOption) => candidateOption.id === chosen);
    if (!option) continue;
    for (const blocker of DIAGNOSTIC_BLOCKERS) {
      totals[blocker.id] += option.weights[blocker.id] ?? 0;
    }
  }

  return DIAGNOSTIC_BLOCKERS.map((blocker) => {
    const score = totals[blocker.id];
    const maxScore = MAX_SCORES[blocker.id];
    return {
      ...blocker,
      score,
      maxScore,
      share: maxScore === 0 ? 0 : Math.round((score / maxScore) * 100),
    };
  }).sort(
    (a, b) =>
      b.share - a.share ||
      b.score - a.score ||
      BLOCKER_ORDER[a.id] - BLOCKER_ORDER[b.id],
  );
}

export function diagnose(candidate: unknown): Diagnosis {
  const answers = normalizeAnswers(candidate);
  const total = DIAGNOSTIC_QUESTIONS.length;
  const unanswered = DIAGNOSTIC_QUESTIONS.filter(
    (question) => !answers[question.id],
  ).map((question) => question.id);
  const answered = total - unanswered.length;

  if (unanswered.length > 0) {
    return { status: "incomplete", answered, total, unanswered };
  }

  const scores = scoreAnswers(answers);

  // Every answer pointed the healthy way. Naming a "winning" blocker here would
  // be inventing a problem out of a clean sheet, so this is its own outcome.
  if (scores.every((blocker) => blocker.score === 0)) {
    return { status: "clear", answered, total, scores };
  }

  const primary = scores[0];
  const second = scores[1];
  const runnerUp = second && second.score > 0 ? second : null;
  const gap = primary.share - (runnerUp ? runnerUp.share : 0);
  // `narrow` is asked first: when a real runner-up sits within ten points, the
  // useful thing to say is that the ranking is not decisive, whether or not the
  // lead is also small. `faint` is then judged on raw score against
  // MAX_SINGLE_WEIGHTS rather than on share, because shares are not comparable
  // between blockers with different ceilings — see that constant.
  const confidence =
    runnerUp && gap <= 10
      ? "narrow"
      : primary.score <= MAX_SINGLE_WEIGHTS[primary.id]
        ? "faint"
        : "clear";

  return { status: "blocked", answered, total, scores, primary, runnerUp, confidence };
}

/**
 * Rebuild saved state. Returns null when nothing usable survives, which is the
 * caller's signal to drop the stored key rather than keep half of it.
 * `revealed` can never come back true for an answer set that is not complete.
 */
export function restoreDiagnosticState(
  candidate: unknown,
): StoredDiagnosticState | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const record = candidate as Record<string, unknown>;
  const answers = normalizeAnswers(record.answers);
  if (Object.keys(answers).length === 0) return null;

  const complete = diagnose(answers).status !== "incomplete";
  return { answers, revealed: record.revealed === true && complete };
}

/** The question a given id names, for callers that only hold the id. */
export function questionPrompt(id: QuestionId): string {
  return findQuestion(id)?.prompt ?? "";
}
