/**
 * What actually backs each voice module's proof, and where in Suede Sing the
 * work happens.
 *
 * Two problems this solves, both found by reading the two repos side by side.
 *
 * **The voice track promised measurements that do not exist.** Every module
 * carries a `proofMetric` string — `cents_deviation`, `flag_clear`, `rate_hz`,
 * `composite`. Nothing reads it. It is validated as "a non-empty string" and
 * then ignored by every component, route and library function in this repo, so
 * a module could declare `rate_hz` for vibrato and nothing anywhere asked
 * whether a vibrato rate can be measured. It cannot: no Suede surface analyses
 * vibrato. The same is true of strain, which five modules gate a checkpoint on.
 *
 * Suede Sing now publishes `contracts/suede-vocal.json`, whose `measurement`
 * section says of each quantity whether it is measurable today. This table
 * names, per module, which measurement the module's proof rests on — and
 * `tests/suede-vocal-parity.test.ts` fails if that measurement is not one the
 * contract reports as real.
 *
 * So the honesty is enforced rather than intended. A module whose proof cannot
 * be measured must say `basis: "selfReported"` and name the missing
 * measurement. That is not a downgrade of the curriculum; it is the curriculum
 * saying out loud what the checkpoint is, which is what it already says in its
 * own `doesNotProve` fields for guitar.
 *
 * **The two apps had no link between them.** This repo teaches singing and
 * links outward only to Strumly. Sing implements the range scan, the warm-ups,
 * the breath drills, the pitch studio and the songbook, and links back to
 * nothing here. A singer reaching a voice lesson got a page whose only call to
 * action was "try the free guitar sampler". `companion` is the missing half:
 * the room in Sing where this module's work is actually done.
 *
 * Keep this keyed by module rather than by lesson. A module is the unit that
 * carries a promise and a proof metric, and it is the unit a singer is sent to
 * a room to satisfy.
 */
import voiceCurriculum from "./data/voice.json" with { type: "json" };
import vocalContract from "../../contracts/suede-vocal.json" with { type: "json" };

/**
 * A measurement key from `contracts/suede-vocal.json` → `measurement`, or the
 * honest admission that nothing measures this.
 */
export type ProofBasis =
  /** Backed by a measurement the contract reports as implemented. */
  | { kind: "measured"; measurement: string }
  /**
   * Nothing measures this. `missing` names the contract measurement that would
   * be needed, so the gap is addressable rather than merely absent, and
   * `provesInstead` states what the checkpoint really establishes.
   */
  | { kind: "selfReported"; missing: string; provesInstead: string };

/** A room in Sing, optionally deep-linked. Params are validated against the contract. */
export interface SingCompanion {
  /** A key of `deepLinks.rooms` in the contract. */
  room: string;
  /** A param that room parses, and the value to pass. Both or neither. */
  param?: string;
  value?: string;
}

export interface VoiceModuleProof {
  basis: ProofBasis;
  companion: SingCompanion;
}

const measured = (measurement: string): ProofBasis => ({ kind: "measured", measurement });
const selfReported = (missing: string, provesInstead: string): ProofBasis => ({
  kind: "selfReported",
  missing,
  provesInstead,
});

/**
 * Every module in `voice.json`. The parity test asserts this covers the
 * curriculum exactly, so a new module cannot ship without a decision about
 * what proves it.
 */
export const VOICE_MODULE_PROOF: Record<string, VoiceModuleProof> = {
  // ── Level 1 · Room Check ────────────────────────────────────────────────
  "v-l1-m1": {
    // "Ten seconds clean" is a duration of usable input, which is exactly
    // what a confidently-voiced time measurement reports.
    basis: measured("phonationSeconds"),
    companion: { room: "analyze" },
  },
  "v-l1-m2": {
    // Declared flag_clear — "no strain at either end". Strain is not
    // measurable. What a scan actually establishes is the two extremes.
    basis: measured("rangeExtremes"),
    companion: { room: "range" },
  },
  "v-l1-m3": {
    // A twelve-second hiss is unvoiced, so phonation time reads zero on it;
    // the RMS-gated sustain timer is the measurement that sees a hiss.
    basis: measured("sustainSeconds"),
    companion: { room: "breath", param: "drill", value: "sustain" },
  },

  // ── Level 2 · Steady Tone ───────────────────────────────────────────────
  "v-l2-m1": {
    basis: measured("sustainSeconds"),
    companion: { room: "warmups", param: "exercise", value: "straw-scale" },
  },
  "v-l2-m2": {
    basis: measured("centsFromTarget"),
    companion: { room: "studio" },
  },
  "v-l2-m3": {
    basis: measured("inTuneHoldTime"),
    companion: { room: "warmups", param: "exercise", value: "sustained-hold" },
  },
  "v-l2-m4": {
    basis: measured("scorePercent"),
    companion: { room: "songs", param: "song", value: "amazing-grace" },
  },

  // ── Level 3 · Two Registers ─────────────────────────────────────────────
  "v-l3-m1": {
    basis: selfReported(
      "registerMechanism",
      "That the singer can produce a pitch two ways on cue and hear the difference. No surface classifies which mechanism was used.",
    ),
    companion: { room: "analyze" },
  },
  "v-l3-m2": {
    // A siren with no crack is a continuous voiced run, which is the one
    // thing an unbroken-phrase reducer would report — and it does not exist
    // yet, so the pitch trace is the evidence and the singer judges the break.
    basis: selfReported(
      "unbrokenPhraseLength",
      "That the slide was heard as continuous. The voiced trace is shown; no number scores the absence of a crack.",
    ),
    companion: { room: "warmups", param: "exercise", value: "octave-siren" },
  },
  "v-l3-m3": {
    basis: selfReported(
      "vowelOrFormant",
      "That tone stayed consistent to the singer's own ear across five vowels. No formant tracking exists, so vowel consistency is not scored.",
    ),
    companion: { room: "warmups", param: "exercise", value: "hung-ee-mm" },
  },
  "v-l3-m4": {
    basis: measured("scorePercent"),
    companion: { room: "songs", param: "song", value: "deep-river" },
  },
  "v-l3-m5": {
    basis: selfReported(
      "strainOrPressedPhonation",
      "That the singer can tell breathy, nasal and tight apart in their own takes. Nothing measures any of the three.",
    ),
    companion: { room: "recorder" },
  },

  // ── Level 4 · Pitch, Time, Words ────────────────────────────────────────
  "v-l4-m1": {
    basis: measured("centsFromTarget"),
    companion: { room: "songs", param: "song", value: "amazing-grace-full" },
  },
  "v-l4-m2": {
    basis: selfReported(
      "onsetTimingError",
      "That the phrase came back on the beat by ear, against a click. There is no onset detector and no timing-error number.",
    ),
    companion: { room: "tools" },
  },
  "v-l4-m3": {
    basis: selfReported(
      "dictionClarity",
      "That the lyric was intelligible on playback. No consonant or intelligibility analysis exists.",
    ),
    companion: { room: "recorder" },
  },
  "v-l4-m4": {
    basis: selfReported(
      "onsetTimingError",
      "That three articulations were produced on cue and are audibly different. Articulation is not detected.",
    ),
    companion: { room: "recorder" },
  },
  "v-l4-m5": {
    basis: selfReported(
      "absoluteLoudness",
      "That four levels are audibly distinct on one note. Input level is uncalibrated, so discrete dynamic levels are not measurable.",
    ),
    companion: { room: "analyze" },
  },

  // ── Level 5 · Through the Break ─────────────────────────────────────────
  "v-l5-m1": {
    // The module used to claim these pitches were computed from the Stage 1
    // scan. They are not, and cannot be: see the contract's
    // taxonomy.passaggio.derivableFromRangeScan.
    basis: selfReported(
      "passaggioPitches",
      "That the singer located their own transition by ear and can name the published zone for their voice type. A range scan does not yield a passaggio.",
    ),
    companion: { room: "range" },
  },
  "v-l5-m2": {
    basis: selfReported(
      "vowelOrFormant",
      "That the word survived the crossing on three vowels, by ear. Vowel modification is not measured.",
    ),
    companion: { room: "warmups", param: "exercise", value: "ng-siren-fifth" },
  },
  "v-l5-m3": {
    // ringRatio is real, but it is self-relative: it compares a singer to
    // their own earlier takes and says nothing about strain.
    basis: measured("ringRatio"),
    companion: { room: "analyze" },
  },
  "v-l5-m4": {
    basis: selfReported(
      "strainOrPressedPhonation",
      "That six seconds were held and the singer reports no strain. Nothing detects strain, so 'safe belt' cannot be scored — and this sits at the top of the range, where the safety note matters most.",
    ),
    companion: { room: "studio" },
  },
  "v-l5-m5": {
    basis: selfReported(
      "unbrokenPhraseLength",
      "That four improvised bars stayed in key, by ear. Key adherence in free singing is not scored.",
    ),
    companion: { room: "earTraining" },
  },

  // ── Level 6 · Agility ───────────────────────────────────────────────────
  "v-l6-m1": {
    basis: measured("scorePercent"),
    companion: { room: "warmups", param: "exercise", value: "agility-run" },
  },
  "v-l6-m2": {
    basis: measured("scorePercent"),
    companion: { room: "warmups", param: "exercise", value: "hoo-four-note" },
  },
  "v-l6-m3": {
    basis: selfReported(
      "vibratoRateHz",
      "That the singer switched from straight tone to vibrato on cue. No surface analyses vibrato rate, so the five-to-seven hertz figure is a target to listen for, not a measured result.",
    ),
    companion: { room: "analyze" },
  },
  "v-l6-m4": {
    basis: selfReported(
      "unbrokenPhraseLength",
      "That four named ornaments were produced on cue. Ornament classification does not exist, though the pitch trace shows the gesture.",
    ),
    companion: { room: "studio" },
  },
  "v-l6-m5": {
    basis: selfReported(
      "unbrokenPhraseLength",
      "That eight improvised bars were sung without stopping. No function reduces the voiced trace to a longest unbroken run.",
    ),
    companion: { room: "earTraining" },
  },
  "v-l6-m6": {
    basis: measured("scorePercent"),
    companion: { room: "songs", param: "song", value: "deep-river" },
  },

  // ── Level 7 · Signature ─────────────────────────────────────────────────
  "v-l7-m1": {
    // Vocal health is the one module whose proof is genuinely knowledge, and
    // the one place cycle dose is the right evidence.
    basis: measured("cycleDose"),
    companion: { room: "warmups", param: "routine", value: "full" },
  },
  "v-l7-m2": {
    basis: selfReported(
      "vowelOrFormant",
      "That one song was performed two recognisably different ways. Style is a human judgment and is not scored.",
    ),
    companion: { room: "atlas" },
  },
  "v-l7-m3": {
    basis: selfReported(
      "strainOrPressedPhonation",
      "That three production weights were produced on cue. Neither the weights nor the absence of strain is measured.",
    ),
    companion: { room: "analyze" },
  },
  "v-l7-m4": {
    basis: selfReported(
      "strainOrPressedPhonation",
      "That two effects were attempted and stopped. Effects carry real injury risk and nothing here can verify safety, which is why this stays self-reported and the safety copy stays on the page.",
    ),
    companion: { room: "analyze" },
  },
  "v-l7-m5": {
    basis: measured("rangeExtremes"),
    companion: { room: "range" },
  },
  "v-l7-m6": {
    basis: selfReported(
      "simultaneousVoices",
      "That a two-octave song was performed. The harmony half cannot be measured: the pitch detector returns one fundamental per frame, so a held harmony against a lead is not two measurable parts.",
    ),
    companion: { room: "recorder" },
  },
};

/** Every module id in the voice curriculum, in curriculum order. */
export function voiceModuleIds(): string[] {
  return voiceCurriculum.levels.flatMap((level) => level.modules.map((m) => m.id));
}

export function voiceModuleProof(moduleId: string): VoiceModuleProof | undefined {
  return VOICE_MODULE_PROOF[moduleId];
}

/** The module a voice lesson belongs to, derived from the id. */
export function moduleIdForLesson(lessonId: string): string | undefined {
  const match = /^(v-l\d+-m\d+)-\d+$/.exec(lessonId);
  return match?.[1];
}

/**
 * The Sing URL for a module's companion room.
 *
 * Built from the vendored contract's origin and room paths rather than written
 * out, so a room that moves or a param that is withdrawn fails a test here
 * instead of producing a dead link on 102 lesson pages.
 */
export function singCompanionUrl(
  companion: SingCompanion,
  contract: {
    deepLinks: { origin: string; rooms: Record<string, { path: string; params: string[] }> };
  },
): string {
  const room = contract.deepLinks.rooms[companion.room];
  if (!room) throw new Error(`Unknown Sing room: ${companion.room}`);
  const base = `${contract.deepLinks.origin}${room.path}`;
  if (!companion.param || !companion.value) return base;
  if (!room.params.includes(companion.param)) {
    throw new Error(`Sing room ${companion.room} does not parse ?${companion.param}=`);
  }
  return `${base}?${companion.param}=${encodeURIComponent(companion.value)}`;
}

/**
 * What to call each Sing room on a lesson page. The contract carries paths and
 * parsed params, not prose, and a singer needs the room's name rather than its
 * route.
 */
const ROOM_LABELS: Record<string, string> = {
  range: "the range test",
  warmups: "the warm-up room",
  breath: "the breath room",
  earTraining: "ear training",
  studio: "the pitch studio",
  songs: "the songbook",
  analyze: "take analysis",
  recorder: "the recorder",
  progress: "your progress",
  tools: "the practice tools",
  atlas: "the voice atlas",
  glossary: "the glossary",
  singers: "the singer directory",
};

export interface LessonCompanion {
  href: string;
  /** A full sentence, because this is the only call to action on the page. */
  label: string;
  /** Whether a measurement backs this module's proof, for the page's wording. */
  measured: boolean;
}

/**
 * Where a voice lesson's work is actually done, as a link a page can render.
 *
 * Returns undefined for guitar lessons and for any voice module without a
 * companion, so a caller can fall back to whatever it showed before.
 */
export function singCompanionForLesson(lessonId: string): LessonCompanion | undefined {
  const moduleId = moduleIdForLesson(lessonId);
  if (!moduleId) return undefined;
  const proof = VOICE_MODULE_PROOF[moduleId];
  if (!proof) return undefined;

  const room = ROOM_LABELS[proof.companion.room] ?? "Suede Sing";
  return {
    href: singCompanionUrl(proof.companion, vocalContract),
    label: `Practise this in ${room} on Suede Sing`,
    measured: proof.basis.kind === "measured",
  };
}
