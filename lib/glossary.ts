/**
 * The shared vocabulary of the two instruments Suede teaches, read from
 * `contracts/glossary.json`.
 *
 * The contract is authored in JasonColapietro/sing and vendored here byte for
 * byte by `scripts/sync-sing-glossary.mjs`. Nothing in this repository may edit
 * it: a definition changed on this side would be a second, quietly divergent
 * meaning for a word two sites share.
 *
 * ## Why a domain field
 *
 * Four words mean different things on the two instruments. `register` is a
 * vocal mechanism and a region of the neck. `support` is breath management and
 * how the guitar is held. `tone` and `mix` each carry several senses. So a
 * colliding word gets one entry per domain that actually uses it, and `music`
 * carries the vocabulary neither instrument owns.
 *
 * ## Why this site publishes no term markup
 *
 * Two sites emitting schema.org term markup for one word compete with each
 * other as the definitional source for it. Sing is that source for the whole
 * set. This repository renders the `guitar` entries as plain prose with stable
 * anchors, links every voice and music word out to sing's glossary anchor
 * instead of restating it, and emits no schema.org term markup for any term at
 * all. `tests/glossary.test.ts` fails if that markup ever appears here, which is
 * the only form in which that decision survives the next person.
 */
import glossaryContract from "@/contracts/glossary.json" with { type: "json" };
import { SITE_URL, STRUMLY } from "@/lib/site";

/** Which instrument's vocabulary an entry belongs to. */
export type GlossaryDomain = "music" | "voice" | "guitar";

/** Which site renders an entry and owns its structured data. */
export type GlossaryPublisher = "sing" | "guitarHub";

export type GlossaryTerm = {
  term: string;
  /** Other names a reader may arrive with. */
  aka?: readonly string[];
  /** One sentence. Definition only. */
  definition: string;
  /** A sentence naming a surface where the word is in use. */
  where: string;
  /** A path in the publishing site, never in the other one. */
  href: string;
  domain: GlossaryDomain;
  /**
   * Present in the emitted contract. Recomputed here rather than trusted, so a
   * contract that disagrees with the rule fails a test instead of quietly
   * moving a term's structured data to the wrong site.
   */
  publishedBy?: GlossaryPublisher;
};

export const GLOSSARY_DOMAINS: readonly GlossaryDomain[] = ["music", "voice", "guitar"];

/**
 * `guitar` → this site, everything else → sing. The rule, not the field: see
 * `publishedByAgreesWithRule` in `tests/glossary.test.ts`.
 */
export function publisherFor(domain: GlossaryDomain): GlossaryPublisher {
  return domain === "guitar" ? "guitarHub" : "sing";
}

export const GLOSSARY_CONTRACT = glossaryContract as {
  contract: string;
  version: number;
  /** Set only while the real contract is not yet on sing's default branch. */
  provisional?: boolean;
  terms: readonly GlossaryTerm[];
};

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = GLOSSARY_CONTRACT.terms;

/** True while `contracts/glossary.json` is the placeholder rather than the vendored file. */
export const GLOSSARY_IS_PROVISIONAL = GLOSSARY_CONTRACT.provisional === true;

/**
 * Anchor id for one term.
 *
 * Deliberately identical to sing's `termId`, because this function also builds
 * the outbound links into sing's glossary page: a different slug here would
 * produce links that load the page and land nowhere. Apostrophes and periods are
 * dropped rather than hyphenated so "singer's formant" is not
 * "singer-s-formant".
 *
 * Anchors are unique per publishing site rather than across the whole set. A
 * colliding word has one entry per domain, but the two entries are rendered on
 * two different pages, so `register` is one anchor here and one anchor there.
 */
export function termAnchor(term: string): string {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Unique across the whole set, which the term string alone is not. */
export function glossaryKey(entry: GlossaryTerm): string {
  return `${entry.domain}:${termAnchor(entry.term)}`;
}

/** The guitar vocabulary, which this site defines. Alphabetical: there is no reading order. */
export const GUITAR_TERMS: readonly GlossaryTerm[] = GLOSSARY_TERMS.filter(
  (entry) => publisherFor(entry.domain) === "guitarHub",
).toSorted((a, b) => a.term.localeCompare(b.term, "en"));

/** The voice and music vocabulary, which sing defines and this site links to. */
export const SING_PUBLISHED_TERMS: readonly GlossaryTerm[] = GLOSSARY_TERMS.filter(
  (entry) => publisherFor(entry.domain) === "sing",
).toSorted((a, b) => a.term.localeCompare(b.term, "en"));

export const GLOSSARY_HREF = "/glossary";
export const GLOSSARY_CANONICAL = `${SITE_URL}${GLOSSARY_HREF}`;

/**
 * Where a reader goes for this word's definition: an anchor on this site's
 * glossary for a guitar term, and sing's glossary anchor for everything else.
 *
 * Resolved through `STRUMLY.singGlossary` rather than spelled out, because
 * `lib/site.ts` is the only place this codebase is allowed to name an external
 * host and its own comment says so.
 */
export function definitionHref(entry: GlossaryTerm): string {
  const anchor = termAnchor(entry.term);
  return publisherFor(entry.domain) === "guitarHub"
    ? `${GLOSSARY_HREF}#${anchor}`
    : `${STRUMLY.singGlossary}#${anchor}`;
}

/** The destination this term's own `href` points at, absolute for sing's paths. */
export function usageHref(entry: GlossaryTerm): string {
  return publisherFor(entry.domain) === "guitarHub"
    ? entry.href
    : `${STRUMLY.sing}${entry.href}`;
}

/**
 * Every spelling a reader might arrive with, lowercased and punctuation-folded
 * so "pressed-phonation" in a lesson summary matches "Pressed phonation".
 *
 * Spellings that fold to nothing are dropped. Some alternative names are bare
 * symbols — "Sharp and flat" carries the glyphs as its `aka` — and an empty
 * needle matches every string, which silently attached that entry to every
 * lesson on the site before this filter existed.
 */
export function spellings(entry: GlossaryTerm): readonly string[] {
  return [entry.term, ...(entry.aka ?? [])].map(fold).filter((name) => name.length > 1);
}

/** Lowercase, strip accents and reduce every run of punctuation to one space. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The glossary entries whose term or alternative name appears in `text`, looked
 * up from the vendored set rather than from a list kept by hand, so a word sing
 * adds becomes linkable here without an edit.
 *
 * `domains` narrows the search to the vocabulary the surface can plausibly mean:
 * scanning a voice lesson for guitar senses would match "Support" in the guitar
 * sense against a sentence about breath. A trailing plural is accepted so
 * "cents" finds "Cent"; nothing else is stemmed, because a looser match on a
 * three-letter term like "Tab" starts inventing links.
 */
export function termsIn(
  text: string,
  domains: readonly GlossaryDomain[],
): readonly GlossaryTerm[] {
  const haystack = ` ${fold(text)} `;
  return GLOSSARY_TERMS.filter(
    (entry) =>
      domains.includes(entry.domain) &&
      spellings(entry).some((needle) =>
        new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?:es|s)?(?![a-z0-9])`).test(
          haystack,
        ),
      ),
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
