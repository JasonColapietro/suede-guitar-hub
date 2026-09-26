/**
 * EQ ear training for guitar tone. The bands are the ones guitarists actually
 * argue about, each named with the word players use for too much of it.
 */

export type Band = { hz: number; label: string; word: string; hint: string };

export const BANDS: readonly Band[] = [
  { hz: 100, label: "100 Hz", word: "Boom", hint: "Chest thump. Too much and the guitar fights the bass player." },
  { hz: 250, label: "250 Hz", word: "Mud", hint: "Warmth that turns to mud. The first place to cut a cloudy tone." },
  { hz: 500, label: "500 Hz", word: "Boxy", hint: "Cardboard, hollow, small-room sound." },
  { hz: 800, label: "800 Hz", word: "Honk", hint: "Nasal, horn-like. Where a wah pedal and a cocked-wah tone live." },
  { hz: 1600, label: "1.6 kHz", word: "Push", hint: "Forwardness. The band that makes a guitar cut through a mix." },
  { hz: 3200, label: "3.2 kHz", word: "Bite", hint: "Pick attack and aggression. Too much is harsh on the ears." },
  { hz: 6400, label: "6.4 kHz", word: "Fizz", hint: "Distortion fizz and string sizzle. Speakers roll most of it off." },
];

export type Level = { id: "easy" | "medium" | "hard"; name: string; bands: readonly number[]; gainDb: number };

export const LEVELS: readonly Level[] = [
  { id: "easy", name: "Easy: 3 bands, +12 dB", bands: [250, 800, 3200], gainDb: 12 },
  { id: "medium", name: "Medium: 5 bands, +9 dB", bands: [100, 250, 800, 1600, 3200], gainDb: 9 },
  { id: "hard", name: "Hard: 7 bands, +6 dB", bands: BANDS.map(band => band.hz), gainDb: 6 },
];

/** Pick the next boosted band. Never the same one twice in a row. */
export function nextBand(level: Level, previous: number | null, random: () => number = Math.random): number {
  const pool = level.bands.filter(hz => hz !== previous);
  const choices = pool.length > 0 ? pool : level.bands;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

export type EarStats = { answered: number; correct: number; streak: number; best: number };
export const EMPTY_STATS: EarStats = { answered: 0, correct: 0, streak: 0, best: 0 };

export function score(stats: EarStats, correct: boolean): EarStats {
  const streak = correct ? stats.streak + 1 : 0;
  return { answered: stats.answered + 1, correct: stats.correct + (correct ? 1 : 0), streak, best: Math.max(stats.best, streak) };
}

/** Octaves between two frequencies; used to say how close a wrong guess was. */
export function octavesApart(a: number, b: number) { return Math.abs(Math.log2(a / b)); }

export function bandFor(hz: number): Band {
  return BANDS.find(band => band.hz === hz) ?? BANDS[0];
}
