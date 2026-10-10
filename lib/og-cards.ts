import type { Drill } from "./advanced/drills.ts";
import { skillArea } from "./advanced/drills.ts";
import {
  ABOUT,
  GUIDES,
  HUBS,
  LEARN,
  RESOURCES,
  SITE_NAME,
  TOOLS,
  type SiteEntry,
} from "./site.ts";

/**
 * What each route's share card says, read from the data the pages already
 * render from rather than typed a second time.
 *
 * Titles and subtitles come from the route registry in `lib/site.ts` (and from
 * `lib/advanced/drills.ts` for the drills), so a retitled page gets a retitled
 * card on the next build with no edit here. Only the eyebrow, the small section
 * label above the title, is chosen in this file.
 *
 * The artwork lives in `lib/og.tsx`; this module is plain data so it can be
 * tested without a JSX runtime.
 */

export type OgCard = {
  /** Section label above the title, e.g. "Practice guide". */
  eyebrow: string;
  title: string;
  /** One line under the title. Omitted when the card reads better without it. */
  subtitle?: string;
  /** `og:image:alt` / `twitter:image:alt`: what the card says, in words. */
  alt: string;
};

/** Eyebrow for every entry of a registry group, unless overridden below. */
const GROUPS: readonly { eyebrow: string; entries: readonly SiteEntry[] }[] = [
  { eyebrow: "Free practice tool", entries: TOOLS },
  { eyebrow: "Practice guide", entries: GUIDES },
  { eyebrow: "Resource", entries: RESOURCES },
  { eyebrow: "Reference", entries: HUBS },
  { eyebrow: "Learn guitar", entries: LEARN },
  { eyebrow: "About", entries: [ABOUT] },
];

const EYEBROWS: Readonly<Record<string, string>> = {
  "/method": "The method",
  "/tools": "Free practice tools",
  "/guides": "Practice guides",
  "/glossary": "Glossary",
  "/faq": "Questions and answers",
  "/learn/guitar": "Learning path",
  "/advanced": "Advanced Lab",
};

/**
 * Routes whose registry blurb is written for the footer rather than for a
 * share preview: they describe the page by what it leaves out, which the house
 * copy rule in AGENTS.md keeps off social previews. The card carries the
 * eyebrow and title only.
 */
const TITLE_ONLY = new Set(["/about", "/faq"]);

/**
 * Every static route that ships its own `opengraph-image.tsx` and
 * `twitter-image.tsx`. The drills (`/advanced/[drillId]`) are generated from
 * `DRILLS` and are not listed. `tests/og-images.test.ts` checks this list
 * against the files on disk.
 */
export const OG_ROUTES: readonly string[] = [
  ...TOOLS.map((entry) => entry.href),
  "/tools",
  ...GUIDES.map((entry) => entry.href),
  ...RESOURCES.map((entry) => entry.href),
  "/guides",
  "/glossary",
  "/faq",
  "/learn/guitar",
  "/advanced",
  ABOUT.href,
];

/** Whole sentence from a fragment, without doubling end punctuation. */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * "Why guitar practice plateaus: Practice guide card from GuitarHub. Why
 * progress stalls once...". Leads with the title because that is what a
 * screen reader user needs first; the subtitle follows because it is on the
 * card too.
 */
function altFor(label: string, title: string, subtitle?: string): string {
  const head = `${title.trim().replace(/[.!?]$/, "")}: ${label} card from ${SITE_NAME}.`;
  return subtitle ? `${head} ${sentence(subtitle)}` : head;
}

function card(eyebrow: string, title: string, subtitle?: string, label = eyebrow): OgCard {
  return { eyebrow, title, subtitle, alt: altFor(label, title, subtitle) };
}

/** The card for a registered route. Throws on an unknown href so a typo fails the build. */
export function cardFor(href: string): OgCard {
  for (const group of GROUPS) {
    const entry = group.entries.find((candidate) => candidate.href === href);
    if (!entry) continue;
    return card(
      EYEBROWS[href] ?? group.eyebrow,
      entry.title,
      TITLE_ONLY.has(href) ? undefined : entry.blurb,
    );
  }
  throw new Error(`No share card for ${href}: register the route in lib/site.ts`);
}

/** The card for one Advanced Lab drill. */
export function drillCard(drill: Drill): OgCard {
  const area = skillArea(drill.area);
  return card(
    `Advanced Lab · ${area.name} · ${drill.tier}`,
    drill.title,
    drill.summary,
    `Advanced Lab ${area.name} drill`,
  );
}
