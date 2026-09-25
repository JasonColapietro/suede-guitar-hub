import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrillSession } from "@/components/advanced/DrillSession";
import { DRILLS, drillHref, getDrill, skillArea } from "@/lib/advanced/drills";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import learning from "@/components/learning/Learning.module.css";
import styles from "@/components/advanced/Advanced.module.css";

type Params = { drillId: string };
export function generateStaticParams() { return DRILLS.map(drill => ({ drillId: drill.id })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const drill = getDrill((await params).drillId);
  if (!drill) return {};
  const url = `${SITE_URL}${drillHref(drill.id)}`;
  const title = `${drill.title}: ${skillArea(drill.area).name} Drill | GuitarHub Advanced Lab`;
  return {
    title, description: drill.summary, alternates: { canonical: url },
    openGraph: { title, description: drill.summary, url, siteName: "GuitarHub", type: "article", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description: drill.summary, images: [OG_IMAGE.url] },
  };
}

export default async function DrillPage({ params }: { params: Promise<Params> }) {
  const drill = getDrill((await params).drillId);
  if (!drill) notFound();
  const area = skillArea(drill.area);
  const index = DRILLS.findIndex(item => item.id === drill.id);
  const previous = DRILLS[index - 1], next = DRILLS[index + 1];
  return <>
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
    <nav className={styles.pager} aria-label="More drills">
      {previous ? <Link href={drillHref(previous.id)}>← {previous.title}</Link> : <Link href="/advanced">← All drills</Link>}
      {next ? <Link href={drillHref(next.id)}>{next.title} →</Link> : <Link href="/advanced">All drills →</Link>}
    </nav>
  </>;
}
