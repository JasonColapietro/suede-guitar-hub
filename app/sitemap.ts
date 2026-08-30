import type { MetadataRoute } from "next";
import { GUIDES, HOME, HUBS, SITE_URL, TOOLS, type SiteEntry } from "@/lib/site";

/**
 * Built from the route registry in `lib/site.ts` instead of a hand-kept list,
 * so a page added there is published here without a second edit.
 *
 * Every href emitted below was confirmed to have a rendering `page.tsx` under
 * `app/` before being listed. A sitemap that advertises a 404 is worse than one
 * that omits a page, so nothing enters this file ahead of the route itself.
 */

/**
 * `/about` is deliberately absent from `lib/site.ts`: it is neither a tool nor
 * a guide, and adding it there would push it into the footer's Tools or Guides
 * column. It is still a canonical indexable page, so it is listed here.
 */
const ABOUT: SiteEntry = {
  href: "/about",
  title: "About GuitarHub",
  blurb:
    "Who built GuitarHub, what it does, what it does not do, and how it relates to Strumly.",
  lastModified: "2026-08-29",
};

/**
 * `/method` is the page the rest of the site argues from, so it outranks the
 * other guides. Selected by filter rather than by index: if it is ever removed
 * from the registry this yields an empty group instead of the wrong page.
 */
const METHOD = GUIDES.filter((entry) => entry.href === "/method");
const OTHER_GUIDES = GUIDES.filter((entry) => entry.href !== "/method");

type SitemapEntry = MetadataRoute.Sitemap[number];

type Group = {
  entries: readonly SiteEntry[];
  priority: number;
  changeFrequency: SitemapEntry["changeFrequency"];
};

const GROUPS: readonly Group[] = [
  { entries: [HOME], priority: 1, changeFrequency: "weekly" },
  { entries: METHOD, priority: 0.9, changeFrequency: "monthly" },
  { entries: HUBS, priority: 0.85, changeFrequency: "weekly" },
  { entries: TOOLS, priority: 0.8, changeFrequency: "monthly" },
  { entries: OTHER_GUIDES, priority: 0.7, changeFrequency: "monthly" },
  { entries: [ABOUT], priority: 0.5, changeFrequency: "yearly" },
];

/** `SITE_URL` carries no trailing slash, so the home entry is the bare origin. */
function absolute(href: string): string {
  return href === "/" ? SITE_URL : `${SITE_URL}${href}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return GROUPS.flatMap(({ entries, priority, changeFrequency }) =>
    entries.map((entry) => ({
      url: absolute(entry.href),
      lastModified: new Date(`${entry.lastModified}T00:00:00.000Z`),
      changeFrequency,
      priority,
    })),
  );
}
