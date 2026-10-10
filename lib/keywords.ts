/**
 * Per-route `<meta name="keywords">` terms, in one place.
 *
 * Next.js replaces (does not merge) a parent segment's `keywords` with the
 * child's, so every list here is complete on its own. Terms come from measured
 * search data for guitarhub.org (the `guitarhub`, `guitar` and `apps` keyword
 * groups) and describe what each page actually covers. Lists are lowercase,
 * 5-12 terms, and `tests/meta-keywords.test.ts` fails when a page ships
 * metadata without them.
 *
 * Article pages also pass `keywordsText(route)` into their Article JSON-LD.
 */

export const MIN_KEYWORDS = 5;
/** Page-specific terms are capped at 12; the brand terms ride on top. */
export const MAX_PAGE_KEYWORDS = 12;
/** Brand terms appended to every list (case-insensitive dedupe). */
export const BRAND_KEYWORDS = ["guitarhub", "suede ai"] as const;
export const MAX_KEYWORDS = MAX_PAGE_KEYWORDS + BRAND_KEYWORDS.length;

export const ROUTE_KEYWORDS = {
  "/": [
    "beginner guitar lessons",
    "guitar lessons online",
    "guided guitar lessons",
    "online guitar lessons",
    "learn guitar",
    "how to practice guitar",
    "guitar practice routine",
    "guitar lessons app",
    "guitarhub",
  ],
  "/learn": [
    "learn guitar online",
    "beginner guitar lessons",
    "guided guitar lessons",
    "guitar lessons online",
    "learn guitar and singing",
    "free voice lessons",
    "guitarhub",
  ],
  "/learn/guitar": [
    "beginner guitar lessons",
    "guitar lessons for beginners",
    "guided guitar lessons",
    "online guitar lessons",
    "guitar beginner course",
    "how to play guitar for beginners",
    "guitar chords for beginners",
    "learn guitar",
    "guitarhub",
  ],
  "/learn/voice": [
    "free voice lessons",
    "vocal training",
    "vocal exercises",
    "vocal warm ups for beginners",
    "learn guitar and singing",
    "guitarhub",
  ],
  "/learn/guitar/routine": [
    "a to d chord changes",
    "beginner chord practice routine",
    "guitar practice routine",
    "guitar practice for beginners",
    "guitar practice routine template",
    "guitar chords for beginners",
    "guitar practice log",
    "guitar practice app",
    "guitarhub",
  ],
  "/start": [
    "beginner guitar lessons",
    "guitar lessons for beginners",
    "guitar lessons online",
    "learn guitar",
    "guitar beginner course",
    "guitar goals for beginners",
    "guitarhub",
  ],
  "/advanced": [
    "advanced guitar drills",
    "guitar practice exercises",
    "legato guitar",
    "sweep picking",
    "guitar bends",
    "guitar modes",
    "guitar ear training",
    "guitar fretboard",
    "guitar improvisation",
    "guitarhub",
  ],
  "/practice": [
    "guitar tuner",
    "online guitar tuner",
    "guitar tuner app",
    "how to tune a guitar",
    "tune the guitar online",
    "online metronome",
    "practicing guitar with a metronome",
    "guitarhub",
  ],
  "/tools": [
    "guitar practice app free",
    "guitar practice app",
    "guitar practice tools",
    "guitar practice routine generator",
    "guitar practice log",
    "guitar progress tracker",
    "practicing guitar with a metronome",
    "guitar tuner",
    "guitarhub",
  ],
  "/breakthrough": [
    "30 day guitar challenge",
    "guitar practice schedule",
    "guitar practice routine",
    "guitar practice routine template",
    "guitar goals for beginners",
    "guitar practice plan",
    "guitarhub",
  ],
  "/diagnose": [
    "guitar practice plateau",
    "why can't i play guitar fast",
    "how to practice guitar effectively",
    "deliberate practice guitar",
    "what to practice on guitar to get better",
    "guitar practice tips",
    "guitarhub",
  ],
  "/session": [
    "guitar practice routine generator",
    "guitar practice routine",
    "guitar practice schedule",
    "guitar practice routine template",
    "how long to practice guitar",
    "guitar practice tips",
    "guitarhub",
  ],
  "/tempo": [
    "practicing guitar with a metronome",
    "why can't i play guitar fast",
    "how to play guitar faster",
    "metronome practice",
    "guitar practice exercises",
    "guitar practice tips",
    "guitarhub",
  ],
  "/readiness": [
    "how to memorize songs on guitar",
    "learn songs guitar",
    "how to play guitar songs",
    "guitar practice tips",
    "guitar progress tracker",
    "guitarhub",
  ],
  "/log": [
    "guitar practice log",
    "guitar practice spreadsheet",
    "guitar progress tracker",
    "guitar practice app free",
    "guitar practice plateau",
    "guitarhub",
  ],
  "/method": [
    "how to practice guitar",
    "how to practice guitar effectively",
    "deliberate practice guitar",
    "guitar practice routine",
    "guitar practice plateau",
    "guitar practice tips",
    "guitar method",
    "guitarhub",
  ],
  "/how-to-practice-guitar-effectively": [
    "how to practice guitar effectively",
    "how to practice guitar",
    "guitar practice tips",
    "guitar practice tips for beginners",
    "guitar practice routine",
    "deliberate practice guitar",
    "what to practice on guitar to get better",
    "guitarhub",
  ],
  "/guitar-practice-plateau": [
    "guitar practice plateau",
    "why can't i play guitar fast",
    "deliberate practice guitar",
    "how to practice guitar effectively",
    "what to practice on guitar to get better",
    "guitar practice tips",
    "guitarhub",
  ],
  "/deliberate-practice-guitar": [
    "deliberate practice guitar",
    "how to practice guitar effectively",
    "how to practice guitar",
    "guitar practice tips",
    "guitar practice plateau",
    "what to practice on guitar to get better",
    "guitarhub",
  ],
  "/30-day-guitar-challenge": [
    "30 day guitar challenge",
    "guitar practice schedule",
    "guitar practice routine",
    "guitar practice for beginners",
    "guitar goals for beginners",
    "guitar practice routine template",
    "learn guitar",
    "guitarhub",
  ],
  "/guitar-practice-routine-intermediate": [
    "guitar practice routine",
    "intermediate guitar practice routine",
    "guitar practice routine template",
    "guitar practice exercises",
    "guitar practice schedule",
    "guitar practice tips",
    "guitarhub",
  ],
  "/how-long-to-practice-guitar-each-day": [
    "how long should i practice guitar a day",
    "how long to practice guitar",
    "guitar practice schedule",
    "guitar practice routine",
    "guitar practice tips",
    "how to practice guitar",
    "guitarhub",
  ],
  "/guitar-practice-schedule": [
    "guitar practice schedule",
    "guitar practice routine",
    "guitar practice routine template",
    "how long should i practice guitar a day",
    "30 day guitar challenge",
    "guitar practice tips",
    "guitarhub",
  ],
  "/why-cant-i-play-guitar-fast": [
    "why can't i play guitar fast",
    "how to play guitar faster",
    "practicing guitar with a metronome",
    "guitar practice plateau",
    "deliberate practice guitar",
    "guitar practice tips",
    "guitarhub",
  ],
  "/how-to-memorize-songs-on-guitar": [
    "how to memorize songs on guitar",
    "learn songs guitar",
    "how to play guitar songs",
    "how to practice guitar",
    "guitar practice tips",
    "guitarhub",
  ],
  "/practicing-guitar-with-a-metronome": [
    "practicing guitar with a metronome",
    "metronome practice",
    "why can't i play guitar fast",
    "guitar practice exercises",
    "how to practice guitar",
    "guitar practice tips",
    "guitarhub",
  ],
  "/guides": [
    "guitar practice tips",
    "guitar practice tips for beginners",
    "how to practice guitar",
    "guitar practice routine",
    "guitar practice schedule",
    "how long to practice guitar",
    "guitar practice plateau",
    "guitarhub",
  ],
  "/resources/print-the-quiet": [
    "guitar tone",
    "clean guitar tone",
    "guitar tone practice",
    "hallelujah guitar tone",
    "recording guitar",
    "guitarhub",
  ],
  "/resources/how-to-practice-clean-guitar-tone": [
    "clean guitar tone",
    "guitar tone practice",
    "how to get a clean guitar tone",
    "guitar dynamics",
    "guitar tone",
    "guitarhub",
  ],
  "/resources/jeff-buckley-hallelujah-guitar-tone": [
    "hallelujah guitar tone",
    "jeff buckley hallelujah guitar",
    "jeff buckley guitar tone",
    "clean guitar tone",
    "guitar tone",
    "guitarhub",
  ],
  "/resources/recording-guitar-room-sound": [
    "recording guitar",
    "guitar room sound",
    "guitar room mic",
    "guitar recording ambience",
    "guitar tone",
    "guitarhub",
  ],
  "/resources/nam-a2-open-tone-format": [
    "nam a2",
    "neural amp modeler",
    "nam captures",
    "amp capture",
    "guitar amp modeling",
    "guitar tone",
    "guitarhub",
  ],
  "/glossary": [
    "guitar glossary",
    "guitar terms",
    "guitar terminology",
    "music terms",
    "vocal terms",
    "learn guitar and singing",
    "guitarhub",
  ],
  "/faq": [
    "guitarhub",
    "guitarhub faq",
    "guided guitar lessons",
    "guitar lessons online",
    "guitar practice app",
    "beginner guitar lessons",
  ],
  "/about": [
    "guitarhub",
    "about guitarhub",
    "suede ai",
    "guitar lessons online",
    "guided guitar lessons",
    "learn guitar",
  ],
  "/privacy": [
    "guitarhub privacy policy",
    "guitarhub",
    "privacy policy",
    "guitar practice app",
    "guitar lessons app",
  ],
  "/terms": [
    "guitarhub terms of use",
    "guitarhub",
    "terms of use",
    "guitar practice app",
    "guitar lessons app",
  ],
  "/beginner-guitar-practice-routine": [
    "beginner guitar practice routine",
    "guitar practice routine for beginners",
    "beginner guitar practice plan",
    "first 90 days of guitar",
    "daily guitar practice for beginners",
    "how to practice guitar for beginners",
    "guitar practice tips for beginners",
    "learn guitar",
    "guitarhub",
  ],
  "/how-to-change-chords-faster": [
    "how to change chords faster",
    "guitar chord changes",
    "chord transitions guitar",
    "smooth chord changes guitar",
    "one minute chord changes",
    "anchor finger chord change",
    "guide finger guitar",
    "guitar chords for beginners",
    "guitarhub",
  ],
  "/how-to-practice-strumming": [
    "how to practice strumming",
    "guitar strumming patterns",
    "strumming for beginners",
    "how to strum a guitar",
    "guitar rhythm practice",
    "strumming with a metronome",
    "guitar rhythm exercises",
    "guitarhub",
  ],
  "/how-to-play-barre-chords": [
    "how to play barre chords",
    "barre chords",
    "f chord guitar",
    "how to play f chord",
    "f barre chord",
    "barre chord tips",
    "e shape barre chord",
    "a shape barre chord",
    "guitarhub",
  ],
} as const satisfies Record<string, readonly string[]>;

export type KeywordRoute = keyof typeof ROUTE_KEYWORDS;

/** A fresh, mutable copy for a page's `metadata.keywords`. */
export function keywordsFor(route: KeywordRoute): string[] {
  return finish(ROUTE_KEYWORDS[route]);
}

/** The same list as schema.org `keywords` text for Article JSON-LD. */
export function keywordsText(route: KeywordRoute): string {
  return keywordsFor(route).join(", ");
}

function normalize(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms) {
    const term = raw.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (!term || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

/** Page terms (capped) plus the brand terms, deduped case-insensitively. */
function finish(terms: readonly string[]): string[] {
  const brand = new Set<string>(BRAND_KEYWORDS);
  const page = normalize(terms).filter((t) => !brand.has(t)).slice(0, MAX_PAGE_KEYWORDS);
  return [...page, ...BRAND_KEYWORDS];
}

/** Keywords for a curriculum track page (`/learn/guitar`, `/learn/voice`). */
export function trackKeywords(track: "guitar" | "voice"): string[] {
  return keywordsFor(track === "guitar" ? "/learn/guitar" : "/learn/voice");
}

/** Keywords for one lesson page, derived from the lesson and its module. */
export function lessonKeywords(track: "guitar" | "voice", lessonTitle: string, moduleName: string): string[] {
  const base =
    track === "guitar"
      ? ["beginner guitar lessons", "guided guitar lessons", "guitar lessons online", "learn guitar online", "guitarhub"]
      : ["free voice lessons", "vocal training", "vocal exercises", "guitarhub"];
  const kind = track === "guitar" ? "guitar lesson" : "voice lesson";
  return finish([lessonTitle, `${moduleName} ${kind}`, ...base]);
}

/** Keywords for one Advanced Lab drill, derived from the drill and its skill area. */
export function drillKeywords(drillTitle: string, areaName: string): string[] {
  return finish([
    drillTitle,
    `${areaName} guitar drill`,
    "advanced guitar drills",
    "guitar practice exercises",
    "guitar practice tips",
    "guitarhub",
  ]);
}
