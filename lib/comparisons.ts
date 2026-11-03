/**
 * Competitor facts for the /compare pages, and the GuitarHub facts they are
 * set against.
 *
 * Every competitor statement below was checked on the date in
 * `COMPARISONS_VERIFIED` (lib/site.ts) against the URLs in that competitor's
 * `sources`, and the pages print those sources under each comparison. Prices
 * move: re-check every source before changing a number or the date, and quote
 * a price only with "as of" the verified month beside it.
 *
 * GuitarHub's side is never typed as a number here. It is counted from the
 * curriculum, the drill catalog and the route registry, so a comparison cannot
 * outlive the product it describes. GuitarHub claims stay inside what the code
 * and the App Store listing support: written lessons, on-device microphone
 * measurement, free browser tools, an iPhone app and one lifetime price.
 */

import { DRILLS } from "@/lib/advanced/drills";
import { allLessons, curricula } from "@/lib/learning/curriculum";
import {
  APP_STORE,
  COMPARISONS,
  COMPARISONS_VERIFIED,
  GUIDES,
  LIFETIME,
  SITE_NAME,
  SITE_URL,
  TOOLS,
  spellOut,
  type SiteEntry,
} from "@/lib/site";
import type { Crumb } from "@/lib/breadcrumbs";

export type Source = { label: string; url: string };

export type Faq = {
  /** Stable anchor id. */
  id: string;
  q: string;
  /** Plain text only: it is copied verbatim into the FAQPage JSON-LD. */
  a: string;
};

export type CompetitorSlug =
  | "fender-play"
  | "yousician"
  | "justinguitar"
  | "guitar-tricks"
  | "ultimate-guitar";

/** One row of the side-by-side table. Same keys for GuitarHub and each competitor. */
export type ComparisonRow =
  | "price"
  | "free"
  | "format"
  | "feedback"
  | "songs"
  | "structure"
  | "platforms"
  | "instruments";

export const ROW_LABELS: Readonly<Record<ComparisonRow, string>> = {
  price: "Price (as of November 2026)",
  free: "Free to start",
  format: "Lesson format",
  feedback: "Feedback while you play",
  songs: "Songs",
  structure: "Practice structure",
  platforms: "Platforms",
  instruments: "Instruments",
};

export const ROW_ORDER: readonly ComparisonRow[] = [
  "price",
  "free",
  "format",
  "feedback",
  "songs",
  "structure",
  "platforms",
  "instruments",
];

export type Competitor = {
  slug: CompetitorSlug;
  name: string;
  /** Who publishes it, as named on its own store listing or site. */
  maker: string;
  /** One factual sentence: what it is. */
  summary: string;
  /** The verified price sentence, already carrying "As of November 2026". */
  pricing: string;
  /** Recurring yearly cost in USD used for the cost comparison, when one is published. */
  yearlyUsd?: number;
  /** Recurring monthly cost in USD, when one is published. */
  monthlyUsd?: number;
  /** How it teaches, in one paragraph of verified facts. */
  teaching: string;
  /** The short answer that opens the head-to-head page. */
  vsAnswer: string;
  /** The short answer that opens the alternatives page. */
  alternativesAnswer: string;
  /** What GuitarHub gives this competitor's audience, one point per entry. */
  advantages: readonly { title: string; body: string }[];
  /** Table cells for this competitor. */
  cells: Readonly<Record<ComparisonRow, string>>;
  /** One-line cell for the alternatives tables on other pages. */
  model: string;
  vsFaqs: readonly Faq[];
  alternativesFaqs: readonly Faq[];
  sources: readonly Source[];
};

// ── GuitarHub, counted rather than typed ────────────────────────────────────

const GUITAR_LESSONS = allLessons("guitar");
const SONG_COMPANIONS = GUITAR_LESSONS.filter(
  ({ lesson, level }) => lesson.type === "song" && !level.stage,
).length;
const STAGE_WORD = spellOut(curricula.guitar.levels.filter((level) => level.stage).length);
/** The free tools by name, from the registry: "guitar tuner and metronome, ... and practice evidence log". */
const TOOL_NAMES = (() => {
  const names = TOOLS.map((tool) => tool.title.charAt(0).toLowerCase() + tool.title.slice(1));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
})();

export const GUITARHUB = {
  lessons: GUITAR_LESSONS.length,
  songCompanions: SONG_COMPANIONS,
  drills: DRILLS.length,
  tools: TOOLS.length,
  guides: GUIDES.length,
  price: LIFETIME.display,
  priceUsd: LIFETIME.price,
  oneTime: LIFETIME.oneTime,
} as const;

export const GUITARHUB_CELLS: Readonly<Record<ComparisonRow, string>> = {
  price: `${LIFETIME.oneTime} for lifetime lesson access in ${APP_STORE.name} (US App Store); no renewals`,
  free: `The first module in the app, ${TOOLS.length} browser practice tools, the ${DRILLS.length}-drill Advanced Lab and ${GUIDES.length} written guides, with no account`,
  format: `${GUITAR_LESSONS.length} written, step-by-step lessons with diagrams, reference sounds and a practice task in every lesson`,
  feedback: "Microphone scoring of pitch and attack timing in lessons and Advanced Lab drills, measured on your device and never uploaded",
  songs: `${SONG_COMPANIONS} popular-song practice companions with original drills and links to full-song tutorials`,
  structure: "A 30-day method: record a baseline, isolate one problem, reconnect it to the song, then record again and compare",
  platforms: "iPhone and iPad app, plus free practice tools in any web browser",
  instruments: "Guitar, with voice lessons included in the same app",
};

export const GUITARHUB_MODEL = `${LIFETIME.oneTime}, lifetime lessons; free browser tools`;

export const GUITARHUB_SOURCES: readonly Source[] = [
  { label: `${APP_STORE.name} on the App Store`, url: APP_STORE.ios },
  { label: "GuitarHub FAQ", url: `${SITE_URL}/faq` },
  { label: "GuitarHub guitar curriculum", url: `${SITE_URL}/learn/guitar` },
];

// ── Competitors ──────────────────────────────────────────────────────────────

const AS_OF = "As of November 2026";

/** Months of a monthly plan that cost more than GuitarHub's lifetime price. */
function monthsToPassLifetime(monthly: number): number {
  return Math.floor(LIFETIME.price / monthly) + 1;
}

const FENDER: Competitor = {
  slug: "fender-play",
  name: "Fender Play",
  maker: "Fender",
  summary:
    "Fender Play is Fender's subscription lesson service for guitar, bass and ukulele, with more than 3,000 short video lessons and a library of over 1,000 songs.",
  pricing: `${AS_OF}, Fender Play costs $19.99 a month or $149.99 a year in the US, with a 7-day free trial on the monthly plan and a 14-day free trial on the annual plan.`,
  monthlyUsd: 19.99,
  yearlyUsd: 149.99,
  teaching:
    "Fender Play teaches through short instructor videos arranged into a path you set by instrument and genre. Its practice mode adds a metronome and tempo control, lessons carry scrolling tab, chord charts and backing tracks, and guided lessons use MatchMySound listening technology to score your playing. Streaks and practice reminders keep the habit going.",
  vsAnswer: `GuitarHub gives a guitarist the full course for ${LIFETIME.oneTime}, where Fender Play is a subscription at $19.99 a month or $149.99 a year (as of November 2026). GuitarHub pairs ${GUITAR_LESSONS.length} guided lessons with free browser practice tools, a free ${DRILLS.length}-drill Advanced Lab and a 30-day method that ends every month with a recording you can compare against day one.`,
  alternativesAnswer: `The strongest Fender Play alternative for a guitarist is GuitarHub: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime} instead of a recurring subscription, free practice tools and a free Advanced Lab in any browser, and a method built to prove progress with recordings.`,
  advantages: [
    {
      title: "Pay once and keep the course",
      body: `Fender Play's annual plan is $149.99 every year. GuitarHub lifetime access is ${LIFETIME.oneTime}, and the monthly Fender Play plan passes that total in month ${monthsToPassLifetime(19.99)}.`,
    },
    {
      title: "Recorded proof in place of streaks",
      body: "GuitarHub's method starts the month with a baseline recording and ends it with the same take, so progress is something you hear side by side. The practice evidence log reads what actually moved across your sessions.",
    },
    {
      title: "Free tools that open in a browser",
      body: `The tuner and metronome, the tempo ladder, the session builder and the rest of the ${TOOLS.length} GuitarHub tools run in any browser with no account, and keep what you enter on your own device.`,
    },
    {
      title: "Advanced drills included at no cost",
      body: `The Advanced Lab gives experienced players ${DRILLS.length} scored drills across technique, theory, rhythm, ear training, fretboard and tone, free on the web.`,
    },
  ],
  cells: {
    price: "Subscription: $19.99 a month or $149.99 a year",
    free: "7-day trial on the monthly plan, 14-day trial on the annual plan",
    format: "3,000+ short video lessons with instructors",
    feedback: "MatchMySound listening feedback in guided lessons",
    songs: "1,000+ song library with tab, chord charts and backing tracks",
    structure: "Path chosen by instrument and genre, with streaks and practice reminders",
    platforms: "iOS, Android and web browser",
    instruments: "Guitar, bass and ukulele",
  },
  model: "Subscription, $19.99 a month or $149.99 a year; video lessons",
  vsFaqs: [
    {
      id: "is-guitarhub-cheaper-than-fender-play",
      q: "Is GuitarHub cheaper than Fender Play?",
      a: `Yes. GuitarHub lifetime lesson access is ${LIFETIME.oneTime} in the US App Store. As of November 2026, Fender Play is $149.99 a year on the annual plan, and its $19.99 monthly plan passes ${LIFETIME.display} in month ${monthsToPassLifetime(19.99)}.`,
    },
    {
      id: "how-do-guitarhub-lessons-work",
      q: "How do GuitarHub lessons compare with Fender Play's video lessons?",
      a: "GuitarHub lessons are written, step-by-step lessons with chord diagrams, reference sounds and a practice task in every lesson, so you work at your own pace and check each step against the page. Song companions link out to full-song video tutorials, and microphone exercises score pitch and timing on your device.",
    },
    {
      id: "can-i-try-guitarhub-free",
      q: "Can I try GuitarHub before I pay?",
      a: `Yes. The first module is free in ${APP_STORE.name}, and the ${TOOLS.length} practice tools, the ${DRILLS.length}-drill Advanced Lab, the A-to-D chord routine and the written guides are free on guitarhub.org with no account.`,
    },
    {
      id: "guitarhub-or-fender-play-for-beginners",
      q: "Is GuitarHub good for beginners coming from Fender Play?",
      a: "Yes. The guitar path starts at the first foundations: holding the guitar, tuning it and playing one clean note, then works up through open chords, strumming, barre chords and the whole neck. The five-question level check on guitarhub.org/start places you at the right stage.",
    },
  ],
  alternativesFaqs: [
    {
      id: "best-fender-play-alternative",
      q: "What is the best alternative to Fender Play?",
      a: `GuitarHub, for a guitarist who wants a complete course without a subscription: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime}, free browser practice tools, a free ${DRILLS.length}-drill Advanced Lab and a method that proves progress with before-and-after recordings.`,
    },
    {
      id: "fender-play-alternative-without-subscription",
      q: "Is there a Fender Play alternative without a monthly subscription?",
      a: `Yes. GuitarHub sells lifetime lesson access as one in-app purchase, ${LIFETIME.oneTime} on the US App Store, and it never renews. Other countries' App Stores charge their local price.`,
    },
    {
      id: "free-fender-play-alternative",
      q: "What can I use for free instead of Fender Play?",
      a: `GuitarHub's tuner and metronome, ${TOOLS.length - 1} other practice tools, the Advanced Lab drills, the A-to-D chord routine and ${GUIDES.length} written guides are free on guitarhub.org, and the first lesson module is free in the iPhone app.`,
    },
  ],
  sources: [
    { label: "Fender Play: Learn Guitar on the App Store", url: "https://apps.apple.com/us/app/fender-play-learn-guitar/id1226057939" },
    { label: "Fender Play subscription (fender.com)", url: "https://www.fender.com/products/fender-play-subscription" },
    { label: "Fender Play Free Trial FAQs", url: "https://play-support.fender.com/hc/en-us/articles/44538271886235-Free-Trial-FAQs" },
    { label: "What devices can I use to access Fender Play?", url: "https://play-support.fender.com/hc/en-us/articles/44539206579483-What-devices-can-I-use-to-access-Fender-Play" },
    { label: "Fender Play on Google Play", url: "https://play.google.com/store/apps/details?id=com.fender.play" },
  ],
};

const YOUSICIAN: Competitor = {
  slug: "yousician",
  name: "Yousician",
  maker: "Yousician Ltd",
  summary:
    "Yousician is an interactive music learning app for guitar, bass and singing that listens through your microphone while you play along, with more than 10,000 lessons, exercises and songs.",
  pricing: `${AS_OF}, the US App Store lists Yousician's one-instrument plan at $19.99 a month or $119.99 a year, and Premium+ at $29.99 a month or $159.99 to $179.99 a year. Yousician offers a 7-day free trial of Premium+.`,
  monthlyUsd: 19.99,
  yearlyUsd: 119.99,
  teaching:
    "Yousician teaches through play-along lessons and exercises: the app listens through the microphone on your phone or computer and gives instant feedback while you play. A structured course runs from first chords to improvisation, songs play with interactive tabs, and progress is tracked across more than 300 techniques and styles.",
  vsAnswer: `GuitarHub gives you scored practice and a complete guitar course for ${LIFETIME.oneTime}, where Yousician is a subscription from $19.99 a month or $119.99 a year for one instrument (as of November 2026). GuitarHub measures pitch and timing on your device, adds a free ${DRILLS.length}-drill Advanced Lab and free browser tools, and builds every month around a recording you can compare.`,
  alternativesAnswer: `The leading Yousician alternative is GuitarHub: microphone-scored guitar practice, ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime} with no renewals, and a free Advanced Lab of ${DRILLS.length} scored drills in any browser.`,
  advantages: [
    {
      title: "One price, no renewals",
      body: `Yousician's one-instrument plan is $119.99 a year as of November 2026. GuitarHub lifetime access is ${LIFETIME.oneTime}, and the free first module lets you start before you pay anything.`,
    },
    {
      title: "Scoring that stays on your device",
      body: "GuitarHub's microphone exercises measure pitch and attack timing live on your phone or computer. Audio is never uploaded, and nothing on the site trains a model on your playing.",
    },
    {
      title: "Every result labeled for what it measured",
      body: "Microphone scores, reading quizzes and self-checks are labeled separately in every lesson, so you always know which kind of evidence you are looking at.",
    },
    {
      title: "A month that ends with proof",
      body: "The GuitarHub method closes each month by recording the same performance you recorded on day one, then comparing the two takes. The scores guide practice; the recording proves the change.",
    },
  ],
  cells: {
    price: "Subscription: one instrument $19.99 a month or $119.99 a year; Premium+ $29.99 a month",
    free: "7-day free trial of Premium+",
    format: "Interactive play-along lessons, exercises and songs (10,000+)",
    feedback: "Real-time microphone feedback while you play",
    songs: "Thousands of play-along songs with interactive tabs, new songs weekly",
    structure: "Structured course with progress tracked across 300+ techniques",
    platforms: "iOS, Android, macOS and Windows",
    instruments: "Guitar, bass and singing",
  },
  model: "Subscription from $19.99 a month or $119.99 a year; play-along app",
  vsFaqs: [
    {
      id: "does-guitarhub-listen-like-yousician",
      q: "Does GuitarHub listen to you play like Yousician does?",
      a: `Yes. GuitarHub's microphone exercises score single-note pitch and attack timing in supported lessons, and every one of the ${DRILLS.length} Advanced Lab drills is scored live through your microphone. The audio is analyzed on your device and is never uploaded.`,
    },
    {
      id: "is-guitarhub-cheaper-than-yousician",
      q: "Is GuitarHub cheaper than Yousician?",
      a: `Yes. GuitarHub lifetime lesson access is ${LIFETIME.oneTime} in the US App Store. As of November 2026, Yousician's one-instrument plan is $119.99 a year or $19.99 a month on the US App Store, and the monthly plan passes ${LIFETIME.display} in month ${monthsToPassLifetime(19.99)}.`,
    },
    {
      id: "guitarhub-on-computer",
      q: "Can I use GuitarHub on a computer?",
      a: `Yes. The ${TOOLS.length} practice tools, the Advanced Lab drills, the written guides and the A-to-D chord routine run in any modern web browser on guitarhub.org. The guided lessons with lifetime access run in ${APP_STORE.name} on iPhone and iPad.`,
    },
    {
      id: "guitarhub-for-experienced-players",
      q: "Is GuitarHub for experienced players too?",
      a: `Yes. The free Advanced Lab has ${DRILLS.length} scored drills for experienced players across technique, theory, rhythm, ear training, fretboard, improvisation, repertoire and tone, and the level check sends advanced players straight to it.`,
    },
  ],
  alternativesFaqs: [
    {
      id: "best-yousician-alternative",
      q: "What is the best Yousician alternative?",
      a: `GuitarHub, for a guitarist who wants microphone-scored practice without a subscription: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime}, a free ${DRILLS.length}-drill Advanced Lab and free browser practice tools.`,
    },
    {
      id: "yousician-alternative-one-time-purchase",
      q: "Is there a Yousician alternative you buy once?",
      a: `Yes. GuitarHub lifetime lesson access is one in-app purchase, ${LIFETIME.oneTime} on the US App Store, with no renewals. One purchase covers the guitar course and the voice track in the app.`,
    },
    {
      id: "free-yousician-alternative",
      q: "Is there a free alternative to Yousician for guitar?",
      a: `GuitarHub's Advanced Lab is free: ${DRILLS.length} drills scored live through your microphone in the browser, with no account. The tuner, metronome and the other practice tools are free too, and the first lesson module is free in the iPhone app.`,
    },
  ],
  sources: [
    { label: "Yousician: Learn & Play Guitar on the App Store", url: "https://apps.apple.com/us/app/yousician-learn-play-guitar/id959883039" },
    { label: "Yousician guitar lessons (yousician.com)", url: "https://yousician.com/guitar" },
    { label: "Yousician on Google Play", url: "https://play.google.com/store/apps/details?id=com.yousician.yousician" },
  ],
};

const JUSTINGUITAR: Competitor = {
  slug: "justinguitar",
  name: "JustinGuitar",
  maker: "Justin Sandercoe; app published by Musopia",
  summary:
    "JustinGuitar is Justin Sandercoe's guitar teaching site and app. The Beginner Grade 1 course is free on justinguitar.com, and the Justin Guitar Lessons & Songs app is a paid subscription with 210 video lessons and more than 1,500 songs.",
  pricing: `${AS_OF}, the Beginner Grade 1 course on justinguitar.com is free. The US App Store lists the app's Full Access at $8.99 a month or $64.99 a year, with Unlimited Access plans listed up to $129.99 a year.`,
  monthlyUsd: 8.99,
  yearlyUsd: 64.99,
  teaching:
    "JustinGuitar teaches through Justin Sandercoe's video lessons, organized into graded modules. The app covers beginner Grades 1 to 3 in 210 video lessons, with a 10-minute daily practice routine, One-Minute Chord Change exercises, a color-chord system, a tuner and a song player with adjustable tempo.",
  vsAnswer: `GuitarHub gives you a guided guitar course, measured practice and a 30-day method for ${LIFETIME.oneTime}, with no app subscription to renew. JustinGuitar pairs a free website course with a paid app from $8.99 a month or $64.99 a year (as of November 2026). GuitarHub adds microphone-scored exercises, ${TOOLS.length} free browser tools and a free ${DRILLS.length}-drill Advanced Lab.`,
  alternativesAnswer: `The best next step from JustinGuitar is GuitarHub: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime} with no renewals, microphone-scored exercises, free practice tools and a free Advanced Lab that takes you past the beginner grades.`,
  advantages: [
    {
      title: "Practice that measures itself",
      body: "GuitarHub's microphone exercises score pitch and attack timing on your device, and the tempo ladder and song readiness score show which passage is ready and which is not.",
    },
    {
      title: "A clear path past the beginner grades",
      body: `The GuitarHub curriculum runs through ${STAGE_WORD} stages, from the first clean note to barre chords, the whole neck and a signature piece, and the free Advanced Lab adds ${DRILLS.length} scored drills for experienced players.`,
    },
    {
      title: "One purchase for the full course",
      body: `GuitarHub lifetime access is ${LIFETIME.oneTime}, with no app subscription to renew each year.`,
    },
    {
      title: "Proof at the end of every month",
      body: "The method starts with a baseline recording and ends with the same take thirty days later, so you hear the change instead of guessing at it.",
    },
  ],
  cells: {
    price: "Website course free; app from $8.99 a month or $64.99 a year",
    free: "Beginner Grade 1 course on justinguitar.com",
    format: "Video lessons (210 in the app, 36+ hours)",
    feedback: "Interactive exercises, One-Minute Chord Changes and progress tracking",
    songs: "1,500+ songs in the app song player",
    structure: "Graded beginner course with a 10-minute daily practice routine",
    platforms: "Web, iOS and Android",
    instruments: "Guitar",
  },
  model: "Free website course; app from $8.99 a month or $64.99 a year",
  vsFaqs: [
    {
      id: "guitarhub-vs-justinguitar-difference",
      q: "What is the main difference between GuitarHub and JustinGuitar?",
      a: "GuitarHub is built around measured practice and proof: microphone-scored exercises, practice tools that turn a hard passage into a tempo ladder, and a 30-day method that ends with a recording you compare against day one. JustinGuitar is built around Justin Sandercoe's graded video lessons.",
    },
    {
      id: "guitarhub-justinguitar-price",
      q: "How much does GuitarHub cost compared with the JustinGuitar app?",
      a: `GuitarHub lifetime lesson access is ${LIFETIME.oneTime} in the US App Store, with no renewals. As of November 2026, the US App Store lists JustinGuitar app Full Access at $8.99 a month or $64.99 a year.`,
    },
    {
      id: "guitarhub-one-minute-changes",
      q: "Does GuitarHub help with chord changes?",
      a: "Yes. The GuitarHub guide to changing chords faster covers anchor fingers, guide fingers and one-minute changes with exact fingerings for the common open-chord pairs, and the free A-to-D routine drills that change in seven timed blocks.",
    },
    {
      id: "guitarhub-advanced-players",
      q: "What does GuitarHub offer after the beginner stage?",
      a: `Stages five to seven of the curriculum cover barre chords, the whole neck and a signature piece, and the free Advanced Lab adds ${DRILLS.length} scored drills in technique, theory, rhythm, ear training, fretboard, improvisation, repertoire and tone.`,
    },
  ],
  alternativesFaqs: [
    {
      id: "best-justinguitar-alternative",
      q: "What is a good alternative to JustinGuitar?",
      a: `GuitarHub: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime}, microphone-scored exercises, ${TOOLS.length} free browser practice tools and a free ${DRILLS.length}-drill Advanced Lab, all organized around a 30-day method you can prove with recordings.`,
    },
    {
      id: "justinguitar-alternative-intermediate",
      q: "Where should I go after JustinGuitar's beginner course?",
      a: "Take GuitarHub's five-question level check at guitarhub.org/start. It places you at stage 1, stage 3 or the free Advanced Lab based on your chords, changes, barre chords and soloing.",
    },
    {
      id: "justinguitar-alternative-no-subscription",
      q: "Is there a JustinGuitar app alternative without a subscription?",
      a: `Yes. GuitarHub lifetime lesson access is one purchase, ${LIFETIME.oneTime} on the US App Store, and it covers the full guitar course and the voice track in the app.`,
    },
  ],
  sources: [
    { label: "Justin Guitar Lessons & Songs on the App Store", url: "https://apps.apple.com/us/app/justin-guitar-lessons-songs/id1176125504" },
    { label: "JustinGuitar Beginner Grade 1 FAQ", url: "https://www.justinguitar.com/faq/beginner-course-grade-1" },
    { label: "JustinGuitar free beginner course", url: "https://www.justinguitar.com/signup/free-beginner-course" },
    { label: "Justin Guitar Lessons & Songs on Google Play", url: "https://play.google.com/store/apps/details?id=net.musopia.fourchordsjustin" },
  ],
};

const GUITAR_TRICKS: Competitor = {
  slug: "guitar-tricks",
  name: "Guitar Tricks",
  maker: "Guitar Tricks Inc.",
  summary:
    "Guitar Tricks is a video lesson subscription that has taught guitar online since 1998, with more than 11,000 lessons, a Core Learning System for beginners and hundreds of song tutorials.",
  pricing: `${AS_OF}, the Guitar Tricks app lists Full Access at $19.99 a month or $179.99 a year in the US after a 7-day free trial, and its free version rotates a selection of lessons.`,
  monthlyUsd: 19.99,
  yearlyUsd: 179.99,
  teaching:
    "Guitar Tricks teaches through short, incremental instructor videos. Its Core Learning System takes beginners through the basics, then branches into styles such as acoustic, rock, country and blues. Members get downloadable tab and notation, a scale finder, a chord finder, a reference tuner, a fretboard trainer and a progress system.",
  vsAnswer: `GuitarHub gives you a focused guitar course for ${LIFETIME.oneTime}, where Guitar Tricks is a video subscription at $19.99 a month or $179.99 a year in its app (as of November 2026). Instead of a library to browse, GuitarHub hands you one path, microphone-scored exercises, free browser tools and a 30-day method that proves each month's progress with a recording.`,
  alternativesAnswer: `The top Guitar Tricks alternative is GuitarHub: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime} instead of $179.99 a year, a single clear path through ${STAGE_WORD} stages, free practice tools and a free ${DRILLS.length}-drill Advanced Lab.`,
  advantages: [
    {
      title: "One path instead of a library to browse",
      body: `GuitarHub lessons follow a fixed order through ${STAGE_WORD} stages, with a place kept between visits, so the next lesson is always the right one. The level check places you at the stage that fits.`,
    },
    {
      title: "A fraction of the yearly cost",
      body: `Guitar Tricks Full Access is $179.99 a year in its app as of November 2026. GuitarHub lifetime access is ${LIFETIME.oneTime}, once.`,
    },
    {
      title: "Practice that proves itself",
      body: "Microphone exercises score pitch and timing on your device, and the method closes each month with a recording you compare against day one.",
    },
    {
      title: "Free tools for the hard passage",
      body: `The tempo ladder, the session builder and the song readiness score are among ${TOOLS.length} free browser tools that turn one difficult passage into a plan you can run this week.`,
    },
  ],
  cells: {
    price: "Subscription in app: $19.99 a month or $179.99 a year",
    free: "Rotating free lessons and a 7-day free trial in the app",
    format: "Video lessons (11,000+)",
    feedback: "Progress system, fretboard trainer and reference tuner",
    songs: "Hundreds of song tutorials with downloadable tab and notation",
    structure: "Core Learning System, then style paths such as acoustic, rock, country and blues",
    platforms: "Web, iOS and Android",
    instruments: "Guitar",
  },
  model: "Subscription, $19.99 a month or $179.99 a year in app; video lessons",
  vsFaqs: [
    {
      id: "is-guitarhub-cheaper-than-guitar-tricks",
      q: "Is GuitarHub cheaper than Guitar Tricks?",
      a: `Yes. GuitarHub lifetime lesson access is ${LIFETIME.oneTime} in the US App Store. As of November 2026, Guitar Tricks Full Access in its app is $179.99 a year or $19.99 a month, and the monthly plan passes ${LIFETIME.display} in month ${monthsToPassLifetime(19.99)}.`,
    },
    {
      id: "guitarhub-structure-vs-guitar-tricks",
      q: "How is GuitarHub structured compared with Guitar Tricks?",
      a: `GuitarHub is one guided path in ${STAGE_WORD} stages, from the first clean note to barre chords, the whole neck and a signature piece, with popular-song companions alongside. Each lesson pairs written instruction with a practice task, and the 30-day method keeps practice on one provable change at a time.`,
    },
    {
      id: "guitarhub-tools-vs-guitar-tricks",
      q: "What practice tools does GuitarHub include?",
      a: `${TOOLS.length} free browser tools: the ${TOOL_NAMES}. None needs an account.`,
    },
  ],
  alternativesFaqs: [
    {
      id: "best-guitar-tricks-alternative",
      q: "What is the best Guitar Tricks alternative?",
      a: `GuitarHub, for a guitarist who wants a clear path and a one-time price: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime}, microphone-scored exercises, free browser tools and a free ${DRILLS.length}-drill Advanced Lab.`,
    },
    {
      id: "cheaper-alternative-to-guitar-tricks",
      q: "Is there a cheaper alternative to Guitar Tricks?",
      a: `Yes. GuitarHub lifetime access is ${LIFETIME.oneTime} once on the US App Store, against $179.99 a year for Guitar Tricks Full Access in its app as of November 2026. GuitarHub's tools, guides and Advanced Lab are free.`,
    },
    {
      id: "guitar-tricks-alternative-beginners",
      q: "Which Guitar Tricks alternative works for beginners?",
      a: "GuitarHub starts at the first foundations, holding the guitar, tuning it and playing one clean note, and keeps your place between visits. The free first module in the iPhone app lets a beginner start today.",
    },
  ],
  sources: [
    { label: "Guitar Lessons - Guitar Tricks on the App Store", url: "https://apps.apple.com/us/app/guitar-lessons-guitar-tricks/id931639254" },
    { label: "Guitar Lessons by GuitarTricks on Google Play", url: "https://play.google.com/store/apps/details?id=com.guitartricks.gt" },
  ],
};

const ULTIMATE_GUITAR: Competitor = {
  slug: "ultimate-guitar",
  name: "Ultimate Guitar",
  maker: "Ultimate Guitar",
  summary:
    "Ultimate Guitar is a chords and tabs catalog of more than a million songs, which it describes as the world's largest, with paid Pro features and UG Courses for lessons.",
  pricing: `${AS_OF}, Ultimate Guitar's chords, tabs and lyrics are free to read. The US App Store lists UG Pro+ at $9.99 for one month or $39.99 for one year, alongside other Pro and sale offers.`,
  monthlyUsd: 9.99,
  yearlyUsd: 39.99,
  teaching:
    "Ultimate Guitar centers on its song catalog: chords, tabs and lyrics for guitar, bass and ukulele, with collections, playlists and personal tabs. A Pro account adds interactive tabs that play note by note, more than 29,000 tabs with backing tracks and synchronized lyrics, a metronome, transposing and a tuner. UG Courses offers over 2,500 lessons across instruments.",
  vsAnswer: `Ultimate Guitar is where you find the tab. GuitarHub is where you learn to play it: ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.oneTime}, free tools that turn a hard passage into a tempo ladder and a readiness score, and a 30-day method that ends with a recording proving the song is under your fingers.`,
  alternativesAnswer: `For a player who wants to learn guitar rather than collect tabs, the best Ultimate Guitar alternative is GuitarHub: a guided ${GUITAR_LESSONS.length}-lesson course for ${LIFETIME.oneTime}, ${TOOLS.length} free practice tools and a free ${DRILLS.length}-drill Advanced Lab.`,
  advantages: [
    {
      title: "From reading a tab to finishing the song",
      body: "GuitarHub's song readiness score checks a song against the parts that break under pressure, and the tempo ladder builder takes one difficult passage from a starting speed to a target in steps.",
    },
    {
      title: "A curriculum in order",
      body: `${GUITAR_LESSONS.length} guided lessons in ${STAGE_WORD} stages, with a practice task in every lesson and a place kept between visits, so you build the skills the tabs assume.`,
    },
    {
      title: "Proof that the song is learned",
      body: "The method records a baseline on day one and the same performance thirty days later. Two takes side by side settle whether the song is finished.",
    },
    {
      title: "Free where you practice",
      body: `The tuner, metronome and the other practice tools run free in any browser, and the ${DRILLS.length} Advanced Lab drills score your playing live through the microphone.`,
    },
  ],
  cells: {
    price: "Free tabs; UG Pro+ $9.99 for one month or $39.99 for one year (US App Store)",
    free: "Chords, tabs and lyrics for 1M+ songs",
    format: "Tabs and chords; UG Courses with 2,500+ lessons across instruments",
    feedback: "Interactive tabs that play note by note (Pro)",
    songs: "1M+ songs; 29,000+ Pro tabs with backing tracks",
    structure: "Tab collections and playlists; UG Courses for guided learning",
    platforms: "Web, iOS and Android",
    instruments: "Guitar, bass, ukulele and more",
  },
  model: "Free tabs; Pro+ $9.99 a month or $39.99 a year; tab catalog",
  vsFaqs: [
    {
      id: "guitarhub-vs-ultimate-guitar-difference",
      q: "What is the difference between GuitarHub and Ultimate Guitar?",
      a: "Ultimate Guitar is a catalog of chords and tabs for more than a million songs. GuitarHub is a guitar course and practice system: guided lessons in order, microphone-scored exercises, free practice tools and a 30-day method that proves progress with recordings.",
    },
    {
      id: "learn-a-song-from-a-tab-with-guitarhub",
      q: "How does GuitarHub help me learn a song from a tab?",
      a: "Score the song with the song readiness tool to find the part that breaks, build a tempo ladder for that passage, plan the minutes with the session builder, and record the full song on day one and day thirty. All of those tools are free in the browser.",
    },
    {
      id: "does-guitarhub-teach-songs",
      q: "Does GuitarHub teach popular songs?",
      a: `Yes. The curriculum includes ${SONG_COMPANIONS} popular-song practice companions, including Wonderwall, Let It Be and Stand By Me, each with original chord drills, a timed practice task and a link to a full-song tutorial.`,
    },
  ],
  alternativesFaqs: [
    {
      id: "best-ultimate-guitar-alternative-for-learning",
      q: "What is the best Ultimate Guitar alternative for learning guitar?",
      a: `GuitarHub: ${GUITAR_LESSONS.length} guided lessons in ${STAGE_WORD} stages for ${LIFETIME.oneTime}, microphone-scored exercises, ${TOOLS.length} free practice tools and a free ${DRILLS.length}-drill Advanced Lab.`,
    },
    {
      id: "ultimate-guitar-alternative-practice-tools",
      q: "Which site has free tools to practice the songs I find on Ultimate Guitar?",
      a: "GuitarHub. The tempo ladder builder, the song readiness score, the session builder, the tuner and metronome and the practice evidence log are free on guitarhub.org, with no account.",
    },
    {
      id: "ultimate-guitar-alternative-one-time",
      q: "Is there a guitar lesson app I can buy once?",
      a: `Yes. GuitarHub lifetime lesson access is ${LIFETIME.oneTime} in the US App Store, with the first module free to try.`,
    },
  ],
  sources: [
    { label: "Ultimate Guitar: Chords & Tabs on the App Store", url: "https://apps.apple.com/us/app/ultimate-guitar-chords-tabs/id357828853" },
    { label: "Ultimate Guitar (ultimate-guitar.com)", url: "https://www.ultimate-guitar.com/" },
    { label: "Ultimate Guitar on Google Play", url: "https://play.google.com/store/apps/details?id=com.ultimateguitar.tabs" },
  ],
};

export const COMPETITORS: readonly Competitor[] = [
  FENDER,
  YOUSICIAN,
  JUSTINGUITAR,
  GUITAR_TRICKS,
  ULTIMATE_GUITAR,
];

export function competitor(slug: CompetitorSlug): Competitor {
  const found = COMPETITORS.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`Unknown competitor ${slug}`);
  return found;
}

// ── Routes, titles and metadata ─────────────────────────────────────────────

export const COMPARE_HREF = "/compare";

export function vsHref(slug: CompetitorSlug): string {
  return `${COMPARE_HREF}/guitarhub-vs-${slug}`;
}

export function alternativesHref(slug: CompetitorSlug): string {
  return `${COMPARE_HREF}/${slug}-alternatives`;
}

export type ComparisonKind = "vs" | "alternatives";

export type ComparisonPageInfo = {
  kind: ComparisonKind;
  competitor: Competitor;
  entry: SiteEntry;
  canonical: string;
  /** The <title>: 60 characters or fewer and names GuitarHub. */
  title: string;
  /** The meta description: 155 characters or fewer. */
  description: string;
  crumbs: readonly Crumb[];
};

const SEARCH_TITLES: Readonly<Record<string, string>> = {
  [vsHref("fender-play")]: "GuitarHub vs Fender Play: Price, Lessons and Tools",
  [vsHref("yousician")]: "GuitarHub vs Yousician: Price, Feedback and Lessons",
  [vsHref("justinguitar")]: "GuitarHub vs JustinGuitar: Lessons, Price and Tools",
  [vsHref("guitar-tricks")]: "GuitarHub vs Guitar Tricks: Price, Path and Tools",
  [vsHref("ultimate-guitar")]: "GuitarHub vs Ultimate Guitar: Tabs vs a Practice Plan",
  [alternativesHref("fender-play")]: "Best Fender Play Alternatives in 2026 | GuitarHub",
  [alternativesHref("yousician")]: "Best Yousician Alternatives in 2026 | GuitarHub",
  [alternativesHref("justinguitar")]: "Best JustinGuitar Alternatives in 2026 | GuitarHub",
  [alternativesHref("guitar-tricks")]: "Best Guitar Tricks Alternatives in 2026 | GuitarHub",
  [alternativesHref("ultimate-guitar")]: "Best Ultimate Guitar Alternatives in 2026 | GuitarHub",
};

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  [vsHref("fender-play")]:
    `GuitarHub vs Fender Play, checked November 2026: a ${LIFETIME.display} lifetime guitar course with free practice tools against a $149.99 a year video subscription.`,
  [vsHref("yousician")]:
    `GuitarHub vs Yousician, checked November 2026: on-device scoring, a ${LIFETIME.display} lifetime course and a free Advanced Lab against a play-along subscription.`,
  [vsHref("justinguitar")]:
    `GuitarHub vs JustinGuitar, checked November 2026: measured practice, free tools and a ${LIFETIME.display} lifetime course next to a graded video course and app.`,
  [vsHref("guitar-tricks")]:
    `GuitarHub vs Guitar Tricks, checked November 2026: one guided path for ${LIFETIME.display} lifetime against an 11,000-lesson video library at $179.99 a year.`,
  [vsHref("ultimate-guitar")]:
    `GuitarHub vs Ultimate Guitar: a tab catalog next to a guided course, free tempo ladders and recorded proof that the song is learned. Checked November 2026.`,
  [alternativesHref("fender-play")]:
    `The best Fender Play alternatives, checked November 2026. GuitarHub leads with ${GUITAR_LESSONS.length} guided lessons for ${LIFETIME.display} once, free tools and a free Advanced Lab.`,
  [alternativesHref("yousician")]:
    `The best Yousician alternatives, checked November 2026. GuitarHub leads with microphone-scored practice, a ${LIFETIME.display} lifetime course and ${DRILLS.length} free drills.`,
  [alternativesHref("justinguitar")]:
    `The best JustinGuitar alternatives, checked November 2026. GuitarHub leads with measured practice, free tools and a ${LIFETIME.display} lifetime guitar course.`,
  [alternativesHref("guitar-tricks")]:
    `The best Guitar Tricks alternatives, checked November 2026. GuitarHub leads with one guided path for ${LIFETIME.display} lifetime, free tools and a free Advanced Lab.`,
  [alternativesHref("ultimate-guitar")]:
    `The best Ultimate Guitar alternatives for learning guitar, checked November 2026. GuitarHub leads with a ${LIFETIME.display} lifetime course and free practice tools.`,
};

/** Everything a /compare/<page> route needs, from its href. Throws on an unknown route. */
export function comparisonPage(href: string): ComparisonPageInfo {
  const entry = COMPARISONS.find((candidate) => candidate.href === href);
  if (!entry) throw new Error(`${href} is not registered in COMPARISONS (lib/site.ts)`);
  const match = COMPETITORS.map((candidate) => ({
    candidate,
    kind: (href === vsHref(candidate.slug) ? "vs" : href === alternativesHref(candidate.slug) ? "alternatives" : null) as ComparisonKind | null,
  })).find(({ kind }) => kind !== null);
  if (!match || !match.kind) throw new Error(`${href} matches no competitor`);
  const canonical = `${SITE_URL}${href}`;
  return {
    kind: match.kind,
    competitor: match.candidate,
    entry,
    canonical,
    title: SEARCH_TITLES[href],
    description: DESCRIPTIONS[href],
    crumbs: [
      { name: SITE_NAME, href: "/" },
      { name: "Compare", href: COMPARE_HREF },
      { name: entry.title, href },
    ],
  };
}

/** "November 3, 2026", for the visible "facts checked" line. */
export const VERIFIED_LABEL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(`${COMPARISONS_VERIFIED}T00:00:00.000Z`));
