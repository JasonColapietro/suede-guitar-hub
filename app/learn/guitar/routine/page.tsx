import type { Metadata } from "next";
import Link from "next/link";
import { PracticeRoutine } from "@/components/learning/PracticeRoutine";
import { LearningPaidToolGate } from "@/components/paywall/PaidToolGate";
import { checkoutAvailable } from "@/lib/checkout/config";
import { defaultRoutineSeconds, routineTemplate } from "@/lib/learning/routine";
import routineStyles from "@/components/learning/PracticeRoutine.module.css";
import { routineChordAssets } from "@/lib/learning/routine-assets";
import styles from "@/components/learning/Learning.module.css";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { keywordsFor } from "@/lib/keywords";
import { OG_IMAGE, SITE_URL, lifetimeOfferAt } from "@/lib/site";
import { pageJsonLd } from "@/lib/page-schema";

const TITLE = "A-to-D Chord Practice Routine for Beginners | GuitarHub";
const DESCRIPTION = "Practice A-to-D guitar chord changes in seven timed blocks with editable durations and saved history, included in lifetime access.";
const CANONICAL = `${SITE_URL}/learn/guitar/routine`;

export const metadata: Metadata = {
  keywords: keywordsFor("/learn/guitar/routine"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};
// The visible trail is rendered inside PracticeRoutine (a client component);
// its structured twin is emitted here, with the same two crumbs.
const CRUMBS = [{ name: "Guitar learning path", href: "/learn/guitar" }, { name: "Daily practice", href: "/learn/guitar/routine" }];
const PAGE_JSON_LD = pageJsonLd({ canonical: CANONICAL, name: TITLE, description: DESCRIPTION, crumbs: CRUMBS, breadcrumbs: false });

/** The routine's introduction and its seven blocks at their suggested lengths, for a visitor without lifetime access. */
function RoutinePreview() {
  return <div className={routineStyles.routine}>
    <nav className={routineStyles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn/guitar">Guitar learning path</Link><span aria-hidden="true"> / </span><span>Daily practice</span></nav>
    <header className={routineStyles.hero}><p className={routineStyles.eyebrow}>A little practice, often</p><h1>A-to-D chord practice routine.</h1><p>Practice changing between A and D guitar chords: check each chord, try light anchor movement, count changes, and play song sections. Seven blocks, {defaultRoutineSeconds / 60} minutes, each one timed, with your history saved as you go.</p></header>
    <figure>
      <figcaption className={routineStyles.eyebrow}>Today’s plan</figcaption>
      <ol className={routineStyles.plan} data-locked-preview inert>{routineTemplate.blocks.map((block, index) => <li key={block.id}><div><span className={routineStyles.number}>{index + 1}</span><strong>{block.title}</strong></div><span>{formatMinutes(block.suggestedSeconds)}</span></li>)}</ol>
    </figure>
  </div>;
}

function formatMinutes(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export default function RoutinePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSON_LD) }} />
    <BreadcrumbJsonLd crumbs={CRUMBS} />
    {/* The learn layout has already verified access, so the gate reads it from
        context. PracticeRoutine carries its own trail and heading; a locked
        visitor gets the same introduction above the preview. */}
    <LearningPaidToolGate checkoutAvailable={checkoutAvailable()} returnTo="/learn/guitar/routine" offer={lifetimeOfferAt(new Date())} preview={<RoutinePreview />}>
      <PracticeRoutine chordAssets={routineChordAssets()} />
    </LearningPaidToolGate>
    {/* The scope line recorded for this page in lib/query-ownership.ts, with
        the links to the two routine guides it shares a query with. */}
    <aside className={styles.notice} aria-label="About this routine">
      This page runs one session for you: seven timed blocks on the A-to-D change, with your history saved in this browser. For the whole first three months, the <Link href="/beginner-guitar-practice-routine">beginner guitar practice routine</Link> lays out a 90-day plan, and once open chords and strumming hold up, the <Link href="/guitar-practice-routine-intermediate">intermediate guitar practice routine</Link> gives each session five blocks.
    </aside>
  </>;
}
