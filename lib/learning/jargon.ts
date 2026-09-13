/**
 * The jargon the curriculum ships, matched against the vendored glossary.
 *
 * The defect this exists for: `passaggio`, `mix`, `twang` and `pressed
 * phonation` reached beginners in `lib/learning/data/voice.json` with no
 * definition anywhere on the site and no link to one. A glossary page alone
 * would not have fixed that — a beginner reading "Get louder with no
 * pressed-phonation flag" on a lesson page does not go looking for a glossary.
 * So the words are resolved where they are read.
 *
 * The list of words is derived from the curriculum data crossed with the
 * vendored set rather than maintained by hand: `termsIn` scans a module's own
 * prose for every term and alternative name in `contracts/glossary.json`. A word
 * sing adds becomes a link here with no edit, and a lesson retitled away from a
 * term stops claiming one.
 *
 * A hand-kept list is still needed for the opposite direction. A word the
 * curriculum uses that the glossary does not define cannot be found by scanning
 * for words the glossary defines, so nothing derived from the vendored set can
 * notice it is missing. `CURRICULUM_JARGON` is that list, and it is deliberately
 * tiny: the four words named in the defect. `tests/glossary.test.ts` turns an
 * undefined one into a build failure, and keeps the list from rotting into
 * fiction by also requiring every entry to be a word the curriculum still
 * ships — so a word removed from the curriculum must be removed from here, and
 * the list cannot grow a term that was never used.
 *
 * Read through `curriculum.ts` rather than the JSON files, so the guitar track's
 * merged song catalog is covered and a curriculum restructure cannot leave this
 * scanning a subset of what ships.
 */
import { allLessons, curricula, type TrackId } from "./curriculum.ts";
import {
  type GlossaryDomain,
  type GlossaryTerm,
  fold,
  glossaryKey,
  spellings,
  termsIn,
} from "@/lib/glossary";

/**
 * The vocabulary each track's prose can plausibly mean. `music` belongs to both:
 * a cent is a cent. Guitar senses are kept out of the voice scan and voice
 * senses out of the guitar scan, because "support" and "register" mean different
 * things on the two instruments, and a cross-domain match would offer a singer a
 * definition about how to hold a guitar.
 */
export const DOMAINS_FOR_TRACK: Record<TrackId, readonly GlossaryDomain[]> = {
  guitar: ["music", "guitar"],
  voice: ["music", "voice"],
};

/**
 * The words a beginner cannot be expected to know and the glossary must
 * therefore define. Hand-kept on purpose and as short as possible; see the
 * header. Spelled as the curriculum spells them, and matched with punctuation
 * folded, so "pressed phonation" finds "pressed-phonation".
 */
export const CURRICULUM_JARGON: readonly { word: string; track: TrackId }[] = [
  { word: "passaggio", track: "voice" },
  { word: "mix", track: "voice" },
  { word: "twang", track: "voice" },
  { word: "pressed phonation", track: "voice" },
];

/**
 * Every authored sentence on one lesson's own page: the lesson title and
 * summary, and the module heading, promise and skill the page renders around
 * them. Nothing beyond what a reader of that page can see, so the glossary block
 * never defines a word the page does not use.
 */
export function lessonProse(track: TrackId, lessonId: string): string {
  const entry = allLessons(track).find((item) => item.lesson.id === lessonId);
  if (!entry) return "";
  const { lesson, module: unit } = entry;
  return [unit.name, unit.promise, unit.skill ?? "", lesson.title, lesson.summary].join(" ");
}

/** Every authored sentence in one track, for the coverage assertions. */
export function trackProse(track: TrackId): string {
  const parts: string[] = [];
  for (const level of curricula[track].levels) {
    parts.push(level.name, level.subtitle);
    for (const unit of level.modules) {
      parts.push(unit.name, unit.promise, unit.skill ?? "");
      for (const lesson of unit.lessons) parts.push(lesson.title, lesson.summary);
    }
  }
  return parts.join(" ");
}

/**
 * The glossary entries one lesson page should offer a definition for, in
 * alphabetical order and de-duplicated by domain-qualified key.
 */
export function lessonGlossary(track: TrackId, lessonId: string): readonly GlossaryTerm[] {
  const seen = new Set<string>();
  return termsIn(lessonProse(track, lessonId), DOMAINS_FOR_TRACK[track])
    .filter((entry) => {
      const key = glossaryKey(entry);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .toSorted((a, b) => a.term.localeCompare(b.term, "en"));
}

/** Every glossary entry the whole track's prose uses. */
export function trackGlossary(track: TrackId): readonly GlossaryTerm[] {
  return termsIn(trackProse(track), DOMAINS_FOR_TRACK[track]);
}

/**
 * The vendored entry that defines one hand-listed jargon word, or null. Matched
 * against the same folded spellings the scanner uses, so the list cannot pass by
 * naming a word the glossary spells differently.
 */
export function definitionOf(word: string, track: TrackId): GlossaryTerm | null {
  const needle = fold(word);
  return (
    termsIn(needle, DOMAINS_FOR_TRACK[track]).find((entry) =>
      spellings(entry).includes(needle),
    ) ?? null
  );
}

/** True when the curriculum's own prose still uses this word. */
export function curriculumUses(word: string, track: TrackId): boolean {
  const needle = fold(word);
  return new RegExp(`(?<![a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:es|s)?(?![a-z0-9])`).test(
    fold(trackProse(track)),
  );
}
