/**
 * The page-level JSON-LD every indexable route carries: a WebPage-family node
 * tied to the site and the estate Organization by @id, plus the page's
 * BreadcrumbList when it sits below the home page.
 *
 * Pages that already publish one of these (an AboutPage, a CollectionPage, a
 * BreadcrumbList in their own graph) pass `breadcrumbs: false` or are left
 * alone; this fills the gap on the routes that published neither, so a crawler
 * reading any page can tell which site and which publisher it belongs to.
 */

import { breadcrumbList, type Crumb } from "@/lib/breadcrumbs";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SUEDE_ORG_ID = "https://suedeai.ai/#organization";

export type WebPageType = "WebPage" | "CollectionPage" | "AboutPage" | "ContactPage" | "ItemPage";

export type PageNodeInput = {
  /** Absolute canonical URL of the page. */
  canonical: string;
  /** The page's title, as rendered in <title>. */
  name: string;
  description: string;
  type?: WebPageType;
  /** @id of the thing the page is about (a tool, a course, a list). */
  mainEntity?: string;
  /** Crumbs ending with this page. Omit on the home page. */
  crumbs?: readonly Crumb[];
  /**
   * False when the page already emits its own BreadcrumbList (for example
   * through `BreadcrumbJsonLd`), so the node is referenced, not duplicated.
   */
  breadcrumbs?: boolean;
  datePublished?: string;
  dateModified?: string;
};

/** The WebPage node alone, for pages that assemble their own @graph. */
export function webPageNode({
  canonical,
  name,
  description,
  type = "WebPage",
  mainEntity,
  crumbs,
  datePublished,
  dateModified,
}: PageNodeInput) {
  return {
    "@type": type,
    "@id": `${canonical}#webpage`,
    url: canonical,
    name,
    description,
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": SUEDE_ORG_ID },
    ...(mainEntity ? { mainEntity: { "@id": mainEntity } } : {}),
    ...(crumbs && crumbs.length > 0 ? { breadcrumb: { "@id": `${canonical}#breadcrumb` } } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
}

/** A complete JSON-LD document: the WebPage node and, when given, its trail. */
export function pageJsonLd(input: PageNodeInput) {
  const { canonical, crumbs, breadcrumbs = true } = input;
  return {
    "@context": "https://schema.org",
    "@graph": [
      webPageNode(input),
      ...(crumbs && crumbs.length > 0 && breadcrumbs ? [breadcrumbList(canonical, crumbs)] : []),
    ],
  };
}

/** Home crumb plus one level, for pages that sit directly under the home page. */
export function homeTrail(name: string, href: string): readonly Crumb[] {
  return [
    { name: SITE_NAME, href: "/" },
    { name, href },
  ];
}
