import type { Metadata } from "next";
import Article, { type RelatedLink } from "@/components/Article";
import { OG_IMAGE, RESOURCES, SITE_URL, STRUMLY } from "@/lib/site";

const CANONICAL = `${SITE_URL}/resources/print-the-quiet`;
const PUBLISHED = "2026-08-31";
const TITLE = "Print the Quiet Guitar Tone Field Guides";
const DESCRIPTION =
  "Three practical GuitarHub guides on clean tone, Jeff Buckley's Hallelujah and room sound, adapted from Jason Colapietro's Print the Quiet essays.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "Jason Colapietro", url: "https://suedeai.ai/founder" }],
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
    images: [OG_IMAGE.url],
  },
};

const FIELD_GUIDES: readonly RelatedLink[] = RESOURCES.filter((entry) =>
  [
    "/resources/how-to-practice-clean-guitar-tone",
    "/resources/jeff-buckley-hallelujah-guitar-tone",
    "/resources/recording-guitar-room-sound",
  ].includes(entry.href),
);

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${CANONICAL}#collection`,
  name: TITLE,
  description: DESCRIPTION,
  url: CANONICAL,
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  inLanguage: "en-US",
  author: { "@id": "https://suedeai.ai/founder#person" },
  publisher: { "@id": "https://suedeai.ai/#organization" },
  hasPart: FIELD_GUIDES.map((guide, index) => ({
    "@type": "Article",
    position: index + 1,
    name: guide.title,
    url: `${SITE_URL}${guide.href}`,
  })),
};

export default function PrintTheQuietHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <Article
        eyebrow="GuitarHub editorial series"
        title={
          <>
            Print the Quiet, turned into{" "}
            <em className="font-display italic text-peach">practice tests.</em>
          </>
        }
        dek="Three field guides for players who want to hear what clean tone, right-hand dynamics and a real room are doing, then prove the difference in a recording."
        updated={PUBLISHED}
        related={FIELD_GUIDES}
        relatedTitle="Choose a field guide"
      >
        <p>
          <strong>By Jason Colapietro, writing as Johnny Suede.</strong>
        </p>

        <p>
          <a href={STRUMLY.printTheQuiet}>Print the Quiet</a> is a nine-essay
          series about tone, dynamics and the parts of a record that never make
          it onto the lead sheet. The original essays remain on Strumly in their
          long-form editorial versions.
        </p>

        <p>
          These GuitarHub editions are field guides, not reprints. Each one
          takes a guitar-first idea from the series and turns it into a bounded
          test you can run with one instrument, one recording device and a short
          practice window. The goal is to give each idea an observable meaning.
        </p>

        <h2>Start with the result you want to hear</h2>

        <p>
          Choose the clean-tone guide if gain is hiding uneven attack or noisy
          muting. Choose the Hallelujah guide if you want to study how dynamics
          and space can carry a part with very little gear. Choose the room guide
          if your recordings feel flat and you cannot tell whether the problem
          is the performance, the microphone position or the ambience.
        </p>

        <p>
          Every guide ends with a before-and-after recording. That keeps the
          work inside the GuitarHub method: make one claim, change one variable
          and keep the result only if the recording supports it.
        </p>

        <h2>What these pages do not claim</h2>

        <p>
          A famous rig is context, not a prescription. You do not need Mark
          Knopfler&apos;s amplifier, Jeff Buckley&apos;s Telecaster or a major studio
          room to learn from their records. You need a stable signal, matched
          playback level and enough patience to compare two takes honestly.
        </p>

        <p>
          Read the original series for the wider history. Use these field guides
          when you are holding the guitar.
        </p>
      </Article>
    </>
  );
}
