import type { Metadata } from "next";
import Link from "next/link";
import { PracticeRoutine } from "@/components/learning/PracticeRoutine";
import styles from "@/components/learning/Learning.module.css";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { keywordsFor } from "@/lib/keywords";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const TITLE = "A-to-D Chord Practice Routine for Beginners | GuitarHub";
const DESCRIPTION = "Practice A-to-D guitar chord changes with seven timed blocks, editable durations, and local history. A free routine for players who know the two shapes.";
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
export default function RoutinePage() {
  return <>
    <BreadcrumbJsonLd crumbs={[{ name: "Guitar learning path", href: "/learn/guitar" }, { name: "Daily practice", href: "/learn/guitar/routine" }]} />
    <PracticeRoutine />
    {/* The scope line recorded for this page in lib/query-ownership.ts, with
        the links to the two routine guides it shares a query with. */}
    <aside className={styles.notice} aria-label="About this routine">
      This page runs one session for you: seven timed blocks on the A-to-D change, with your history saved in this browser. For the whole first three months, the <Link href="/beginner-guitar-practice-routine">beginner guitar practice routine</Link> lays out a 90-day plan, and once open chords and strumming hold up, the <Link href="/guitar-practice-routine-intermediate">intermediate guitar practice routine</Link> gives each session five blocks.
    </aside>
  </>;
}
