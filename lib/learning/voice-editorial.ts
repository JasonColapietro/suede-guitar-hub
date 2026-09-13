/**
 * What a singer should read alongside each voice module, and what they should
 * sing — both resolved through the vendored contract rather than written out.
 *
 * The voice track teaches registers, the passaggio, breath, resonance, belt
 * safety and vocal health, and this repository has written none of that down.
 * Suede Sing has: a 31,738-word book across twenty-three chapters, a
 * 72,394-word atlas across twenty-seven, six hundred and thirty-six singer
 * records each carrying a written technique paragraph, and a catalogue of
 * twenty-four popular songs with a key and a cited vocal range. The track
 * meanwhile names no repertoire at all. Its modules are called "First Song",
 * "Tenth Song" and "Twelfth Song", and a singer reaching one of them is told to
 * sing a song without being told which song.
 *
 * So this table cites. It does not copy. One site is the source for a piece of
 * writing and the other points at it, because two sites publishing the same
 * paragraph is two sites competing to be the place that paragraph lives. What
 * is authored here is only the reason a module sends a singer to a chapter —
 * which is curricular, and belongs to the curriculum — while the chapter's
 * title, its abstract, its Pro gate and its URL all come out of
 * `contracts/suede-vocal.json`.
 *
 * That is the same discipline `voice-proof.ts` already applies to rooms, and for
 * the same reason. A hand-written `https://sing.suedeai.ai/book/registers` in a
 * lesson page survives the chapter being renamed; a citation resolved through
 * the contract does not, and `tests/voice-editorial.test.ts` fails instead.
 *
 * The gate is the part that is easy to get wrong. Most of both books is behind
 * Suede Sing Pro, verified against Stripe on that side, and the first two voice
 * levels here are free. A free lesson may still cite a paid chapter — the
 * reading is genuinely the best reading — but it has to say so on the page
 * rather than discovering it for the singer at the paywall. `gate` carries that
 * disclosure, derived from the contract's `free` flag and never from a guess.
 *
 * Repertoire is handled differently again, and deliberately. A module does not
 * name a song; it states the requirement the song has to meet — how wide a span
 * the module is ready for, and how hard a song it will tolerate — and the
 * catalogue is filtered against the contract's published ranges. A curriculum
 * that hand-picked three slugs would go stale the first time the catalogue
 * changed, and worse, it could name a song whose range contradicts the module
 * it was chosen for.
 */
import vocalContract from "../../contracts/suede-vocal.json" with { type: "json" };

type Contract = typeof vocalContract;
type Shelf = Contract["editorial"]["book"];
type Chapter = Shelf["chapters"][number];
type Song = Contract["editorial"]["repertoire"]["songs"][number];

/** Where a citation points. A slug is resolved against the contract, never concatenated. */
export type CitationTarget =
  | { shelf: "book"; slug: string }
  | { shelf: "atlas"; slug: string }
  /** A page that answers a question with a table. See `referenceTables` in the contract. */
  | { shelf: "referenceTable"; id: keyof Contract["editorial"]["referenceTables"] };

export interface Citation {
  target: CitationTarget;
  /**
   * Why this module sends a singer here. Authored in this repository because the
   * reason is curricular: it is about what the module is trying to teach, not
   * about what the chapter says.
   */
  why: string;
}

/**
 * What a song has to be for a module to hand it over. Stated as a requirement
 * rather than as a list of slugs, so the songs are always the catalogue's and
 * the judgment is always the curriculum's.
 */
export interface RepertoireRequirement {
  /** Semitones, inclusive. A module for one register asks for a narrow song. */
  spanAtLeast?: number;
  spanAtMost?: number;
  /** The hardest difficulty the module will hand a singer, in the contract's own scale. */
  hardest?: Song["difficulty"];
  /** Why those bounds are the right bounds for this module. */
  why: string;
}

export interface ModuleEditorial {
  reading: Citation[];
  repertoire?: RepertoireRequirement;
}

/** The contract's difficulty scale, ordered. Not a number this repository sets. */
const DIFFICULTY_ORDER: Song["difficulty"][] = ["Easy", "Medium", "Hard"];

/**
 * Keyed by module. Absence is the default and is not a gap: most modules are a
 * drill with nothing to read, and citing a chapter at every one of thirty-four
 * modules would make the citations worth nothing.
 *
 * The five mappings the integration spec settled are the backbone here — range
 * and voice type to the band table, breath to the breath chapter, registers to
 * the registers chapter, belt safety to the safety-rail chapter, vocal health to
 * stamina and health — and `tests/voice-editorial.test.ts` asserts each of them
 * by name, so the spec's decision cannot be quietly dropped in an edit.
 */
export const VOICE_MODULE_EDITORIAL: Record<string, ModuleEditorial> = {
  // ── Level 1 · Room Check ────────────────────────────────────────────────
  "v-l1-m2": {
    reading: [
      {
        target: { shelf: "referenceTable", id: "vocalRangeByVoiceType" },
        why: "The module hands back a voice type, and a label with no band around it invites a singer to treat it as a diagnosis. The table prints the conventional band for all eight types and says in the same breath that range and type are different measurements.",
      },
      {
        target: { shelf: "book", slug: "reading-the-range-test" },
        why: "What the two numbers a scan produces do and do not say, written by the surface that produced them.",
      },
      {
        target: { shelf: "book", slug: "range-is-not-one-number" },
        why: "The scan records what a singer reached by pushing. The range they can use is narrower, and conflating the two is how a module about range becomes a module about strain.",
      },
    ],
  },
  "v-l1-m3": {
    reading: [
      {
        target: { shelf: "book", slug: "breath" },
        why: "The module asks for a low breath and a long hiss without saying what support is. This chapter separates support from pressure, which is the distinction the drill depends on and cannot itself teach.",
      },
    ],
  },

  // ── Level 2 · Steady Tone ───────────────────────────────────────────────
  "v-l2-m4": {
    reading: [
      {
        target: { shelf: "book", slug: "choosing-songs" },
        why: "A first song chosen badly is a month of practising around a note the singer cannot reach yet. Choosing on range rather than on taste is a skill, and it is the one this module silently assumes.",
      },
    ],
    repertoire: {
      spanAtMost: 14,
      hardest: "Easy",
      why: "One register, so the song must not cross a transition: an octave and a tone is the widest span a singer can reasonably keep in one gear, and nothing harder than the catalogue's easiest tier belongs at a singer's first song.",
    },
  },

  // ── Level 3 · Two Registers ─────────────────────────────────────────────
  "v-l3-m1": {
    reading: [
      {
        target: { shelf: "book", slug: "registers" },
        why: "The module asks a singer to produce one pitch two ways and hear the difference. Nothing on any Suede surface classifies which mechanism they used, so the reading is the whole of the explanation.",
      },
    ],
  },
  "v-l3-m3": {
    reading: [
      {
        target: { shelf: "book", slug: "resonance" },
        why: "Vowel shape is a resonance question, and the module's five vowels are otherwise five instructions with no account of why they behave differently.",
      },
    ],
  },
  "v-l3-m4": {
    repertoire: {
      spanAtLeast: 16,
      spanAtMost: 19,
      hardest: "Medium",
      why: "A song that crosses one transition and no more. Below sixteen semitones it can be sung in a single gear and the module's point is lost; above nineteen it needs a top the singer has not built yet.",
    },
    reading: [],
  },

  // ── Level 4 · Pitch, Time, Words ────────────────────────────────────────
  "v-l4-m1": {
    reading: [
      {
        target: { shelf: "book", slug: "pitch-accuracy" },
        why: "The module is scored in cents, and a singer shown a cents figure without knowing what the tolerance window forgives will read a good score as perfect pitch and a bad one as a bad voice.",
      },
    ],
  },

  // ── Level 5 · Through the Break ─────────────────────────────────────────
  "v-l5-m1": {
    reading: [
      {
        target: { shelf: "book", slug: "the-passaggio" },
        why: "Where it breaks and why, which is the explanation this module needs and cannot get from a measurement: no Suede surface derives a personal passaggio from a range scan.",
      },
      {
        target: { shelf: "book", slug: "finding-your-break" },
        why: "The module asks a singer to locate their own transition by ear. This is the method for doing it, against the published zone for their voice type rather than against a number the app invented.",
      },
    ],
  },
  "v-l5-m3": {
    reading: [
      {
        target: { shelf: "atlas", slug: "a-vocabulary-for-tone" },
        why: "Twang and ring are words before they are measurements, and the module uses both. The atlas defines the tone vocabulary the whole library is written in.",
      },
      {
        target: { shelf: "book", slug: "resonance" },
        why: "Resonance over force is the module's entire claim. The chapter is where the claim is argued rather than asserted.",
      },
    ],
  },
  "v-l5-m4": {
    reading: [
      {
        target: { shelf: "atlas", slug: "the-safety-rail" },
        why: "This module sits near the top of the transition zone and asks for a six-second mixed-voice hold. Nothing here measures strain, so the singer needs the risk and stop rules before attempting it.",
      },
    ],
  },

  // ── Level 6 · Agility ───────────────────────────────────────────────────
  "v-l6-m6": {
    repertoire: {
      spanAtLeast: 21,
      why: "An extended-range song, which is the point of the module: twenty-one semitones is where the catalogue's wide songs begin, and difficulty is deliberately unbounded because by this level the top is the exercise.",
    },
    reading: [
      {
        target: { shelf: "book", slug: "transposition" },
        why: "A wide song that does not fit is a key problem before it is a technique problem, and a singer who does not know that will spend the module trying to grow a fifth in a fortnight.",
      },
    ],
  },

  // ── Level 7 · Signature ─────────────────────────────────────────────────
  "v-l7-m1": {
    reading: [
      {
        target: { shelf: "book", slug: "stamina-and-health" },
        why: "The one voice module whose proof is genuinely knowledge rather than a recording. Warming up, not hurting yourself, and what load actually means, written where the dose figure is computed.",
      },
    ],
  },
  "v-l7-m2": {
    reading: [
      {
        target: { shelf: "atlas", slug: "how-to-borrow-a-voice" },
        why: "The module asks for one song performed two recognisably different ways and leaves the singer to invent both. Borrowing from a named voice is the method, and the atlas is the library of voices to borrow from.",
      },
    ],
  },
  "v-l7-m5": {
    reading: [
      {
        target: { shelf: "book", slug: "tracking-change" },
        why: "Range extension is the slowest thing in the curriculum and the easiest to imagine. Months rather than days is the chapter's argument, and this module is where a singer most needs it.",
      },
    ],
  },
  "v-l7-m6": {
    reading: [
      {
        target: { shelf: "book", slug: "building-a-set" },
        why: "Performance is the module, and surviving a set is the part a practice room never rehearses: the third song is sung by a voice the first two already tired.",
      },
    ],
  },
};

function chapters(shelf: "book" | "atlas"): Chapter[] {
  return vocalContract.editorial[shelf].chapters;
}

function findChapter(shelf: "book" | "atlas", slug: string): Chapter {
  const found = chapters(shelf).find((chapter) => chapter.slug === slug);
  if (!found) {
    throw new Error(
      `Suede Sing ${shelf} chapter "${slug}" is not in contracts/suede-vocal.json. ` +
        `It was renamed or withdrawn; fix the citation rather than the contract.`,
    );
  }
  return found;
}

export interface ResolvedCitation {
  href: string;
  /** The chapter's own title, out of the contract. */
  title: string;
  /** The chapter's own abstract, so this repository never describes someone else's writing. */
  summary: string;
  /**
   * The disclosure a page must print, or null when the reading is open. Derived
   * from the contract's `free` flag, because a free lesson sending a singer at an
   * unannounced paywall is a worse failure than no citation.
   */
  gate: string | null;
  why: string;
}

const PRO_GATE = "Suede Sing Pro";

/** The absolute URL for an editorial path, built from the contract's own origin. */
export function editorialUrl(path: string): string {
  return `${vocalContract.deepLinks.origin}${path}`;
}

export function resolveCitation(citation: Citation): ResolvedCitation {
  const { target, why } = citation;

  if (target.shelf === "referenceTable") {
    const table = vocalContract.editorial.referenceTables[target.id];
    if (!table) throw new Error(`Unknown Suede Sing reference table "${target.id}"`);
    return {
      href: editorialUrl(table.path),
      title: table.title,
      summary: table.note,
      gate: table.free ? null : PRO_GATE,
      why,
    };
  }

  const chapter = findChapter(target.shelf, target.slug);
  return {
    href: editorialUrl(chapter.path),
    title: chapter.title,
    summary: chapter.summary,
    gate: chapter.free ? null : PRO_GATE,
    why,
  };
}

export interface ResolvedSong {
  href: string;
  title: string;
  artist: string;
  key: string;
  /** The contract spells the notes, because the two repositories print accidentals differently. */
  rangeLabel: string;
  difficulty: Song["difficulty"];
}

/** How many songs a module hands over. Three is a choice, not a shortlist of one. */
const REPERTOIRE_LIMIT = 3;

/**
 * Every catalogue song that meets a requirement, narrowest first and then
 * alphabetical so the order is stable across builds.
 *
 * Exported separately from the three a lesson shows, because the bounds have to
 * be testable on their own. Sorting narrowest-first and then taking three means
 * the span ceiling almost never binds on the shortlist — drop the ceiling from
 * the filter and the shortlist comes out identical — so a test that only reads
 * the shortlist proves nothing about it.
 */
export function repertoireMatches(requirement: RepertoireRequirement): Song[] {
  const ceiling = requirement.hardest
    ? DIFFICULTY_ORDER.indexOf(requirement.hardest)
    : DIFFICULTY_ORDER.length - 1;

  return vocalContract.editorial.repertoire.songs
    .filter((song) => {
      if (requirement.spanAtLeast !== undefined && song.spanSemitones < requirement.spanAtLeast) {
        return false;
      }
      if (requirement.spanAtMost !== undefined && song.spanSemitones > requirement.spanAtMost) {
        return false;
      }
      return DIFFICULTY_ORDER.indexOf(song.difficulty) <= ceiling;
    })
    .sort((a, b) => a.spanSemitones - b.spanSemitones || a.slug.localeCompare(b.slug));
}

/** The songs a lesson actually shows: the matches, capped. */
export function resolveRepertoire(requirement: RepertoireRequirement): ResolvedSong[] {
  return repertoireMatches(requirement)
    .slice(0, REPERTOIRE_LIMIT)
    .map((song) => ({
      href: editorialUrl(song.path),
      title: song.title,
      artist: song.artist,
      key: song.key,
      rangeLabel: song.rangeLabel,
      difficulty: song.difficulty,
    }));
}

/** Where the whole catalogue lives, for a module whose requirement matches nothing. */
export function repertoireHubUrl(): string {
  return editorialUrl(vocalContract.editorial.repertoire.hubPath);
}

export interface LessonEditorial {
  reading: ResolvedCitation[];
  songs: ResolvedSong[];
  /** Why those songs, so the page can say what the singer is choosing between. */
  repertoireWhy: string | null;
}

/**
 * The reading and repertoire for a lesson, or undefined when its module cites
 * nothing. Keyed by module, like the proof table, because a module is the unit
 * that carries a promise.
 */
export function voiceEditorialForLesson(lessonId: string): LessonEditorial | undefined {
  const match = /^(v-l\d+-m\d+)-\d+$/.exec(lessonId);
  const moduleId = match?.[1];
  if (!moduleId) return undefined;
  const entry = VOICE_MODULE_EDITORIAL[moduleId];
  if (!entry) return undefined;

  const reading = entry.reading.map(resolveCitation);
  const songs = entry.repertoire ? resolveRepertoire(entry.repertoire) : [];
  if (reading.length === 0 && songs.length === 0) return undefined;

  return { reading, songs, repertoireWhy: entry.repertoire?.why ?? null };
}
