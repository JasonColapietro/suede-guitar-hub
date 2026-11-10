import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrillSession } from "@/components/advanced/DrillSession";
import { DrillTeaching } from "@/components/advanced/DrillTeaching";
import { PaidToolGate } from "@/components/paywall/PaidToolGate";
import { checkoutAvailable } from "@/lib/checkout/config";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { DRILLS, drillHref, getDrill, skillArea, type Drill } from "@/lib/advanced/drills";
import { drillTeaching } from "@/lib/advanced/teaching";
import { SITE_URL, lifetimeOfferAt } from "@/lib/site";
import { drillGoalBpm, drillTempoPresets } from "@/lib/advanced/tempo-presets";
import { drillKeywords } from "@/lib/keywords";
import { pageJsonLd } from "@/lib/page-schema";
import learning from "@/components/learning/Learning.module.css";
import styles from "@/components/advanced/Advanced.module.css";

type Params = { drillId: string };
export function generateStaticParams() { return DRILLS.map(drill => ({ drillId: drill.id })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const drill = getDrill((await params).drillId);
  if (!drill) return {};
  const url = `${SITE_URL}${drillHref(drill.id)}`;
  // Keyword-first search title and snippet, authored per drill and held to the
  // ~60 character title window and a 140-155 character description by
  // tests/advanced-lab.test.ts.
  const title = `${drill.seo.title} | GuitarHub`;
  const description = drill.seo.description;
  return {
    title, description, alternates: { canonical: url },
    keywords: drillKeywords(drill.title, skillArea(drill.area).name),
    openGraph: { title, description, url, siteName: "GuitarHub", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** The drill's goal and tempo rungs, shown in place of the scored session until lifetime access is verified. */
function DrillPreview({ drill }: { drill: Drill }) {
  return <figure className={styles.session}>
    <figcaption className={styles.label}>What the scored session sets you</figcaption>
    <div data-locked-preview inert>
      <div className={styles.goal}>
        <div><span className={styles.label}>Goal</span><strong>{drillGoalBpm(drill)} BPM · {drill.spec.passScore}% accuracy</strong></div>
        <div><span className={styles.label}>Session</span><strong>{drill.minutes} min · {drill.tier}</strong></div>
      </div>
      <ol className={styles.presetNote}>{drillTempoPresets(drill).map(preset => <li key={preset.id}>{preset.label}: {preset.bpm} BPM ({preset.percent}%)</li>)}</ol>
    </div>
  </figure>;
}

export default async function DrillPage({ params }: { params: Promise<Params> }) {
  const drill = getDrill((await params).drillId);
  if (!drill) notFound();
  const area = skillArea(drill.area);
  const teaching = drillTeaching(drill.id);
  const index = DRILLS.findIndex(item => item.id === drill.id);
  const previous = DRILLS[index - 1], next = DRILLS[index + 1];
  const crumbs = [
    { name: "Advanced Lab", href: "/advanced" },
    { name: area.name, href: `/advanced#${area.id}` },
    { name: drill.title, href: drillHref(drill.id) },
  ];
  const page = pageJsonLd({
    canonical: `${SITE_URL}${drillHref(drill.id)}`,
    name: `${drill.seo.title} | GuitarHub`,
    description: drill.seo.description,
    crumbs,
    breadcrumbs: false,
  });
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(page) }} />
    <BreadcrumbJsonLd crumbs={crumbs} />
    <nav className={learning.breadcrumbs} aria-label="Breadcrumb"><Link href="/advanced">Advanced Lab</Link><span aria-hidden="true">/</span><Link href={`/advanced#${area.id}`}>{area.name}</Link></nav>
    <header className={styles.drillHead}>
      <p className={styles.eyebrow}>{area.name} · {drill.tier} · {drill.minutes} min</p>
      <h1>{drill.seo.title}</h1>
      <p>{drill.summary}</p>
    </header>
    <details className={styles.how} open>
      <summary>How to play it</summary>
      <ol>{drill.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p>What the coach checks: {drill.measures}</p>
    </details>
    <PaidToolGate checkoutAvailable={checkoutAvailable()} returnTo={drillHref(drill.id)} offer={lifetimeOfferAt(new Date())} preview={<DrillPreview drill={drill} />}>
      <DrillSession drill={drill} />
    </PaidToolGate>
    <section className={styles.why}><h2>Why this drill</h2><p>{drill.why}</p></section>
    {teaching && <DrillTeaching drill={drill} teaching={teaching} />}
    <nav className={styles.pager} aria-label="More drills">
      {previous ? <Link href={drillHref(previous.id)}>← {previous.title}</Link> : <Link href="/advanced">← All drills</Link>}
      {next ? <Link href={drillHref(next.id)}>{next.title} →</Link> : <Link href="/advanced">All drills →</Link>}
    </nav>
  </>;
}
