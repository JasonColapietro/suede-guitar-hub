import type { Metadata } from "next";
import { PracticeRoutine } from "@/components/learning/PracticeRoutine";
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
  </>;
}
