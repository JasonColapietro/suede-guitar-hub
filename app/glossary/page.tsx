import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import {
  GLOSSARY_CANONICAL,
  GLOSSARY_TERMS,
  GUITAR_TERMS,
  SING_PUBLISHED_TERMS,
  definitionHref,
  termAnchor,
  usageHref,
  type GlossaryTerm,
} from "@/lib/glossary";
import { HUBS, OG_IMAGE, STRUMLY } from "@/lib/site";

/**
 * The shared vocabulary, rendered from `contracts/glossary.json`.
 *
 * Two rules govern this page, and both are asserted in `tests/glossary.test.ts`:
 *
 * 1. It defines the guitar senses and nothing else. Every voice and music word
 *    is a link to its anchor in Suede Sing's glossary, not a second definition
 *    of the same word on a second site.
 * 2. It emits no schema.org term markup, for any word, in either direction. Sing
 *    is the definitional source for the whole set; a second site claiming the
 *    same terms competes with it for the one thing the markup is for.
 *
 * Free and indexable, like the rest of `HUBS`. Nothing here is gated, so nothing
 * here sets `robots`: `canOpenModule` governs the lesson pages, and a reference
 * page with no gate has no gate to follow.
 */

const CANONICAL = GLOSSARY_CANONICAL;
const CRUMBS = crumbTrail("Glossary", CANONICAL);

/** Read from the registry so the page and the sitemap cannot disagree on the date. */
const ENTRY = HUBS.find((hub) => hub.href === "/glossary");
const PUBLISHED = ENTRY?.lastModified ?? "2026-09-13";

const TITLE = "Guitar and Voice Glossary: Every Term in One Sentence";
const DESCRIPTION =
  "The guitar vocabulary defined in one sentence each, and every voice and music term linked to its definition in Suede Sing. Free, with the page where each word is used.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    // Required, not decorative: a page-level `openGraph` block replaces the
    // root layout's resolved object, taking the file-convention card with it.
    // See OG_IMAGE in lib/site.ts.
    images: [OG_IMAGE],
  },
  alternates: { canonical: CANONICAL },
};

/**
 * A `WebPage` and the breadcrumb trail, and deliberately nothing else. The
 * term-level markup for this vocabulary is published once, by Suede Sing.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${CANONICAL}#webpage`,
      url: CANONICAL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": "https://guitarhub.org/#website" },
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

/** Alphabetical groups for the jump index, built from the data rather than typed. */
function initials(terms: readonly GlossaryTerm[]): readonly string[] {
  return [...new Set(terms.map((entry) => entry.term[0].toUpperCase()))].toSorted();
}

function GuitarEntry({ entry }: { entry: GlossaryTerm }) {
  const anchor = termAnchor(entry.term);
  return (
    <div className="mt-10 scroll-mt-24" id={anchor}>
      <h3 className="font-display text-2xl leading-snug text-indigo-deep">
        {entry.term}
        {entry.aka && entry.aka.length > 0 ? (
          <span className="ml-2 text-base font-normal text-ink/60">
            also {entry.aka.join(", ").toLowerCase()}
          </span>
        ) : null}
      </h3>
      <p>{entry.definition}</p>
      <p>
        {entry.where}{" "}
        <Link href={entry.href}>See it in use</Link>.
      </p>
    </div>
  );
}

export default function GlossaryPage() {
  const voiceAndMusic = SING_PUBLISHED_TERMS;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Article
        eyebrow="GuitarHub reference"
        title={
          <>
            The words, <em className="font-display italic text-peach">defined once.</em>
          </>
        }
        dek={`${GLOSSARY_TERMS.length} terms across guitar, voice and the music vocabulary neither instrument owns. One sentence each, and the page where the word is already in use.`}
        updated={PUBLISHED}
        crumbs={CRUMBS}
        related={[
          ...HUBS.filter((hub) => hub.href === "/guides"),
          {
            href: "/learn/voice",
            title: "Learn voice step by step",
            blurb:
              "The voice curriculum this vocabulary belongs to, with every lesson's words linked to a definition.",
          },
        ]}
      >
        <p>
          A word means different things on different instruments.{" "}
          <strong>Register</strong> is a way of setting up the vocal folds and a
          region of the neck. <strong>Support</strong> is breath management and how
          the guitar is held. So each of those words gets one entry per instrument
          that uses it, rather than one entry vague enough to be useless to both.
        </p>
        <p>
          The vocabulary is authored once, in Suede Sing, and copied here
          unchanged. Sing is the definitional source for every voice and music
          term, so those words are listed below as links to its glossary rather
          than defined a second time on a second site. The guitar senses are
          defined here, because this is where they are used.
        </p>

        <h2>Guitar words</h2>
        <p>
          {GUITAR_TERMS.length} terms, defined on this page. Jump to{" "}
          {initials(GUITAR_TERMS).map((letter, index) => (
            <span key={letter}>
              {index > 0 ? ", " : ""}
              <Link
                href={`#${termAnchor(
                  GUITAR_TERMS.find((entry) => entry.term.startsWith(letter))!.term,
                )}`}
              >
                {letter}
              </Link>
            </span>
          ))}
          .
        </p>
        {GUITAR_TERMS.map((entry) => (
          <GuitarEntry key={entry.term} entry={entry} />
        ))}

        <h2>Voice and music words</h2>
        <p>
          {voiceAndMusic.length} terms, defined in{" "}
          <a href={STRUMLY.singGlossary}>the Suede Sing glossary</a>. Each link
          opens that page at the word. They are listed here so a singer reading a
          voice lesson on this site is never left with a bare word, and they are
          not restated here so that one definition of each word exists rather than
          two.
        </p>
        <ul>
          {voiceAndMusic.map((entry) => (
            <li key={`${entry.domain}:${entry.term}`}>
              <a href={definitionHref(entry)}>{entry.term}</a>
              {entry.aka && entry.aka.length > 0 ? (
                <> ({entry.aka.join(", ").toLowerCase()})</>
              ) : null}{" "}
              <span className="text-ink/60">
                &middot; {entry.domain === "voice" ? "voice" : "music"}, used in{" "}
                <a href={usageHref(entry)}>{entry.href}</a>
              </span>
            </li>
          ))}
        </ul>
      </Article>
    </>
  );
}
