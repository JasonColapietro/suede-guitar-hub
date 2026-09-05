/**
 * One source for a page's breadcrumb trail, read by both the visible
 * `<nav aria-label="Breadcrumb">` and the `BreadcrumbList` JSON-LD.
 *
 * The two used to be separate: `/about`, `/faq`, `/guides` and `/tools` each
 * declared a two-level `BreadcrumbList` in structured data while the rendered
 * page showed no trail at all, so the markup claimed a hierarchy the reader
 * could not see. Building both from the same array means a change to one is a
 * change to the other.
 */

import { SITE_NAME, SITE_URL } from "@/lib/site";

export type Crumb = {
  /** Link text, and the `name` of the matching `ListItem`. */
  name: string;
  /** Root-relative path. `/` is the home crumb. */
  href: string;
};

/**
 * The trail for a page sitting one level below the home page: the site name,
 * then this page.
 *
 * `href` may be handed in either form. Pages hold their address as an absolute
 * `CANONICAL`, while `next/link` wants a root-relative path, so the absolute
 * form is normalised here rather than at four call sites. Storing the relative
 * form and rebuilding the absolute one in `breadcrumbList` keeps `item` from
 * being handed an origin twice.
 */
export function crumbTrail(name: string, href: string): readonly Crumb[] {
  return [
    { name: SITE_NAME, href: "/" },
    { name, href: relative(href) },
  ];
}

/** Root-relative path for an href given either absolutely or relatively. */
function relative(href: string): string {
  const path = href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) : href;
  return path === "" ? "/" : path;
}

/** Absolute URL for a crumb. `SITE_URL` carries no trailing slash. */
function absolute(href: string): string {
  const path = relative(href);
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * The `BreadcrumbList` node for a page's `@graph`, built from the same crumbs
 * the page renders. `@id` keeps the shape the pages already reference from
 * their `breadcrumb` key.
 */
export function breadcrumbList(canonical: string, crumbs: readonly Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.href),
    })),
  };
}
