/**
 * The query-ownership register: every pair of pages on this site that was
 * ranking for half of one query, with a recorded decision about which page owns
 * the query and which question the other one answers instead.
 *
 * Why this file exists. Six pairs of pages here were written as separate
 * articles and then converged, because the site argues one method and every
 * guide restates the part of it nearest to hand. Two pages answering one
 * question is not automatically a defect: a tool and the guide that explains
 * when to reach for it are genuinely two pages, and so are a general protocol
 * and a study of one recording. What made these six a defect is that nobody had
 * decided, so each page kept half a query, each sent a crawler a slightly
 * different copy of the same answer, and a reader landing on either could not
 * tell which one they wanted.
 *
 * So every entry below is a decision rather than an observation. A
 * `differentiate` entry names the question each page now owns alone and the
 * sentence the page prints so the reader is told which one they landed on. A
 * `consolidate` entry names the surviving page and the retired URL, which has to
 * keep answering through a permanent redirect rather than going dark.
 *
 * `tests/query-ownership.test.ts` binds the register to the pages: it renders
 * every page listed here and fails when a scope line is recorded and not
 * printed, when a page stops linking to the twin it hands its other half to,
 * when two pages in a cluster carry interchangeable descriptions, or when a
 * page drops a phrase it is recorded as still owning. The test is what makes
 * this a register instead of a comment.
 *
 * On restating page copy. The scope lines below are duplicated into the pages
 * themselves rather than imported from here, which is deliberate. Page prose
 * belongs in the page, where it can be read and edited as prose, and a constant
 * interpolated into a paragraph is not prose. The copy is the source and this
 * file is the claim about it, checked on every run.
 */

/**
 * `differentiate` keeps both pages and splits the query between two genuinely
 * different questions. `consolidate` keeps one page and redirects the other,
 * which means `retired` is set and `next.config.ts` has to carry the redirect.
 */
export type OwnershipDecision = "differentiate" | "consolidate";

export interface OwnedPage {
  /** Route path, as `lib/site.ts` spells it. */
  href: string;
  /** The question this page is now the only page on the site answering. */
  question: string;
  /**
   * A sentence the page prints verbatim, so a reader arriving from search is
   * told which of the cluster's questions they have landed on. Plain prose with
   * no interpolation, so the rendered markup can be searched for it.
   */
  scopeLine: string;
  /**
   * A phrase that must appear in this page's `description` and must not appear
   * in any sibling's. Titles and descriptions are where a differentiation is
   * faked most cheaply, so the distinguishing word is recorded rather than
   * assumed.
   */
  descriptionMark: string;
  /**
   * Phrases this page handed to a sibling and must no longer print. Empty when
   * the page gave nothing up, which is the usual case for the page that won the
   * query.
   */
  handedOver?: readonly string[];
}

export interface QueryCluster {
  id: string;
  /** The query the pages were splitting between them. */
  query: string;
  decision: OwnershipDecision;
  /** Two or more pages, the first being the one that owns `query`. */
  pages: readonly OwnedPage[];
  /** Set on a `consolidate` entry: the URL that now redirects. */
  retired?: string;
  reason: string;
  /**
   * Recorded when a different decision was the better one and something outside
   * this work prevented it. A decision with a known better alternative is still
   * a decision, but pretending the alternative was never available is how a
   * compromise gets read later as a preference.
   */
  preferredInstead?: string;
}

export const QUERY_OWNERSHIP: readonly QueryCluster[] = [
  {
    id: "effectivePractice",
    query: "how to practice guitar effectively",
    decision: "differentiate",
    pages: [
      {
        href: "/how-to-practice-guitar-effectively",
        question: "What do I do with the hour, in what order?",
        scopeLine:
          "This page is about the inside of one session: what to isolate, how slow to take it, and what order the parts go in.",
        descriptionMark: "end the session",
        handedOver: ["This is what people mean by deliberate practice"],
      },
      {
        href: "/deliberate-practice-guitar",
        question:
          "How do I get an honest verdict on each attempt with no teacher in the room?",
        scopeLine:
          "This page is about the part of practice you cannot supply by deciding to: an honest verdict on each attempt when nobody else is listening.",
        descriptionMark: "no teacher in the room",
        handedOver: ["tempo ladder builder"],
      },
    ],
    reason:
      "Both pages were written as general arguments for practising with a target, and both ended " +
      "up carrying the same four moves: isolate the failure, drop the tempo until it is clean, " +
      "judge the attempt from outside, stop when attention goes. The effectiveness page even " +
      "restated the deliberate-practice definition in full and then linked to the page that " +
      "defines it. Consolidating was the better call on the merits and is recorded under " +
      "preferredInstead; differentiating is what was available, and it is honest rather than " +
      "cosmetic because the feedback problem really is a separate question. A player alone in a " +
      "room cannot buy a second pair of ears, so how to replace them deserves its own page, and " +
      "the session procedure no longer tries to answer it in a paragraph.",
    preferredInstead:
      "Folding the deliberate-practice page into the effectiveness page and redirecting " +
      "/deliberate-practice-guitar, which is what two essays on one topic usually deserve. It was " +
      "not done here because retiring the URL means removing its entry from GUIDES in " +
      "lib/site.ts, and that file is held by the shared-glossary work in this same tree. " +
      "Consolidating without that edit would leave the sitemap advertising a redirect, which is " +
      "worse than the competition it fixes.",
  },
  {
    id: "weekVersusSession",
    query: "guitar practice schedule",
    decision: "differentiate",
    pages: [
      {
        href: "/guitar-practice-schedule",
        question: "How do I arrange a week that a real week does not destroy?",
        scopeLine:
          "This page is about the week: the minutes it holds, the one session you defend, and the order you cut things in.",
        descriptionMark: "cut order",
        handedOver: ["Make a ten-minute day count"],
      },
      {
        href: "/how-long-to-practice-guitar-each-day",
        question: "How long should one session be, and what goes in it?",
        scopeLine:
          "This page is about one session: how long it stays useful, and what belongs in ten, twenty-five or sixty minutes.",
        descriptionMark: "Duration is the wrong variable",
      },
    ],
    reason:
      "The two questions are genuinely different and the pages were answering both. Three pages " +
      "on this site, these two and the intermediate routine, each printed their own " +
      "minute-by-minute plan for a ten-minute day, which is one question with three answers. The " +
      "contents of a single session belong to the duration page, which exists to size sessions; " +
      "the schedule page keeps the decisions that are only decidable a week at a time, and says " +
      "where the ten-minute shape now lives instead of printing a fourth version of it.",
  },
  {
    id: "routineVersusWeek",
    query: "guitar practice routine",
    decision: "differentiate",
    pages: [
      {
        href: "/guitar-practice-routine-intermediate",
        question:
          "What does a session contain once the beginner gains have run out?",
        scopeLine:
          "This page is about what a session contains once you are past the beginner stage, in five blocks with separate jobs.",
        descriptionMark: "five-block",
      },
      {
        href: "/guitar-practice-schedule",
        question: "How do I arrange a week that a real week does not destroy?",
        scopeLine:
          "This page is about the week: the minutes it holds, the one session you defend, and the order you cut things in.",
        descriptionMark: "cut order",
      },
    ],
    reason:
      "The schedule page already ended by calling itself a container, which was the right " +
      "distinction stated in the last line of the page and nowhere a reader arriving from search " +
      "would see it. The routine is the contents and the schedule is the container, so both now " +
      "say which they are at the top. The schedule page appears in two clusters because it was " +
      "competing on two fronts, with the routine for what a session holds and with the duration " +
      "page for how long it runs.",
  },
  {
    id: "thirtyDayChallenge",
    query: "30 day guitar challenge",
    decision: "differentiate",
    pages: [
      {
        href: "/30-day-guitar-challenge",
        question:
          "How do I choose a finish line I can prove, and how do I read day 30?",
        scopeLine:
          "This is the written guide: how to choose a finish line narrow enough to prove, and how to judge the day 30 recording.",
        descriptionMark: "judge day 30",
      },
      {
        href: "/breakthrough",
        question: "Will something build the four weeks for me?",
        scopeLine:
          "This is the planner rather than the guide: it turns one finish line into four weeks of focuses and a piece of evidence to record each week.",
        descriptionMark: "four-week practice sequence",
      },
    ],
    reason:
      "A tool and the guide that explains when to reach for it are a real pair of pages, and this " +
      "one needed nothing but saying so. The guide carries the judgement a generator cannot make " +
      "for you, which finish line is narrow enough and whether day 30 actually differs from day " +
      "1; the planner carries the arithmetic nobody wants to do by hand. Each now names the other " +
      "as the thing it is not.",
  },
  {
    id: "practicePlateau",
    query: "guitar practice plateau",
    decision: "differentiate",
    pages: [
      {
        href: "/guitar-practice-plateau",
        question: "Why has progress stopped, and what are the causes?",
        scopeLine:
          "This is the written account of the six causes, so you can read them and recognise your own.",
        descriptionMark: "Six habits",
      },
      {
        href: "/diagnose",
        question: "Which of the causes is mine?",
        scopeLine:
          "This is the diagnostic rather than the explanation: nine questions, five blockers scored, and the one worth changing next session.",
        descriptionMark: "Answer nine questions",
      },
    ],
    reason:
      "Same shape as the 30-day pair and the same resolution. Reading six causes and being asked " +
      "nine questions about your own practice are different acts, and the second one is the only " +
      "one that returns a ranking. The guide stops implying it can tell you which cause is yours " +
      "and the diagnostic stops implying it explains them.",
  },
  {
    id: "cleanTone",
    query: "clean guitar tone practice",
    decision: "differentiate",
    pages: [
      {
        href: "/resources/how-to-practice-clean-guitar-tone",
        question: "How do I practise clean tone on my own rig and my own phrase?",
        scopeLine:
          "This is the general protocol: seven days on a phrase you choose, on whatever rig you already own.",
        descriptionMark: "seven-day",
      },
      {
        href: "/resources/jeff-buckley-hallelujah-guitar-tone",
        question: "What does this one recording teach about clean tone?",
        scopeLine:
          "This guide studies one recording rather than teaching clean tone in general.",
        descriptionMark: "close-listening",
      },
    ],
    reason:
      "The weakest of the six, and still real. Both pages end in a recorded test with matched " +
      "takes, which is why they read as twins, but the questions behind them differ: one is a " +
      "protocol a player runs on their own material, the other is a close reading of a specific " +
      "performance that a player arrives at by name. Consolidating would have cost the named " +
      "recording its page for no gain, since the general protocol cannot answer a query about one " +
      "record. The overlap was in the framing, so the framing is what changed.",
  },
];

/**
 * The cross-domain question, recorded as a proposal and deliberately not acted
 * on. This one is a positioning decision about two products rather than a page
 * edit, and the two repositories have different owners, so it is written down
 * with its tradeoffs for a human to settle.
 *
 * Nothing here moves or unpublishes the voice track.
 * `tests/query-ownership.test.ts` asserts that: `/learn/voice` is still in the
 * route registry, still in the sitemap, and still reachable, so the proposal
 * cannot be quietly enacted by whoever reads it next.
 */
export const CROSS_DOMAIN_PROPOSAL = {
  question:
    "Should a seven-level voice curriculum keep being published from guitarhub.org while sing.suedeai.ai publishes the rooms that implement it?",
  /** Where the two surfaces currently stand. Observed, not decided. */
  state: [
    "guitarhub.org publishes /learn/voice and its lessons, which teach breath, onset, range and steady tone.",
    "sing.suedeai.ai publishes /range, /warmups, /breath, /studio and /ear-training, which are the exercises those lessons describe.",
    "The guitar site links out to the sing rooms through STRUMLY.sing and through contracts/suede-vocal.json, and the sing site does not link back.",
  ],
  options: [
    {
      name: "Leave it where it is",
      upside:
        "Nothing moves, no redirect risk, and the voice track keeps the domain authority the guitar pages built. A singer who finds it gets a real curriculum.",
      downside:
        "The domain name argues against the content on every impression, which costs click-through that no on-page work recovers, and the two surfaces go on competing for singing-practice intent from different hosts.",
    },
    {
      name: "Move the curriculum to sing.suedeai.ai and redirect",
      upside:
        "One host owns singing intent, the lessons sit next to the rooms that implement them, and the name stops contradicting the page.",
      downside:
        "It is the most expensive option and the riskiest: over a hundred lesson URLs, a redirect map, the access gate in lib/learning/access.ts and the indexability that follows it, and a vendored contract in the other direction. Voice would arrive on a host with no curriculum surface and would have to be rebuilt there before anything could be redirected into it.",
    },
    {
      name: "Keep the curriculum here and give sing the intent",
      upside:
        "Cheapest honest split: the guitar site keeps teaching voice to the readers it already has but stops bidding for singing queries, and sing owns the rooms and the search intent for them.",
      downside:
        "Requires deciding what the voice track is for if it is not for search, and the answer is probably the existing learners rather than new ones. Wasted work if the curriculum later moves anyway.",
    },
  ],
  recommendation:
    "The third option, as a holding position, and the second as the eventual one. The voice track earns its place for readers who are already here and cannot win singing queries from a domain called guitarhub, so the cheap move is to stop trying: keep the lessons indexable and stop tuning them toward the same queries the sing rooms want. Moving them is right and is a project rather than a pass, and it should not start until sing has a curriculum surface of its own to receive them.",
  decidedBy: null,
} as const;
