/**
 * The vocabulary of `proofMetric`, and what kind of thing each value is.
 *
 * `proofMetric` was typed `string?` and validated as "a non-empty string", which
 * is how the voice track came to declare `rate_hz` for a vibrato rate nothing
 * measures and `flag_clear` for a strain check no Suede surface can perform. The
 * contract work closed those two by name; this closes the hole they came through,
 * by making the field a closed union that `validateCurriculum` enforces. A new
 * value is now a deliberate edit to this file rather than a typo that validates.
 *
 * Each value also declares its kind, because the interesting question about a
 * proof metric is not its spelling but whether the app or the learner is the one
 * judging. That distinction is what `lib/learning/voice-proof.ts` records per
 * voice module, and `tests/learning-proof-metrics.test.ts` asserts the two agree
 * — so a module cannot claim a measured basis while carrying a self-reported
 * metric, in either track.
 *
 * Scope note. This types the vocabulary in use; it does not redesign it. One
 * value remains worth a reader's attention: `three_pass_pitch_slots_at_90_bpm`
 * carries a tempo inside a metric name. The final set uses `self_reported`,
 * matching its authored listening criteria rather than an unspecified score.
 */

/** Who judges, and on what. */
export type ProofMetricKind =
  /** The app reads a number or a score. */
  | "measured"
  /** The learner judges and reports. Honest, and not a measurement. */
  | "selfReported"
  /** One metric name covering both a reading and a learner's own check. */
  | "mixed";

/**
 * Every value that appears on a module anywhere in the tracked learning data,
 * including the three that exist only as native authoring recommendations in
 * `lib/learning/data/beginner-guitar-instruction.json`. Those three are in the
 * union because a shared vocabulary that excludes half the places the field
 * appears is not a shared vocabulary — not because the catalog has adopted them.
 * The test records that it has not.
 */
export const PROOF_METRIC_KIND = {
  /** Percentage of targets hit within tolerance. Read by the scorer. */
  accuracy_pct: "measured",
  /** A scored attack-timing run plus a study the learner marks done. */
  attack_timing_score_and_manual_study: "mixed",
  /** Signed distance from the target pitch. Read by the detector. */
  cents_deviation: "measured",
  /** Unbroken run length. Read by the scorer. */
  continuity: "measured",
  /** Events landing inside a timing window. Read by the scorer. */
  count_in_window: "measured",
  /** Phonation dose over a session. Read by the sing breath room. */
  cycle_dose: "measured",
  /** Elapsed seconds of an exercise. Read by the timer. */
  duration_sec: "measured",
  /** A chord change count the learner counts themselves. */
  manual_change_count: "selfReported",
  /** The learner's own reflection on a chord's sounding strings. */
  manual_chord_reflection: "selfReported",
  /** A detected open-string pitch plus the learner's own check. */
  open_string_pitch_and_self_check: "mixed",
  /** Confidently voiced seconds. Read by the sing detector. */
  phonation_sec: "measured",
  /** Semitone span between scanned range extremes. Read by the range scan. */
  range_midi_span: "measured",
  /** Score on the first attempt at an in-app reading quiz. */
  reading_quiz_first_attempt: "measured",
  /** Percentage recalled in an in-app quiz. */
  recall_pct: "measured",
  /** Change in resonance share between two takes. Read by the sing detector. */
  ring_ratio_delta: "measured",
  /** The learner reports it. The only value that says so in its own name. */
  self_reported: "selfReported",
  /** Six strings brought inside the tuner's tolerance. Read by the tuner. */
  six_string_tuning_check: "measured",
  /** Longest continuous above-threshold tone. Read by the sing breath room. */
  sustain_sec: "measured",
  /** Tempo reached. Read by the metronome and the scorer. */
  tempo_bpm: "measured",
  /** Three consecutive passing attempts. The tempo belongs in the practice
   * specification, not in this name. See the scope note above. */
  three_pass_pitch_slots_at_90_bpm: "measured",
} as const satisfies Record<string, ProofMetricKind>;

export type ProofMetric = keyof typeof PROOF_METRIC_KIND;

export const PROOF_METRICS = Object.keys(PROOF_METRIC_KIND) as ProofMetric[];

export function isProofMetric(value: unknown): value is ProofMetric {
  return typeof value === "string" && value in PROOF_METRIC_KIND;
}

/** The kind of a value already known to be a metric. */
export function proofMetricKind(metric: ProofMetric): ProofMetricKind {
  return PROOF_METRIC_KIND[metric];
}

/** Whether a metric asserts the app measured something. A `mixed` metric does:
 * half of it is a reading, and a module carrying one is promising that half. */
export function claimsMeasurement(metric: ProofMetric): boolean {
  return proofMetricKind(metric) === "measured" || proofMetricKind(metric) === "mixed";
}
