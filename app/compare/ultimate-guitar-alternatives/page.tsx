import type { Metadata } from "next";
import { AlternativesPage } from "@/components/Comparison";
import { comparisonPage } from "@/lib/comparisons";
import { keywordsFor } from "@/lib/keywords";

const HREF = "/compare/ultimate-guitar-alternatives";
const PAGE = comparisonPage(HREF);

export const metadata: Metadata = {
  keywords: keywordsFor("/compare/ultimate-guitar-alternatives"),
  title: PAGE.title,
  description: PAGE.description,
  openGraph: {
    title: PAGE.title,
    description: PAGE.description,
    url: PAGE.canonical,
    siteName: "GuitarHub",
    type: "article",
    // No `images` key: Next attaches the colocated opengraph-image.tsx card
    // only when the page leaves `images` unset.
  },
  alternates: { canonical: PAGE.canonical },
};

export default function Page() {
  return <AlternativesPage href={HREF} />;
}
