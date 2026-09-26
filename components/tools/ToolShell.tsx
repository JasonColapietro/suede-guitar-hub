import Link from "next/link";
import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { OG_IMAGE, SITE_URL, TOOLS } from "@/lib/site";
import learning from "@/components/learning/Learning.module.css";
import styles from "./Tools.module.css";

/**
 * The page frame every pro tool under `/tools/` shares: skip link, nav, a
 * breadcrumb back to the tools hub, the hero, the tool itself, the privacy
 * and scope notes, and a way on to the next tool.
 *
 * The title, blurb and href come from the registry entry in `lib/site.ts`, so
 * a renamed tool is renamed here too. A page passes only what the registry
 * does not hold: the hero copy, the tool, and its honest notes.
 */

/** The registry entry for a pro tool; throws at build time if it is missing. */
export function toolEntry(href: string) {
  const entry = TOOLS.find(tool => tool.href === href);
  if (!entry) throw new Error(`${href} is not in the TOOLS registry in lib/site.ts`);
  return entry;
}

/** The SoftwareApplication node the tools hub references by `<url>#tool`. */
export function toolApplication(href: string, description: string, browserRequirements: string) {
  const url = `${SITE_URL}${href}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#tool`,
    name: toolEntry(href).title,
    description,
    url,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Guitar practice tool",
    operatingSystem: "Web",
    browserRequirements,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

/** Next's metadata for a pro tool page, with the share card every page must repeat. */
export function toolMetadata(href: string, title: string, description: string) {
  const url = `${SITE_URL}${href}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "GuitarHub", type: "website" as const, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image" as const, title, description, images: [OG_IMAGE.url] },
  };
}

type ShellProps = {
  href: string;
  /** Short uppercase line above the heading. */
  eyebrow: string;
  /** The page heading. May contain a <br />. */
  heading: ReactNode;
  intro: ReactNode;
  /** JSON-LD for the page, usually `toolApplication(...)`. */
  jsonLd: object;
  children: ReactNode;
  /** What happens to audio and input on this page. Rendered as the notice. */
  privacy: ReactNode;
  /** What the tool cannot do. Rendered as a short list under the tool. */
  limits: readonly string[];
  /** Optional links into the tone course or other tools, shown before the pager. */
  related?: readonly { href: string; label: string }[];
};

export function ToolShell({ href, eyebrow, heading, intro, jsonLd, children, privacy, limits, related = [] }: ShellProps) {
  const entry = toolEntry(href);
  const index = TOOLS.findIndex(tool => tool.href === href);
  const next = TOOLS[(index + 1) % TOOLS.length];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <a className={learning.skip} href="#tool-main">Skip to the tool</a>
    <SiteNav />
    <main id="tool-main" className={learning.shell}>
      <nav className={learning.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/tools">Tools</Link><span aria-hidden="true">/</span><span aria-current="page">{entry.title}</span>
      </nav>
      <header className={learning.hero}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{heading}</h1>
        <p>{intro}</p>
      </header>
      {children}
      <p className={learning.notice}>{privacy}</p>
      <section className={styles.limits} aria-labelledby="tool-limits">
        <h2 id="tool-limits">What this tool does not do</h2>
        <ul>{limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
      </section>
      {related.length > 0 && <nav className={styles.related} aria-label="Related">
        {related.map(link => <Link key={link.href} className={learning.secondary} href={link.href}>{link.label}</Link>)}
      </nav>}
      <nav className={styles.pager} aria-label="More tools">
        <Link href="/tools">← All tools</Link>
        {next && next.href !== href && <Link href={next.href}>{next.title} →</Link>}
      </nav>
    </main>
    <SiteFooter />
  </>;
}
