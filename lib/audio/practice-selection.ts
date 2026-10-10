import type { PracticeSpec } from './practice.ts';

/** Practice sections preserve target identities and spacing. Play always uses the full authored exercise. */
export function practiceSelection(authored: PracticeSpec, mode: 'practice' | 'play', loop: boolean, start: number, end: number): PracticeSpec {
  if (mode !== 'practice' || !loop || !authored.targets.length) return authored;
  const lower = Math.max(0, Math.min(Math.trunc(start), authored.targets.length - 1));
  const upper = Math.max(lower, Math.min(Math.trunc(end), authored.targets.length - 1));
  const selected = authored.targets.slice(lower, upper + 1);
  return { ...authored, targets: selected.map(target => ({ ...target, beat: target.beat - selected[0].beat })) };
}

/**
 * A beat position as people read it: whole beats as "2", subdivisions to two
 * decimals ("1.5", "1.67"). Triplet positions are stored as thirds, and
 * printing the raw double showed "beat 1.6669999999999998".
 */
export function formatBeat(beat: number): string {
  if (!Number.isFinite(beat)) return "";
  return String(Math.round(beat * 100) / 100);
}

export function targetMap(spec: PracticeSpec) {
  return spec.targets.map((target, index) => ({ ...target, number: index + 1, bar: Math.floor(target.beat / 4) + 1, beatInBar: formatBeat(target.beat % 4 + 1) }));
}

export function chordFretRange(frets: (number | null)[]) {
  const highest = Math.max(3, ...frets.filter((fret): fret is number => fret !== null));
  const first = highest <= 4 ? 1 : Math.max(1, Math.min(...frets.filter((fret): fret is number => fret !== null && fret > 0)));
  return { first, last: Math.max(first + 3, highest) };
}

/** Use the native target highlight window, including offbeats and intentional gaps. */
export function rhythmCueAt(spec: PracticeSpec, beat: number) {
  const end = (spec.targets.at(-1)?.beat ?? -1) + 1;
  if (!Number.isFinite(beat) || beat < 0 || beat >= end || spec.targets.length === 0) return null;
  const upcoming = spec.targets.findIndex(target => target.beat > beat);
  const index = upcoming === 0 ? 0 : upcoming < 0 ? spec.targets.length - 1 : upcoming - 1;
  const target = spec.targets[index];
  const sinceTarget = beat - target.beat;
  const next = sinceTarget < 0 ? target : spec.targets[index + 1];
  return { index, target, active: sinceTarget >= 0 && sinceTarget < .2, next, beatsUntilNext: next ? Math.max(0, next.beat - beat) : null };
}
