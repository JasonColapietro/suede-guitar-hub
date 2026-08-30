/**
 * The single route registry for guitarhub.org.
 *
 * Every page on the site is listed here exactly once. `app/sitemap.ts` builds
 * from `SITEMAP_ENTRIES`, and `components/SiteFooter.tsx` builds its Tools and
 * Guides columns from `TOOLS` and `GUIDES`. Adding a page means adding an entry
 * here — the sitemap and the site-wide internal linking follow automatically.
 *
 * `STRUMLY` holds the only external URLs this site is allowed to link to. Every
 * one of them has been verified to return 200. Do not add a URL here without
 * checking it first, and do not hand-write a strumly.suedeai.ai link anywhere
 * else in the codebase.
 */

export const SITE_URL = "https://guitarhub.org";
export const SITE_NAME = "GuitarHub";

/**
 * The generated share card, spelled out here so every page can repeat it.
 *
 * `app/opengraph-image.tsx` is a file-convention image, and Next attaches it to
 * the segment that owns the file — the root layout. But a page-level
 * `openGraph` key REPLACES the layout's resolved object wholesale (the
 * `case 'openGraph'` branch of `mergeMetadata` in
 * `next/dist/lib/metadata/resolve-metadata.js`), and the re-attachment in
 * `postProcessMetadata` only fires for a segment that owns an image file of its
 * own. A page that sets `openGraph` without `images` therefore ships **no
 * `og:image` at all**. Measured, not assumed: before this constant existed, 11
 * of the 13 rendered pages emitted none, and the only two that kept the card
 * were the two with no `openGraph` block of their own.
 *
 * So every page declaring `openGraph` must pass `images: [OG_IMAGE]`. `alt` is
 * kept identical to the `alt` exported by `app/opengraph-image.tsx`.
 */
export const OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "GuitarHub — prove one guitar breakthrough in 30 days.",
} as const;

export type SiteEntry = {
  /** Route path, always root-relative and without a trailing slash. */
  href: string;
  /** Human title. Used as link text in the footer and in related-links blocks. */
  title: string;
  /** One sentence describing the page. Used for cards and link descriptions. */
  blurb: string;
  /** ISO date, `YYYY-MM-DD`. Feeds `lastModified` in the sitemap. */
  lastModified: string;
};

export const HOME: SiteEntry = {
  href: "/",
  title: "GuitarHub",
  blurb:
    "Choose one guitar breakthrough, practice the thing that moves it, and end every week with evidence.",
  lastModified: "2026-08-29",
};

export const TOOLS: readonly SiteEntry[] = [
  {
    href: "/breakthrough",
    title: "30-day breakthrough planner",
    blurb:
      "Choose one finish line and turn it into a four-week practice sequence you can run this month.",
    lastModified: "2026-08-29",
  },
  {
    href: "/diagnose",
    title: "Practice plateau diagnostic",
    blurb:
      "Answer a short set of questions and name the part of your practice that stopped producing change.",
    lastModified: "2026-08-29",
  },
  {
    href: "/session",
    title: "Practice session builder",
    blurb:
      "Turn the minutes you actually have into timed blocks, weighted toward the one thing you are fixing.",
    lastModified: "2026-08-30",
  },
  {
    href: "/tempo",
    title: "Tempo ladder builder",
    blurb:
      "Turn one difficult passage into a tempo ladder with a starting speed, a target, and steps between them.",
    lastModified: "2026-08-29",
  },
  {
    href: "/readiness",
    title: "Song readiness score",
    blurb:
      "Check a song against the parts that break under pressure before you call it finished.",
    lastModified: "2026-08-29",
  },
  {
    href: "/log",
    title: "Practice evidence log",
    blurb:
      "Log one line per session and read what actually moved, with no streak counter and no direction under three sessions.",
    lastModified: "2026-08-30",
  },
];

export const GUIDES: readonly SiteEntry[] = [
  {
    href: "/method",
    title: "The GuitarHub method",
    blurb:
      "The loop the whole site runs on: diagnose, prescribe, practice, prove, correct, repeat.",
    lastModified: "2026-08-29",
  },
  {
    href: "/how-to-practice-guitar-effectively",
    title: "How to practice guitar effectively",
    blurb:
      "What to do with a practice hour so it changes your playing instead of filling the time.",
    lastModified: "2026-08-29",
  },
  {
    href: "/guitar-practice-plateau",
    title: "Why guitar practice plateaus",
    blurb:
      "Why progress stalls once the beginner gains run out, and what to change when it does.",
    lastModified: "2026-08-29",
  },
  {
    href: "/deliberate-practice-guitar",
    title: "Deliberate practice on guitar",
    blurb:
      "What deliberate practice means at the instrument, and how it differs from playing something again.",
    lastModified: "2026-08-29",
  },
  {
    href: "/30-day-guitar-challenge",
    title: "The 30-day guitar challenge",
    blurb:
      "How to run a 30-day challenge that ends with a recording you can compare, not a streak you kept.",
    lastModified: "2026-08-29",
  },
  {
    href: "/guitar-practice-routine-intermediate",
    title: "An intermediate practice routine",
    blurb:
      "A weekly routine for players past the beginner stage who still cannot finish a song cleanly.",
    lastModified: "2026-08-29",
  },

  {
    href: "/how-long-to-practice-guitar-each-day",
    title: "How long to practice each day",
    blurb:
      "Why duration is the wrong variable, and what a 10, 25 or 60 minute session should contain.",
    lastModified: "2026-08-29",
  },
  {
    href: "/guitar-practice-schedule",
    title: "A schedule that survives a real week",
    blurb:
      "Building practice around a weekly total and one protected session, instead of a daily streak.",
    lastModified: "2026-08-29",
  },
  {
    href: "/why-cant-i-play-guitar-fast",
    title: "Why you cannot play it fast yet",
    blurb:
      "The real causes of a speed ceiling, and why slow practice only helps when the slow motion matches.",
    lastModified: "2026-08-29",
  },
  {
    href: "/how-to-memorize-songs-on-guitar",
    title: "How to memorize a song",
    blurb:
      "Why rereading tab does not build memory, and how to know the form rather than the finger path.",
    lastModified: "2026-08-29",
  },
  {
    href: "/practicing-guitar-with-a-metronome",
    title: "Practising with a metronome",
    blurb:
      "Testing against the click instead of playing along with it, and what that exposes about your time.",
    lastModified: "2026-08-29",
  },
];

/** Home plus every tool and guide, in sitemap order. */
/**
 * Index pages. They are neither a tool nor a guide, but they are the crawl
 * entry points into both, so they belong in the sitemap and the nav. Kept out
 * of TOOLS/GUIDES so the footer columns keep listing destinations rather than
 * listing themselves.
 */
export const HUBS: readonly SiteEntry[] = [
  {
    href: "/tools",
    title: "Free practice tools",
    blurb:
      "Every tool on the site: free, no account, and running entirely in your browser.",
    lastModified: "2026-08-29",
  },
  {
    href: "/guides",
    title: "All practice guides",
    blurb: "The written guides, grouped by what you are trying to fix.",
    lastModified: "2026-08-29",
  },
  {
    href: "/faq",
    title: "FAQ",
    blurb:
      "What GuitarHub is, what it is not, where your data lives, and what applying involves.",
    lastModified: "2026-08-29",
  },
];

export const SITEMAP_ENTRIES: readonly SiteEntry[] = [HOME, ...HUBS, ...TOOLS, ...GUIDES];

/**
 * Verified external links. Every URL below returned 200 when checked on
 * 2026-08-29. `https://strumly.suedeai.ai/practice` is a 404 and is
 * deliberately absent — do not add it.
 */
export const STRUMLY = {
  guides: "https://strumly.suedeai.ai/guides",
  practiceRoutine:
    "https://strumly.suedeai.ai/guides/designing-a-practice-routine",
  beginnerPath: "https://strumly.suedeai.ai/guides/beginner-guitar-learning-path",
  aiCoach: "https://strumly.suedeai.ai/guides/practicing-guitar-with-an-ai-coach",
  chordTransitions: "https://strumly.suedeai.ai/guides/smoother-chord-transitions",
  aiVsTeacher: "https://strumly.suedeai.ai/guides/ai-feedback-vs-human-teacher",
  signalChain: "https://strumly.suedeai.ai/guides/signal-chain-topology",
  path: "https://strumly.suedeai.ai/path",
  rig: "https://strumly.suedeai.ai/rig",
  lessons: {
    purpleHaze: "https://strumly.suedeai.ai/book/lessons/lesson-purple-haze",
    comfortablyNumb:
      "https://strumly.suedeai.ai/book/lessons/lesson-comfortably-numb",
    prideAndJoy: "https://strumly.suedeai.ai/book/lessons/lesson-pride-and-joy",
    teenSpirit:
      "https://strumly.suedeai.ai/book/lessons/lesson-smells-like-teen-spirit",
  },
  social: "https://social.suedeai.ai",
  suedeLabs: "https://suedeai.ai",
} as const;

/** True for a route on guitarhub.org itself, which should use `next/link`. */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/");
}
