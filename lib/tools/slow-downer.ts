/**
 * Pure logic for the song slow-downer at /tools/slow-downer.
 *
 * The component plays the player's own file through an HTMLAudioElement; this
 * module holds everything that can be decided without a browser: the speed
 * range, the pitch change tape mode causes, how an A–B loop is tidied up, how
 * the speed-up loop steps, how times are written, and how a decoded track is
 * reduced to a waveform overview.
 */

/** Speed is a whole percentage of the original tempo. */
export const SPEED_MIN = 25;
export const SPEED_MAX = 125;
export const SPEED_DEFAULT = 100;
export const SPEED_PRESETS = [50, 60, 70, 75, 80, 90, 100] as const;
export const SPEED_NUDGE = 5;

/** The shortest loop the tool allows, in seconds. Shorter loops stutter. */
export const LOOP_MIN_SECONDS = 0.2;
/** Fine adjustment for A and B, in seconds. */
export const LOOP_NUDGE_SECONDS = 0.1;
/** Arrow-key seek and the skip-back button, in seconds. */
export const SEEK_STEP_SECONDS = 2;
export const SKIP_BACK_SECONDS = 5;

export const SPEED_UP_STEP_DEFAULT = 5;
export const SPEED_UP_STEP_MIN = 1;
export const SPEED_UP_STEP_MAX = 20;
export const SPEED_UP_CEILING_DEFAULT = 100;

/** A whole-percent speed inside 25–125. Anything that is not a number falls back to 100. */
export function clampSpeed(percent: number): number {
  if (!Number.isFinite(percent)) return SPEED_DEFAULT;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(percent)));
}

/** The playbackRate for a speed percentage. */
export function speedToRate(percent: number): number {
  return clampSpeed(percent) / 100;
}

/**
 * The pitch change, in semitones, when the pitch is allowed to follow the
 * speed (tape mode): 12·log2(rate). Half speed is −12, one octave lower.
 */
export function tapeSemitones(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const semitones = 12 * Math.log2(rate);
  return Math.abs(semitones) < 1e-9 ? 0 : semitones;
}

/** "−12.0 semitones (one octave lower)", "+3.9 semitones", "No pitch change". */
export function describePitchShift(rate: number): string {
  const semitones = tapeSemitones(rate);
  if (Math.abs(semitones) < 0.05) return "No pitch change";
  const sign = semitones < 0 ? "−" : "+";
  const size = Math.abs(semitones).toFixed(1);
  const octave = Math.abs(Math.abs(semitones) - 12) < 0.05 ? (semitones < 0 ? " (one octave lower)" : " (one octave higher)") : "";
  return `${sign}${size} semitones${octave}`;
}

export type LoopBounds = { start: number; end: number };

/**
 * Tidy two loop points into a playable loop.
 *
 * - The points are put in order, so setting B before A still works.
 * - Both are clamped to the track, 0 to `duration`.
 * - A loop shorter than `minimum` is widened to `minimum`: the end moves
 *   later, and if that would pass the end of the track the start moves
 *   earlier instead.
 * - Returns null when there is no usable loop: a missing or non-finite point,
 *   or a track shorter than the minimum length.
 */
export function normalizeLoop(a: number | null, b: number | null, duration: number, minimum = LOOP_MIN_SECONDS): LoopBounds | null {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(duration)) return null;
  if (duration < minimum) return null;
  const clamp = (value: number) => Math.min(duration, Math.max(0, value));
  let start = clamp(Math.min(a, b));
  let end = clamp(Math.max(a, b));
  if (end - start < minimum) {
    end = start + minimum;
    if (end > duration) { end = duration; start = duration - minimum; }
  }
  return { start, end };
}

/**
 * Has playback just run past the loop end?
 *
 * `previous` is the time at the last check and `now` the time at this one. The
 * component resets `previous` whenever the player seeks, so a click past B
 * does not count as crossing it; only playback running into B does.
 */
export function crossedLoopEnd(previous: number, now: number, loop: LoopBounds | null): boolean {
  if (!loop || !Number.isFinite(previous) || !Number.isFinite(now)) return false;
  return previous < loop.end && now >= loop.end;
}

/**
 * The speed-up loop: after a completed pass, the next speed.
 *
 * Adds `step` percentage points, never past `ceiling`, and never lowers a
 * speed that is already at or above the ceiling. The result stays in 25–125.
 */
export function nextSpeedUpRate(current: number, step: number, ceiling: number): number {
  const speed = clampSpeed(current);
  const limit = clampSpeed(ceiling);
  const size = Number.isFinite(step) ? Math.min(SPEED_UP_STEP_MAX, Math.max(SPEED_UP_STEP_MIN, Math.round(step))) : SPEED_UP_STEP_DEFAULT;
  if (speed >= limit) return speed;
  return Math.min(limit, speed + size);
}

/** mm:ss.d, truncated to the tenth so the display never runs ahead of the audio. */
export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const tenths = Math.floor(safe * 10 + 1e-6);
  const minutes = Math.floor(tenths / 600);
  const rest = tenths - minutes * 600;
  const wholeSeconds = Math.floor(rest / 10);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${rest % 10}`;
}

/** The track time under a point on the waveform. */
export function timeAtPosition(x: number, width: number, duration: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0 || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(duration, Math.max(0, (x / width) * duration));
}

/**
 * Reduce samples to `buckets` min/max pairs for a waveform overview.
 *
 * Returns a Float32Array of length 2·buckets laid out as
 * [min0, max0, min1, max1, …]. Each bucket covers an equal share of the
 * samples; a bucket with no samples (more buckets than samples) reads 0, 0.
 */
export function extractPeaks(samples: Float32Array, buckets: number): Float32Array {
  const count = Number.isFinite(buckets) ? Math.max(0, Math.floor(buckets)) : 0;
  const peaks = new Float32Array(count * 2);
  const length = samples.length;
  if (count === 0 || length === 0) return peaks;
  for (let bucket = 0; bucket < count; bucket++) {
    const from = Math.floor((bucket * length) / count);
    const to = Math.floor(((bucket + 1) * length) / count);
    if (to <= from) continue;
    let min = Infinity, max = -Infinity;
    for (let index = from; index < to; index++) {
      const value = samples[index];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    peaks[bucket * 2] = min;
    peaks[bucket * 2 + 1] = max;
  }
  return peaks;
}

/** Combine the peaks of several channels: the lowest min and the highest max per bucket. */
export function mergePeaks(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  const merged = new Float32Array(channels[0]);
  for (const channel of channels.slice(1)) {
    for (let index = 0; index < merged.length && index < channel.length; index += 2) {
      merged[index] = Math.min(merged[index], channel[index]);
      merged[index + 1] = Math.max(merged[index + 1], channel[index + 1]);
    }
  }
  return merged;
}

export type SlowDownerSettings = { speed: number; tape: boolean; speedUpStep: number; speedUpCeiling: number };
export const DEFAULT_SLOW_DOWNER_SETTINGS: SlowDownerSettings = {
  speed: SPEED_DEFAULT, tape: false, speedUpStep: SPEED_UP_STEP_DEFAULT, speedUpCeiling: SPEED_UP_CEILING_DEFAULT,
};

/** Read saved settings, falling back field by field on anything malformed. */
export function parseSlowDownerSettings(raw: string | null): SlowDownerSettings {
  if (!raw) return { ...DEFAULT_SLOW_DOWNER_SETTINGS };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { ...DEFAULT_SLOW_DOWNER_SETTINGS }; }
  if (!value || typeof value !== "object") return { ...DEFAULT_SLOW_DOWNER_SETTINGS };
  const record = value as Record<string, unknown>;
  const number = (key: string) => typeof record[key] === "number" && Number.isFinite(record[key]) ? record[key] as number : null;
  const speed = number("speed"), step = number("speedUpStep"), ceiling = number("speedUpCeiling");
  return {
    speed: speed === null ? SPEED_DEFAULT : clampSpeed(speed),
    tape: record.tape === true,
    speedUpStep: step === null ? SPEED_UP_STEP_DEFAULT : Math.min(SPEED_UP_STEP_MAX, Math.max(SPEED_UP_STEP_MIN, Math.round(step))),
    speedUpCeiling: ceiling === null ? SPEED_UP_CEILING_DEFAULT : clampSpeed(ceiling),
  };
}
