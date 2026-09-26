/**
 * Pure helpers for the song slow-downer. The audio element does the
 * time-stretching (with pitch preserved); these decide where the loop is and
 * how fast the next pass should be.
 */

export type Loop = { a: number; b: number };

export const MIN_LOOP = .25;

/** A loop always runs forward, stays inside the song, and is long enough to hear. */
export function normalizeLoop(a: number, b: number, duration: number): Loop | null {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  let start = Math.max(0, Math.min(a, b)), end = Math.min(duration, Math.max(a, b));
  if (end - start < MIN_LOOP) {
    end = Math.min(duration, start + MIN_LOOP);
    start = Math.max(0, end - MIN_LOOP);
  }
  return end > start ? { a: start, b: end } : null;
}

export type Trainer = { from: number; to: number; step: number; every: number };
export const DEFAULT_TRAINER: Trainer = { from: 60, to: 100, step: 5, every: 2 };

/**
 * The speed, in percent, for the pass after `completedLoops` full loops.
 * Climbs by `step` every `every` clean loops and never passes `to`.
 */
export function trainerSpeed(trainer: Trainer, completedLoops: number): number {
  const every = Math.max(1, Math.round(trainer.every));
  const step = Math.max(1, Math.abs(trainer.step));
  const rungs = Math.floor(Math.max(0, completedLoops) / every);
  const rising = trainer.to >= trainer.from;
  const raw = trainer.from + (rising ? 1 : -1) * rungs * step;
  return rising ? Math.min(trainer.to, raw) : Math.max(trainer.to, raw);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const minutes = Math.floor(seconds / 60), rest = seconds - minutes * 60;
  return `${minutes}:${rest < 10 ? "0" : ""}${rest.toFixed(1)}`;
}

/** Downsample a channel to min/max pairs for drawing. */
export function peaks(samples: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets * 2);
  const size = Math.max(1, Math.floor(samples.length / buckets));
  for (let bucket = 0; bucket < buckets; bucket++) {
    let min = 0, max = 0;
    const start = bucket * size, end = Math.min(samples.length, start + size);
    for (let i = start; i < end; i++) { const v = samples[i]; if (v < min) min = v; if (v > max) max = v; }
    out[bucket * 2] = min; out[bucket * 2 + 1] = max;
  }
  return out;
}
