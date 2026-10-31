import type { Metadata } from "next";
import Link from "next/link";
import { LabIndex } from "@/components/advanced/LabIndex";
import { PracticeStats } from "@/components/interactive/PracticeStats";
import { DRILLS, SKILL_AREAS, drillHref, drillsForArea } from "@/lib/advanced/drills";
import { SITE_URL } from "@/lib/site";
import learning from "@/components/learning/Learning.module.css";
import styles from "@/components/advanced/Advanced.module.css";
import { keywordsFor } from "@/lib/keywords";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { pageJsonLd } from "@/lib/page-schema";

const url = `${SITE_URL}/advanced`;
const title = "Advanced Guitar Drills with Live Feedback | GuitarHub";
const description = `${DRILLS.length} free scored drills for experienced guitarists: legato, sweeps, bends, modes, guide tones, rhythm, ear training, fretboard, improvisation, etudes, tone.`;

export const metadata: Metadata = {
  keywords: keywordsFor("/advanced"),
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "GuitarHub", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * The drills as an `ItemList`, in the order the page lists them (grouped by
 * skill area, as LabIndex renders them), so the count and order match what a
 * crawler finds in the markup.
 */
const ORDERED = SKILL_AREAS.flatMap((area) => drillsForArea(area.id));
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${url}#drills`,
  name: "GuitarHub Advanced Lab drills",
  url,
  numberOfItems: ORDERED.length,
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  itemListElement: ORDERED.map((drill, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${SITE_URL}${drillHref(drill.id)}`,
    name: drill.title,
  })),
};

/** Read by the compact visible trail and its BreadcrumbList twin. */
const CRUMBS = [{ name: "GuitarHub", href: "/" }, { name: "Advanced Lab", href: "/advanced" }];
const PAGE_JSON_LD = pageJsonLd({ canonical: url, name: title, description, type: "CollectionPage", mainEntity: `${url}#drills`, crumbs: CRUMBS, breadcrumbs: false });

export default function AdvancedLab() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSON_LD) }} />
    <BreadcrumbJsonLd crumbs={CRUMBS} />
    <nav className={learning.breadcrumbs} aria-label="Breadcrumb"><Link href="/">GuitarHub</Link><span aria-hidden="true">/</span><span aria-current="page">Advanced Lab</span></nav>
    <header className={learning.hero}>
      <p className={styles.eyebrow}>Advanced Lab · free</p>
      <h1>Advanced guitar drills with live feedback</h1>
      <p>{DRILLS.length} drills across the {SKILL_AREAS.length} skill areas a complete player needs. Practice mode waits for every note. Play mode scores the whole pass at tempo, and the coach tells you when to push faster.</p>
      <div className={learning.actions}>
        <Link className={learning.primary} href={`/advanced/${DRILLS[0].id}`}>Start with legato</Link>
        <Link className={learning.secondary} href="/learn/guitar#stage-6">Stage 6 and 7 lessons</Link>
      </div>
      <p className={learning.small}>The coach listens through your microphone, so a quiet room works best. Nothing is recorded or uploaded, and results stay in this browser.</p>
      <PracticeStats editable />
    </header>
    <LabIndex />
  </>;
}
