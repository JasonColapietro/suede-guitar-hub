import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrillSession } from "@/components/advanced/DrillSession";
import { DrillTeaching } from "@/components/advanced/DrillTeaching";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { DRILLS, drillHref, getDrill, skillArea } from "@/lib/advanced/drills";
import { drillTeaching } from "@/lib/advanced/teaching";
import { SITE_URL } from "@/lib/site";
import { drillKeywords } from "@/lib/keywords";
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

export default async function DrillPage({ params }: { params: Promise<Params> }) {
  const drill = getDrill((await params).drillId);
  if (!drill) notFound();
  const area = skillArea(drill.area);
  const teaching = drillTeaching(drill.id);
  const index = DRILLS.findIndex(item => item.id === drill.id);
  const previous = DRILLS[index - 1], next = DRILLS[index + 1];
  return <>
    <BreadcrumbJsonLd crumbs={[
      { name: "Advanced Lab", href: "/advanced" },
      { name: area.name, href: `/advanced#${area.id}` },
      { name: drill.title, href: drillHref(drill.id) },
    ]} />
    <nav className={learning.breadcrumbs} aria-label="Breadcrumb"><Link href="/advanced">Advanced Lab</Link><span aria-hidden="true">/</span><Link href={`/advanced#${area.id}`}>{area.name}</Link></nav>
    <header className={styles.drillHead}>
      <p className={styles.eyebrow}>{area.name} · {drill.tier} · {drill.minutes} min</p>
      <h1>{drill.title}</h1>
      <p>{drill.summary}</p>
    </header>
    <details className={styles.how} open>
      <summary>How to play it</summary>
      <ol>{drill.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p>What the coach checks: {drill.measures}</p>
    </details>
    <DrillSession drill={drill} />
    <section className={styles.why}><h2>Why this drill</h2><p>{drill.why}</p></section>
    {teaching && <DrillTeaching drill={drill} teaching={teaching} />}
    <nav className={styles.pager} aria-label="More drills">
      {previous ? <Link href={drillHref(previous.id)}>← {previous.title}</Link> : <Link href="/advanced">← All drills</Link>}
      {next ? <Link href={drillHref(next.id)}>{next.title} →</Link> : <Link href="/advanced">All drills →</Link>}
    </nav>
  </>;
}
