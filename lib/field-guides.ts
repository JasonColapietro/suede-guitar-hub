/**
 * The Field Guide series: a downloadable PDF of each written guide, sold to
 * the eye by a magazine-style photo cover.
 *
 * The covers are art, not previews. They name the problem a guide solves over
 * a photograph of someone playing, and the PDF inside is the plain guide.
 * Nothing on a cover claims a result, a mentor, or a number the guide does not
 * already contain.
 *
 * Each entry points at a route in `lib/site.ts` by href. Titles and blurbs are
 * never restated here; the cards read them from the registry, so a renamed
 * guide renames its shelf card with it. The cover and PDF paths are derived
 * from `slug` and are produced by:
 *
 *   node --experimental-strip-types scripts/field-guide-art/render-covers.mjs
 *   node --experimental-strip-types scripts/field-guide-art/build-pdfs.mjs <base-url>
 *
 * `tests/field-guides.test.ts` fails if a cover or PDF is missing, or if an
 * entry points at a route the registry does not know.
 */

export type FieldGuide = {
  /** Route of the web guide this PDF is made from. Must exist in `GUIDES`. */
  href: string;
  /** File stem for the cover and the PDF. */
  slug: string;
  /** Issue number printed on the cover. Stable once published. */
  issue: number;
  /** Big cover title. Short, loud, uppercase in the art. */
  coverTitle: string;
  /** The short line under the title. */
  shout: string;
  /** Spot colour for the rule, issue number and FREE PDF tag. */
  accent: string;
};

export const FIELD_GUIDES: readonly FieldGuide[] = [
  { href: "/method", slug: "the-method", issue: 1, coverTitle: "The Method", shout: "No more guessing!", accent: "#f4c430" },
  { href: "/how-to-practice-guitar-effectively", slug: "practice-effectively", issue: 2, coverTitle: "Make the Hour Count", shout: "Tick... tick...", accent: "#f4c430" },
  { href: "/guitar-practice-plateau", slug: "the-plateau", issue: 3, coverTitle: "The Plateau", shout: "Stuck?!", accent: "#f4c430" },
  { href: "/deliberate-practice-guitar", slug: "deliberate-practice", issue: 4, coverTitle: "Find the Real Problem", shout: "Aha!", accent: "#f4c430" },
  { href: "/30-day-guitar-challenge", slug: "30-day-challenge", issue: 5, coverTitle: "30 Days", shout: "One recording!", accent: "#f4c430" },
  { href: "/guitar-practice-routine-intermediate", slug: "intermediate-routine", issue: 6, coverTitle: "Level Up", shout: "Next stage!", accent: "#f08a24" },
  { href: "/how-long-to-practice-guitar-each-day", slug: "how-long-each-day", issue: 7, coverTitle: "How Long Is Enough?", shout: "20 min? 2 hours?", accent: "#f4c430" },
  { href: "/guitar-practice-schedule", slug: "practice-schedule", issue: 8, coverTitle: "Survive Wednesday", shout: "Not again!", accent: "#f4c430" },
  { href: "/why-cant-i-play-guitar-fast", slug: "play-it-fast", issue: 9, coverTitle: "Faster!", shout: "Zzzip!", accent: "#f4c430" },
  { href: "/how-to-memorize-songs-on-guitar", slug: "memorize-a-song", issue: 10, coverTitle: "No Tab Needed", shout: "Got it!", accent: "#2bb3c0" },
  { href: "/practicing-guitar-with-a-metronome", slug: "metronome", issue: 11, coverTitle: "Lock In", shout: "Tick! Tock!", accent: "#f4c430" },
  { href: "/resources/how-to-practice-clean-guitar-tone", slug: "clean-tone", issue: 12, coverTitle: "Clean Is Hard", shout: "Nowhere to hide!", accent: "#e4402b" },
  { href: "/resources/jeff-buckley-hallelujah-guitar-tone", slug: "hallelujah-tone", issue: 13, coverTitle: "The Quiet Part", shout: "Shhh...", accent: "#f4c430" },
  { href: "/resources/recording-guitar-room-sound", slug: "room-sound", issue: 14, coverTitle: "Hear the Room", shout: "Echo... echo...", accent: "#1f8a4c" },
  { href: "/resources/nam-a2-open-tone-format", slug: "open-tone", issue: 15, coverTitle: "Tone, Unlocked", shout: "Open format!", accent: "#f4c430" },
];

export function fieldGuideCover(guide: FieldGuide): string {
  return `/field-guides/covers/${guide.slug}.webp`;
}

export function fieldGuidePdf(guide: FieldGuide): string {
  return `/field-guides/guitarhub-field-guide-${String(guide.issue).padStart(2, "0")}-${guide.slug}.pdf`;
}

export function fieldGuideForHref(href: string): FieldGuide | undefined {
  return FIELD_GUIDES.find((guide) => guide.href === href);
}
