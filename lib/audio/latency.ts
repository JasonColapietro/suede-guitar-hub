/**
 * What the platform admits about its own delays, and what the rhythm scorer
 * should therefore do about them.
 *
 * This repository had no latency compensation at all beyond asking for
 * `latencyHint: "interactive"`, while rhythm mode scores attack timing inside
 * half a beat of the target. Nothing in that chain is instantaneous: the guide a
 * learner follows is heard after it is scheduled, and the attack they play is
 * timestamped when the audio graph renders the block it arrived in rather than
 * when it reached the microphone. Both delays push a captured attack later than
 * the moment the learner actually meant, so a player who is perfectly in time is
 * scored as if they were behind. The direction is the point: the error is a bias
 * and not noise, so it does not average out over an exercise.
 *
 * The shape here is adopted from the sing repository's `lib/audio/latency.ts`
 * rather than invented again — `outputLagSec` is that function, and the rule
 * that a guide lag and a capture lag add rather than cancel is its
 * `scoreLagSec`. What is different is the detector: sing corrects for an
 * analyser window and a median filter over pitch frames, and guitar practice
 * scores onsets out of `OnsetDetector`, whose own timestamp error is small
 * enough to leave alone and is bounded by `ONSET_REPORT_TOLERANCE_SEC` below.
 *
 * None of this is the frame-staleness gate. `contracts/adjudications.ts` records
 * under `frameStaleness` that the 0.45-second maximum reading age may be
 * tightened and must never be widened, and that it is not a budget to spend on
 * analyser lag. That gate decides whether a reading is too old to be shown as
 * current; these numbers decide where on the beat grid a reading belongs. They
 * are separate, and `MAXIMUM_SCORE_LAG_SEC` is deliberately well under the gate
 * so that compensating one cannot be read as relaxing the other.
 */

/**
 * Seconds between scheduling a tone on the audio clock and hearing it.
 *
 * `outputLatency` is the full path to the speaker and already includes the graph
 * buffer that `baseLatency` reports, so the two are never summed. Bluetooth
 * routinely reports 150 to 300 milliseconds here, which is why a metronome a
 * learner plays along with cannot be assumed to sound at the instant it was
 * scheduled for.
 */
export function outputLagSec(context: AudioContext): number {
  const reported = (context as AudioContext & { outputLatency?: number }).outputLatency;
  if (typeof reported === "number" && Number.isFinite(reported) && reported > 0) return reported;
  return Number.isFinite(context.baseLatency) && context.baseLatency > 0 ? context.baseLatency : 0;
}

/**
 * Seconds between a string sounding and the capture block carrying it being
 * timestamped.
 *
 * The worklet stamps a block with the audio clock at the moment the graph
 * rendered it, which is after the microphone, its driver and the input buffer
 * have all had their turn. Chromium reports that path's length as `latency` on
 * the audio track's settings; where it does not, the graph's own buffering is
 * the only honest lower bound available, and a lower bound that is the right
 * sign beats a zero that is the wrong one.
 */
export function captureLagSec(context: AudioContext, track?: MediaStreamTrack | null): number {
  const reported = (track?.getSettings?.() as { latency?: number } | undefined)?.latency;
  if (typeof reported === "number" && Number.isFinite(reported) && reported > 0) return reported;
  return Number.isFinite(context.baseLatency) && context.baseLatency > 0 ? context.baseLatency : 0;
}

/**
 * The most the scored timeline may be shifted, whatever the platform claims.
 *
 * A reported path longer than a quarter of a second is more likely a broken
 * report than a real one, and moving every observation by more than that would
 * assert a precision about somebody's hardware that nothing here measured. At
 * 120 beats per minute a quarter second is already the full half-beat scoring
 * window, so this is the point past which compensation would stop correcting a
 * bias and start inventing a performance.
 *
 * It is not the frame-staleness gate and must not be confused with it; see the
 * note at the top of this file.
 */
export const MAXIMUM_SCORE_LAG_SEC = 0.25;

/**
 * The bound on `OnsetDetector`'s own timestamp error, in seconds.
 *
 * The detector names the centre of the 512-sample frame whose energy rose,
 * advancing in 128-sample hops, so its timestamp lands between one and two hops
 * *before* the attack rather than after it: measured against synthesized plucks
 * it is 2.7 milliseconds early at 48 kHz and at most 5.6 milliseconds early at
 * 44.1 kHz. That is the opposite sign from the platform delays and an order of
 * magnitude smaller, so it is left uncorrected and pinned by a test instead —
 * correcting it would be chasing a fifth of a hop while the real bias sits in
 * the hardware path.
 */
export const ONSET_REPORT_TOLERANCE_SEC = 0.006;

/**
 * How far back to move a captured attack before comparing it with the grid.
 *
 * The two lags add. A guide scheduled at audio time `t` is heard at
 * `t + guideLag`; a learner attacking with what they hear makes sound at that
 * moment, and the block carrying it is stamped `captureLag` later still. So an
 * observation stamped at `now` describes a performance at `now - scoreLag`.
 * Neither term can be negative and their sum is clamped, because a platform that
 * reports nonsense should cost a learner nothing.
 */
export function practiceScoreLagSec(lags: { guideLagSeconds?: number; captureLagSeconds?: number }): number {
  const guide = Number.isFinite(lags.guideLagSeconds) ? Math.max(0, lags.guideLagSeconds!) : 0;
  const capture = Number.isFinite(lags.captureLagSeconds) ? Math.max(0, lags.captureLagSeconds!) : 0;
  return Math.min(MAXIMUM_SCORE_LAG_SEC, guide + capture);
}
