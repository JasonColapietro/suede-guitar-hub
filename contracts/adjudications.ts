/**
 * The adjudication register: fourteen constants that express one concept with
 * two or three different values across Suede's surfaces, each with a recorded
 * decision.
 *
 * Why this file exists. The voice-curriculum work found that most of its defects
 * had the same shape — two surfaces disagreeing about a number, with nothing in
 * either repository able to notice. A disagreement is not automatically a bug: a
 * tuner should be stricter than a lesson, and a sung note more forgiving than a
 * fretted one. What made them defects was that nobody had decided, so the
 * difference was indistinguishable from drift and each reader guessed again.
 *
 * So every entry here is a decision, not an observation: unify and name the
 * surface that has to move, or keep both and say why. `tests/adjudications.test.ts`
 * then binds each recorded value to its source, which is the part that makes this
 * a register rather than a comment — a constant that moves without its entry
 * moving fails the build.
 *
 * On restating numbers. `docs/practice-tools.md` sets the rule that contract
 * values must not be duplicated into another configuration, and this file
 * restates a dozen of them. The difference is that a configuration is read at
 * runtime, so a stale copy changes behaviour silently; this register is read only
 * by its own test, which asserts the restatement is still true. A copy that must
 * equal its source and is checked on every run is the mechanism, not a violation
 * of it. The test enforces the distinction directly: nothing outside `tests/` may
 * import this module.
 *
 * What "binding" means per value, and why it is recorded honestly:
 *   live     — a constant in this repository, imported by the test.
 *   contract — a value in a JSON file, read by the test at a path: a vendored
 *              contract, or this repository's own authored lesson data.
 *   observed — read from the other repository by a human. Nothing here can check
 *              it, and it may already be wrong. The test pins how many of these
 *              there are so the number can only fall deliberately.
 */
import { readFileSync } from "node:fs";

export type Surface = "guitarHubWeb" | "guitarHubNative" | "sing";

export type Binding = "live" | "contract" | "observed";

export interface SurfaceValue {
  surface: Surface;
  /** The recorded value. For a non-numeric concept, the shortest true phrase. */
  value: number | string | readonly number[];
  /** Where it lives, in enough detail to go and look. */
  source: string;
  binding: Binding;
  /** Dotted path into the JSON named by `source`, or one path per element when
   * the value is a range. Contract-bound values carry a path unless the claim
   * spans many entries or lives in prose, in which case the test asserts it by
   * name instead — and every such entry has a named test. */
  path?: string | readonly string[];
}

export type Decision =
  /** Keep both values. The difference is real and the reason is recorded here. */
  | "divergent"
  /** One value must change. `pendingOn` names the surface that has to move. */
  | "unify"
  /** One surface has a capability the other does not. Not a drifted number. */
  | "featureGap"
  /** The quantities are defined differently, so the values are not comparable
   * and must not be collapsed without first unifying the definition. */
  | "notComparable"
  /** Already adjudicated in a vendored contract's `knownDivergences`. Listed so
   * it is not mistaken for an omission; the test checks it is really there. */
  | "recordedUpstream";

export interface Adjudication {
  id: string;
  /** Product decisions delegated by Jason; absent for purely technical entries. */
  decidedBy?: string;
  decisionDate?: string;
  concept: string;
  decision: Decision;
  surfaces: readonly SurfaceValue[];
  reason: string;
  /** The surface that has to change for a `unify` decision. Its absence on a
   * `unify` entry is a decision without an owner, which the test rejects. */
  pendingOn?: Surface;
  /** Spec items this settles, with the answer, so W2 and W13 can be read off
   * the register instead of re-derived. */
  resolves?: readonly { item: string; answer: string }[];
}

const LEARNING = "contracts/learning.json";
const TOOLS = "contracts/practice-tools.json";
const VOCAL = "contracts/suede-vocal.json";

export const ADJUDICATIONS: readonly Adjudication[] = [
  {
    id: "accidentalGlyph",
    concept: "How a sharp is spelled in a note label",
    decision: "unify",
    pendingOn: "guitarHubWeb",
    surfaces: [
      { surface: "guitarHubWeb", value: "♯", source: "lib/audio/dsp.ts noteName", binding: "live" },
      { surface: "sing", value: "#", source: VOCAL, path: "pitch.accidentalGlyph", binding: "contract" },
    ],
    reason:
      "U+266F is the correct typography and ASCII # is what the other surface emits, so any " +
      "cross-repository comparison of note strings fails on the glyph before it reaches the pitch. " +
      "Unified by separating the two jobs rather than picking a winner: noteName keeps U+266F for " +
      "display, asciiNoteName emits the spelling the vocal contract declares, and comparison uses " +
      "that one. This is the only entry here whose losing surface is this repository, so it is the " +
      "only one resolved rather than recorded. This repository still has no flat spelling, which " +
      "voice work will need.",
  },
  {
    id: "beatsPerBar",
    concept: "Accent placement in the metronome",
    decision: "featureGap",
    surfaces: [
      { surface: "guitarHubNative", value: 4, source: TOOLS, path: "metronome.beatsPerBar", binding: "contract" },
      { surface: "sing", value: "selectable", source: "sing metronome room", binding: "observed" },
    ],
    reason:
      "Four is not a drifted value, it is the only value: this surface cannot express three or six. " +
      "A missing control is a feature gap to build, not a number to reconcile, and it is recorded " +
      "here because a reader comparing the two constants would otherwise read it as drift.",
  },
  {
    id: "clarityFloor",
    concept: "How much periodicity is enough to report a pitch",
    decision: "notComparable",
    surfaces: [
      { surface: "guitarHubWeb", value: 0.5, source: "lib/audio/dsp.ts MINIMUM_CLARITY", binding: "live" },
      { surface: "guitarHubNative", value: 0.85, source: TOOLS, path: "tuning.minimumClarity", binding: "contract" },
      { surface: "sing", value: "normalized autocorrelation peak", source: "sing pitch detector", binding: "observed" },
    ],
    reason:
      "These are three floors on two different quantities. One minus a cumulative-mean-normalized " +
      "difference is not a normalized autocorrelation, so 0.5 here is not a looser 0.85 and neither " +
      "is a looser anything of sing's. Collapsing them would require unifying the definition first, " +
      "and until someone does, a cross-surface assertion on 'clarity' is meaningless rather than " +
      "merely wrong. The 0.5 and 0.85 gates do sit on the same metric and differ by job: a tuner " +
      "that reports a wrong note is worse than one that reports nothing.",
  },
  {
    id: "classifiableVoiceTypes",
    decidedBy: "Jason Colapietro (delegated decision)",
    decisionDate: "2026-09-14",
    concept: "How many voice categories a classified result can name",
    decision: "recordedUpstream",
    surfaces: [
      { surface: "sing", value: "six reachable classifier labels: bass, baritone, tenor, contralto, mezzo, soprano", source: VOCAL, binding: "contract" },
      { surface: "sing", value: "eight published categories, adding Bass-baritone and Countertenor", source: VOCAL, binding: "contract" },
    ],
    reason:
      "Six of eight is recorded upstream in the vocal contract's knownDivergences and is the right " +
      "resolution as it stands. Both unreachable labels have a published reference band and a " +
      "published passaggio zone, so a singer who already knows their category is routed correctly " +
      "and nothing downstream breaks; what they cannot do is be told the category by a scan. This " +
      "repository is the consumer rather than a party to the disagreement — it holds no third value " +
      "and routes on whatever label arrives — which is why both values are recorded on one surface, " +
      "as starScales does. The delegated product decision is to retain six automatic labels: a " +
      "bass-baritone band of 42 to 66 overlaps bass at 40 to 64 and baritone at 45 to 69, so adding " +
      "it re-partitions occupied territory instead of filling a hole. Some existing singers could " +
      "be re-labelled on their next scan without demonstrated accuracy gains. Bass-baritone stays " +
      "a reference category until a validated classifier supports the distinction. Countertenor " +
      "likewise stays a reference category, not a classifier " +
      "output at all: the contract marks its zone as the one figure that varies most from singer to " +
      "singer, and its transition is a different event from the other seven. The recorded divergence " +
      "is intentional; consumer consistency is not permission to widen the classifier.",
    resolves: [
      {
        item: "W23",
        answer:
          "The taxonomy is settled by leaving it settled. The classifier stays at six, " +
          "knownDivergences.classifiableVoiceTypes is the resolution. The repository owner delegated " +
          "the decision to keep bass-baritone reference-only until validated. The test keeps that position honest: it " +
          "asserts both unreachable labels still have a reference band and a passaggio zone, so the " +
          "gap stays safe to route around, and it fails if the classifier or the published set moves " +
          "without this entry being rewritten.",
      },
    ],
  },
  {
    id: "clickTimbre",
    concept: "What the metronome sounds like",
    decision: "divergent",
    surfaces: [
      { surface: "guitarHubNative", value: 880, source: TOOLS, path: "metronome.tickFrequencyHz", binding: "contract" },
      { surface: "guitarHubNative", value: 1318, source: TOOLS, path: "metronome.accentFrequencyHz", binding: "contract" },
      { surface: "sing", value: "different tick and accent frequencies", source: "sing metronome room", binding: "observed" },
    ],
    reason:
      "Timbre is a product choice per application and there is nothing to adjudicate in it. The part " +
      "that should be shared is the scheduler, not the sound — and that sharing has happened in the " +
      "direction that mattered: sing fixed accumulating setTimeout drift in its own room first, and " +
      "this repository now anchors clicks to the audio clock the same way.",
  },
  {
    id: "defaultTempo",
    concept: "The tempo a practice room opens at",
    decision: "divergent",
    surfaces: [
      { surface: "guitarHubNative", value: 90, source: TOOLS, path: "metronome.defaultBPM", binding: "contract" },
      { surface: "sing", value: 96, source: "sing metronome room", binding: "observed" },
    ],
    reason:
      "Both numbers are close to arbitrary and neither is defended by anything. That is an argument " +
      "for unifying, except that this one is pinned by an iOS-generated contract, so unifying costs " +
      "a native change and a regenerated contract to make two opening values agree that no code and " +
      "no learner ever sees side by side. Recorded as divergent because the cost exceeds the benefit, " +
      "not because the difference is meaningful.",
  },
  {
    id: "detectorBands",
    concept: "The frequency range a detector searches",
    decision: "divergent",
    surfaces: [
      { surface: "guitarHubWeb", value: [60, 1400], source: "lib/audio/dsp.ts DEFAULT_PITCH_BAND", binding: "live" },
      { surface: "guitarHubNative", value: [55, 1000], source: TOOLS, path: ["tuning.minimumFrequencyHz", "tuning.maximumFrequencyHz"], binding: "contract" },
      { surface: "sing", value: [65, 1600], source: VOCAL, path: ["pitch.detectorMinHz", "pitch.detectorMaxHz"], binding: "contract" },
    ],
    reason:
      "Three bands for three jobs, all three checkable from here: lesson playing across the whole " +
      "neck, six open strings in standard tuning, and a sung range that reaches higher and does not " +
      "need the lowest string. Narrowing a band is how a detector stops chasing octave errors, so " +
      "unifying them would make every one of the three worse at its own job.",
  },
  {
    id: "frameStaleness",
    concept: "How old a reading may be and still be shown as current",
    decision: "unify",
    pendingOn: "guitarHubNative",
    surfaces: [
      { surface: "guitarHubNative", value: 0.45, source: TOOLS, path: "tuning.maximumReadingAgeSeconds", binding: "contract" },
      { surface: "sing", value: 0.2, source: "sing pitch studio", binding: "observed" },
    ],
    reason:
      "This one is a real disagreement about the same thing, and the looser value is the wrong one: " +
      "a needle that keeps displaying a reading taken 450 milliseconds ago tells a player their " +
      "current string is in tune when they have already stopped playing it. 0.2 seconds is the value " +
      "to land on. It is native-pinned, so this is not this repository's change to make — which is " +
      "exactly why it is recorded with an owner instead of left as an observation.",
    resolves: [
      {
        item: "W13",
        answer:
          "Latency compensation may tighten this gate but must not widen it, and the 0.45 figure is " +
          "not a budget to spend on analyser lag. The rhythm window and the staleness gate are " +
          "separate numbers; correcting bias in the first is not licence to relax the second.",
      },
    ],
  },
  {
    id: "gridSnapping",
    concept: "How a recommended tempo lands on the grid",
    decision: "unify",
    pendingOn: "sing",
    surfaces: [
      { surface: "guitarHubWeb", value: "floor on decrease, ceil on increase", source: "lib/audio/practice-tempo.ts", binding: "live" },
      { surface: "sing", value: "round to nearest", source: "sing practice tempo", binding: "observed" },
    ],
    reason:
      "Outward rounding is the correct rule and round-to-nearest is a bug wearing the look of a " +
      "preference: from a grid position, a five per cent step rounded to nearest can return the " +
      "tempo the learner is already at, so 'ready to increase' silently recommends no increase. " +
      "Rounding away from the current tempo always moves, which is the entire point of a " +
      "recommendation. sing is the surface to change.",
  },
  {
    id: "hissTargetVersusSustainLadder",
    concept: "A twelve-second hiss against a ten, twenty, thirty, forty-five second ladder",
    decision: "divergent",
    surfaces: [
      { surface: "guitarHubWeb", value: 12, source: "lib/learning/data/voice.json v-l1-m3 promise", binding: "contract" },
      { surface: "sing", value: [10, 20, 30], source: VOCAL, path: ["breath.sustain.starsSec.one", "breath.sustain.starsSec.two", "breath.sustain.starsSec.three"], binding: "contract" },
    ],
    reason:
      "Twelve is not a rung, and moving it to twenty to make it one would raise the bar on a free " +
      "level, which is a product decision and not a consistency fix. It stays, and the lesson prose " +
      "carries the reconciliation instead: the checkpoint says twelve seconds held even clears the " +
      "room's first mark at ten, so a singer reading one surface is not surprised by the other. The " +
      "test asserts the prose keeps naming that rung, because this entry is only safe while it does.",
  },
  {
    id: "metronomeRange",
    concept: "The tempo range the metronome accepts",
    decision: "divergent",
    surfaces: [
      { surface: "guitarHubNative", value: [40, 208], source: TOOLS, path: ["metronome.minimumBPM", "metronome.maximumBPM"], binding: "contract" },
      { surface: "sing", value: [30, 240], source: "sing metronome room", binding: "observed" },
    ],
    reason:
      "40 to 208 is the span of the mechanical markings this surface is modelled on and it is pinned " +
      "by an iOS-generated contract, so widening it moves the native contract. The wider vocal span " +
      "serves drills that are not metronome practice in the guitar sense — a breath cycle at one " +
      "beat per second, an agility run past 208. Two ranges for two instruments.",
  },
  {
    id: "pitchToleranceCents",
    concept: "How far off pitch still counts",
    decision: "recordedUpstream",
    surfaces: [
      { surface: "guitarHubWeb", value: 35, source: `${LEARNING} — every authored spec`, binding: "contract" },
      { surface: "guitarHubNative", value: 5, source: TOOLS, path: "tuning.toleranceCents", binding: "contract" },
      { surface: "sing", value: 50, source: VOCAL, path: "pitch.sungToleranceCents", binding: "contract" },
    ],
    reason:
      "Adjudicated in the vocal contract's knownDivergences and correct as it stands: a tuner is " +
      "stricter than a fretted lesson, and a sung note is more forgiving than both, because a singer " +
      "has no frets. Same key name, three jobs. Listed here because W2 has to pick one of the three " +
      "and the register is where it should read the answer.",
    resolves: [
      {
        item: "W2",
        answer:
          "Voice practice specs use 50, not the guitar track's 35. A sung note judged to 35 cents " +
          "would fail singers for an accuracy no voice in the catalogue is asked to hold, and the " +
          "number is already published as the sung tolerance. 50 is inside the 1-to-100 range " +
          "lib/learning/models.ts validates, so no schema change is needed to author it.",
      },
    ],
  },
  {
    id: "starScales",
    concept: "What a star means",
    decision: "recordedUpstream",
    surfaces: [
      { surface: "sing", value: [90, 75, 50], source: VOCAL, path: "knownDivergences.starScales.surfaces.practiceRooms", binding: "contract" },
      { surface: "sing", value: 5, source: VOCAL, path: "knownDivergences.starScales.surfaces.songbookLinearMax", binding: "contract" },
    ],
    reason:
      "Three stars at percentage floors in the practice rooms, five linear stars plus a letter in the " +
      "songbook. Two instruments rather than one drifted number, already recorded upstream, and " +
      "needing nothing from this repository — which does not grade in stars at all. Listed only so " +
      "that a reader auditing the fourteen does not read its absence as an oversight.",
  },
  {
    id: "tempoDecreaseGate",
    concept: "The score below which the recommendation drops the tempo",
    decision: "unify",
    pendingOn: "sing",
    surfaces: [
      { surface: "guitarHubWeb", value: 60, source: "lib/audio/practice-tempo.ts TEMPO_FLOOR_SCORE", binding: "live" },
      { surface: "sing", value: "the same 60, inclusive rather than exclusive", source: "sing practice tempo", binding: "observed" },
    ],
    reason:
      "The two agree everywhere except at a score of exactly 60, where one surface reduces the tempo " +
      "and the other does not. There is no pedagogy in a one-point boundary, so this is drift with " +
      "nothing to weigh: settle on 'below 60 reduces' and let 60 itself stand, matching the inclusive " +
      "reading used for the pass score everywhere else.",
  },
  {
    id: "tempoIncreaseGate",
    concept: "The evidence needed before the tempo goes up",
    decision: "unify",
    pendingOn: "sing",
    surfaces: [
      { surface: "guitarHubWeb", value: 90, source: "lib/audio/practice-tempo.ts TEMPO_ADVANCE_SCORE", binding: "live" },
      { surface: "guitarHubWeb", value: 2, source: "lib/audio/practice-tempo.ts TEMPO_EVIDENCE_MINIMUM", binding: "live" },
      { surface: "sing", value: "one attempt at or above 85", source: "sing practice tempo", binding: "observed" },
    ],
    reason:
      "This is pedagogy and it deserves a reason rather than a coin toss. Two consecutive attempts at " +
      "or above 90 is the rule to keep: one good run is as likely to be a lucky take as a learned " +
      "skill, and a recommendation that speeds a learner up on it produces the failure these rooms " +
      "exist to avoid — practising faster than you can play, then reducing again. The cost of the " +
      "stricter rule is one extra repetition at a tempo already passed, which is cheap. sing moves.",
  },
] as const;

/** Pinned in the test, and in the spec's own prose. A sixteenth entry is a
 * deliberate act that updates both. The fifteenth was classifiableVoiceTypes,
 * added by W23; `### W23` in docs/vocal-integration-spec.md carries the count
 * and the tally, because W23 may only edit its own section and W17's prose
 * describes the fourteen it found. */
export const ADJUDICATION_COUNT = 15;

/** Values nothing here can check, because they live in a repository this one
 * does not vendor. The pin makes the gap a number that falls when the vocal
 * contract grows, rather than a vague caveat. */
export const OBSERVED_VALUE_COUNT = 9;

/** Resolve a dotted path against a vendored contract. Used by the test; kept
 * here so the `path` field has exactly one interpretation. */
export function readContractValue(file: string, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
      JSON.parse(readFileSync(file, "utf8")),
    );
}
