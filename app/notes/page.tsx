import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import NoteAuthor from "@/components/NoteAuthor";
import NoteCallToAction from "@/components/NoteCallToAction";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { keywordsFor } from "@/lib/keywords";
import { webPageNode } from "@/lib/page-schema";
import { NOTES, SITE_URL, SUEDE_NETWORK } from "@/lib/site";

const CANONICAL = `${SITE_URL}/notes`;

/** Read by both the visible trail and the BreadcrumbList node below. */
const CRUMBS = crumbTrail("Notes", "/notes");

const TITLE = "Notes from Suede AI: Building GuitarHub | GuitarHub";
const DESCRIPTION =
  "Build notes from Jason Colapietro and Suede AI in West Palm Beach, Florida: how GuitarHub is engineered, written and found by guitar players online.";

export const metadata: Metadata = {
  keywords: keywordsFor("/notes"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    // No `images` key: Next attaches the colocated opengraph-image.tsx card
    // only when the page leaves `images` unset.
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: CANONICAL },
};

/** The index is as fresh as its newest note. */
const UPDATED = NOTES.reduce(
  (latest, note) => (note.lastModified > latest ? note.lastModified : latest),
  "2026-11-14",
);

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      ...webPageNode({
        canonical: CANONICAL,
        name: TITLE,
        description: DESCRIPTION,
        type: "CollectionPage",
        mainEntity: `${CANONICAL}#notes`,
        crumbs: CRUMBS,
        dateModified: UPDATED,
      }),
      author: { "@id": "https://suedeai.ai/founder#person" },
      spatialCoverage: [
        { "@type": "Place", name: "West Palm Beach, Florida" },
        { "@type": "Place", name: "Jupiter, Florida" },
        { "@type": "Place", name: "Palm Beach County, Florida" },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${CANONICAL}#notes`,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: NOTES.length,
      itemListElement: NOTES.map((note, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${note.href}`,
        name: note.title,
      })),
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

export default function NotesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <Article
        eyebrow="Notes from Suede AI"
        crumbs={CRUMBS}
        title={
          <>
            Notes from Suede AI:{" "}
            <em className="font-display italic text-peach">how GuitarHub gets built.</em>
          </>
        }
        dek="Field notes from Jason Colapietro on engineering, writing and growing a guitar site from West Palm Beach, Florida."
        updated={UPDATED}
        callToAction={
          <NoteCallToAction
            heading="Want a site built this way?"
            body="Suede AI builds websites, AI search visibility and agent platforms for businesses in West Palm Beach, Jupiter and across Palm Beach County. Start with an assessment."
          />
        }
      >
        <p>
          GuitarHub is a guitar practice site and iPhone app engineered by Jason
          Colapietro and Suede AI. These notes are the build log behind it: how
          one engineer runs a lesson platform, how guitar players in Palm Beach
          County can use it alongside local lessons and jams, and how the
          comparison pages are written so that search engines and AI answers
          cite them. The practice guides live on the{" "}
          <Link href="/guides">guides page</Link>; these notes are about the
          work of building the site itself.
        </p>

        <h2>All notes</h2>

        <ul>
          {NOTES.map((note) => (
            <li key={note.href}>
              <Link href={note.href}>
                <strong>{note.title}</strong>
              </Link>
              . {note.blurb}
            </li>
          ))}
        </ul>

        <h2>Who writes them</h2>

        <p>
          Jason Colapietro founded Suede AI in 2024 in West Palm Beach, Florida.
          Suede AI is an agentic platform company, with a{" "}
          <a href={SUEDE_NETWORK.agency}>web development and AI SEO practice</a>{" "}
          serving Jupiter, Palm Beach Gardens and the rest of Palm Beach County.
          Every claim in these notes links to its source, and the full set of
          receipts sits on the{" "}
          <a href={SUEDE_NETWORK.evidence}>Suede AI evidence page</a>.
        </p>

        <NoteAuthor />
      </Article>
    </>
  );
}
