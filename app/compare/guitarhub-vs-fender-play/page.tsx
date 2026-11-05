import type { Metadata } from "next";
import { VsPage } from "@/components/Comparison";
import { comparisonPage } from "@/lib/comparisons";
import { keywordsFor } from "@/lib/keywords";

const HREF = "/compare/guitarhub-vs-fender-play";
const PAGE = comparisonPage(HREF);

export const metadata: Metadata = {
  keywords: keywordsFor("/compare/guitarhub-vs-fender-play"),
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
  return <VsPage href={HREF} />;
}
