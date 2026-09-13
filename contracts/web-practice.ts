/**
 * The web practice parameters, generated from the live constants.
 *
 * Every other contract in this directory is *followed*: `learning.json` and
 * `practice-tools.json` are vendored from the iOS app and `suede-vocal.json`
 * from the sing repository, and the web app's job is to match them byte for
 * byte. This one is the opposite — this repository is the reference surface,
 * and the JSON beside it is a generated record of what the web detector and the
 * adaptive-tempo grid actually do.
 *
 * That is worth having because these numbers were inline literals. The tempo
 * grid happens to be the same 25-to-125-per-cent-in-fives that the sing
 * repository uses for vocal practice, and nothing would have noticed if one
 * side drifted; the detector band decides which notes a lesson may legitimately
 * ask a learner to play, and nothing bound it. Serializing them turns a silent
 * change into a failing test, which is the only thing that makes "the two apps
 * agree" a fact rather than a recollection.
 *
 * Regenerate with `CONTRACT_WRITE=1 npm test`, and read the diff: a changed
 * value here is a changed promise to somebody practising.
 */
import {
  BAND_HIGH_FACTOR,
  BAND_LOW_FACTOR,
  DEFAULT_PITCH_BAND,
  MINIMUM_CLARITY,
  OCTAVE_CANDIDATE_FACTOR,
  SILENCE_RMS,
  YIN_THRESHOLD,
} from "../lib/audio/dsp.ts";
import { MAXIMUM_SCORE_LAG_SEC, ONSET_REPORT_TOLERANCE_SEC } from "../lib/audio/latency.ts";
import { RHYTHM_WINDOW_BEATS } from "../lib/audio/practice.ts";
import {
  TEMPO_ADVANCE_SCORE,
  TEMPO_BPM_MATCH_EPSILON,
  TEMPO_BPM_STEP,
  TEMPO_DECREASE_FACTOR,
  TEMPO_EVIDENCE_MINIMUM,
  TEMPO_EVIDENCE_WINDOW,
  TEMPO_FLOOR_SCORE,
  TEMPO_INCREASE_FACTOR,
  TEMPO_INCREMENT_RATIO,
  TEMPO_MAXIMUM_RATIO,
  TEMPO_MINIMUM_RATIO,
} from "../lib/audio/practice-tempo.ts";

export const CONTRACT_NAME = "guitarhub-web-practice";
export const CONTRACT_VERSION = 1;

/** Asserted against `contracts/web-practice.json`, so adding a key is a
 * deliberate act: the list has to be extended in the same commit. */
export const CONTRACT_KEYS = [
  "adaptiveTempo",
  "contract",
  "detector",
  "rhythmScoring",
  "version",
] as const;

/** The ratios expressed as the percentages a learner sees, so the agreement
 * with the sing repository's vocal grid is legible and not arithmetic. */
function tempoGridPercent() {
  const step = Math.round(TEMPO_INCREMENT_RATIO * 100);
  const first = Math.round(TEMPO_MINIMUM_RATIO * 100);
  const last = Math.round(TEMPO_MAXIMUM_RATIO * 100);
  const grid: number[] = [];
  for (let percent = first; percent <= last; percent += step) grid.push(percent);
  return grid;
}

export function buildContract() {
  return {
    contract: CONTRACT_NAME,
    version: CONTRACT_VERSION,
    detector: {
      algorithm: "yin",
      polyphonic: false,
      minHz: DEFAULT_PITCH_BAND.minimumFrequency,
      maxHz: DEFAULT_PITCH_BAND.maximumFrequency,
      yinThreshold: YIN_THRESHOLD,
      silenceRms: SILENCE_RMS,
      minimumClarity: MINIMUM_CLARITY,
      bandLowFactor: BAND_LOW_FACTOR,
      bandHighFactor: BAND_HIGH_FACTOR,
      octaveCandidateFactor: OCTAVE_CANDIDATE_FACTOR,
      /** The lowest and highest MIDI notes a lesson may ask for and expect to be
       * heard, derived rather than restated so they cannot disagree.
       *
       * These come from the band itself and not from the tolerance factors: the
       * lag search is bounded by `minHz` and `maxHz`, so a note under `minHz`
       * has no candidate period to find at all. The tolerance only forgives a
       * refined estimate that lands slightly outside — it does not widen what
       * can be detected, and a test that assumed it did caught this. */
      lowestAudibleMidi: Math.ceil(69 + 12 * Math.log2(DEFAULT_PITCH_BAND.minimumFrequency / 440)),
      highestAudibleMidi: Math.floor(69 + 12 * Math.log2(DEFAULT_PITCH_BAND.maximumFrequency / 440)),
    },
    rhythmScoring: {
      /** Half a beat either side of the target, and the credit falls off linearly
       * across it. This is the number that makes latency worth correcting: an
       * uncompensated timeline shifts every attack toward the edge of this
       * window, so the bias spends a learner's score rather than averaging out. */
      windowBeats: RHYTHM_WINDOW_BEATS,
      /** The ceiling on how far a reported platform delay may move the scored
       * timeline. Published because it bounds how much of a learner's result is
       * the correction rather than the performance, and because it is the number
       * somebody will otherwise confuse with the frame-staleness gate — which is
       * a different promise about a different thing and is native-owned. */
      maximumScoreLagSeconds: MAXIMUM_SCORE_LAG_SEC,
      /** The bound on the onset detector's own timestamp error. It is early
       * rather than late and is left uncorrected; see lib/audio/latency.ts. */
      onsetReportToleranceSeconds: ONSET_REPORT_TOLERANCE_SEC,
      /** Compensation is applied to what the platform reports about itself. The
       * visual cue path — a cue drawn on a later animation frame, composited,
       * and then seen — is not compensated, because nothing in this repository
       * measures it and a guessed constant there would move every score. */
      compensatesReportedAudioPath: true,
      compensatesVisualCuePath: false,
    },
    adaptiveTempo: {
      minimumRatio: TEMPO_MINIMUM_RATIO,
      maximumRatio: TEMPO_MAXIMUM_RATIO,
      incrementRatio: TEMPO_INCREMENT_RATIO,
      decreaseFactor: TEMPO_DECREASE_FACTOR,
      increaseFactor: TEMPO_INCREASE_FACTOR,
      bpmStep: TEMPO_BPM_STEP,
      bpmMatchEpsilon: TEMPO_BPM_MATCH_EPSILON,
      floorScore: TEMPO_FLOOR_SCORE,
      advanceScore: TEMPO_ADVANCE_SCORE,
      evidenceWindow: TEMPO_EVIDENCE_WINDOW,
      evidenceMinimum: TEMPO_EVIDENCE_MINIMUM,
      gridPercent: tempoGridPercent(),
    },
  };
}

/** The serialization the test compares byte for byte. Two spaces and a trailing
 * newline, because a generated file that fights the formatter gets regenerated
 * wrong once and then nobody trusts the check. */
export function serializeContract() {
  return `${JSON.stringify(buildContract(), null, 2)}\n`;
}
