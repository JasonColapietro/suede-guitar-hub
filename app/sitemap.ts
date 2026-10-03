import type { MetadataRoute } from "next";
import { DRILLS, drillHref } from "@/lib/advanced/drills";
import { accessibleLessonIds, guestLearningAccess } from "@/lib/learning/access";
import { lessonHref } from "@/lib/learning/curriculum";
import {
  ABOUT,
  GUIDES,
  HOME,
  HUBS,
  LEARN,
  LEGAL,
  RESOURCES,
  SITE_URL,
  TOOLS,
  type SiteEntry,
} from "@/lib/site";

/**
 * Built from the route registry and the public lesson/drill catalogs, so new
 * public content is discovered without a second hand-kept list.
 *
 * Every href emitted below was confirmed to have a rendering `page.tsx` under
 * `app/` before being listed. A sitemap that advertises a 404 is worse than one
 * that omits a page, so nothing enters this file ahead of the route itself.
 */

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
  // The learning paths sit with `/method` at the top: `/learn/guitar` is the
  // target of the site-wide "Start learning" link, so it is the route a
  // crawler is pointed at most often after the home page.
  { entries: LEARN, priority: 0.9, changeFrequency: "weekly" },
  { entries: METHOD, priority: 0.9, changeFrequency: "monthly" },
  { entries: HUBS, priority: 0.85, changeFrequency: "weekly" },
  { entries: TOOLS, priority: 0.8, changeFrequency: "monthly" },
  { entries: RESOURCES, priority: 0.75, changeFrequency: "monthly" },
  { entries: OTHER_GUIDES, priority: 0.7, changeFrequency: "monthly" },
  { entries: [ABOUT], priority: 0.5, changeFrequency: "yearly" },
  { entries: LEGAL, priority: 0.3, changeFrequency: "yearly" },
];

/** `SITE_URL` carries no trailing slash, so the home entry is the bare origin. */
function absolute(href: string): string {
  return href === "/" ? SITE_URL : `${SITE_URL}${href}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = GROUPS.flatMap(({ entries, priority, changeFrequency }) =>
    entries.map((entry) => ({
      url: absolute(entry.href),
      lastModified: new Date(`${entry.lastModified}T00:00:00.000Z`),
      changeFrequency,
      priority,
    })),
  );
  // Use the same readiness and guest-access checks as the lesson page. Paid
  // previews, curriculum outlines and the voice routes moved to Sing stay out.
  const learningPaths = [
    ...accessibleLessonIds("guitar", guestLearningAccess).map((id) => lessonHref("guitar", id)),
    ...DRILLS.map((drill) => drillHref(drill.id)),
  ];
  return [
    ...pages,
    ...learningPaths.map((path): SitemapEntry => ({
      url: absolute(path),
      changeFrequency: "monthly",
      priority: 0.8,
      // These catalogs have no verified per-page modification dates.
    })),
  ];
}
