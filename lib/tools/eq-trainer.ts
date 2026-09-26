/**
 * The EQ ear trainer's pure logic: levels and their bands, question
 * generation, scoring with near misses, running statistics, a guitar-context
 * description of each band, gain staging, and deterministic pink noise.
 *
 * No Web Audio here. Randomness is injected so a test can pin every question.
 */

export type Random = () => number;

/** A small seeded generator (mulberry32) for tests and repeatable runs. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- levels

export type EqSource = "chords" | "single-notes" | "arpeggio" | "pink-noise";

export type EqLevel = {
  id: 1 | 2 | 3 | 4;
  name: string;
  summary: string;
  /** Centre frequencies in Hz, low to high, before the source filter. */
  bands: readonly number[];
  /** Size of the boost or cut in dB. */
  gainDb: number;
  /** When true, a question may be a cut, and the player names boost or cut too. */
  cuts: boolean;
};

/** The ten ISO octave-band centres. */
export const ISO_OCTAVE_BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

const OCTAVE_SEVEN = [100, 200, 400, 800, 1600, 3200, 6400] as const;

export const LEVELS: readonly EqLevel[] = [
  { id: 1, name: "Level 1", summary: "+12 dB boosts, 4 bands two octaves apart", bands: [125, 500, 2000, 8000], gainDb: 12, cuts: false },
  { id: 2, name: "Level 2", summary: "+9 dB boosts, 7 octave bands", bands: OCTAVE_SEVEN, gainDb: 9, cuts: false },
  { id: 3, name: "Level 3", summary: "±9 dB boosts or cuts, 7 octave bands; name the direction too", bands: OCTAVE_SEVEN, gainDb: 9, cuts: true },
  { id: 4, name: "Level 4", summary: "±6 dB boosts or cuts on the ISO octave bands", bands: ISO_OCTAVE_BANDS, gainDb: 6, cuts: true },
];

export function levelById(id: number): EqLevel {
  return LEVELS.find(level => level.id === id) ?? LEVELS[0];
}

/**
 * The part of the spectrum each source really has, measured on the demo loop.
 *
 * The plucked-string voice's lowest note is E2 (82 Hz). Summed per octave,
 * the strummed and arpeggio loops sit about 30 to 40 dB down at 31.5 and
 * 63 Hz and about 15 dB down at 16 kHz, so a ±6 dB change there is close to
 * inaudible: those bands are left out of guitar rounds. The single-note lead
 * plays nothing below G3 and is about 40 dB down at 125 Hz, so it also drops
 * the bands below 200 Hz. Pink noise has equal energy per octave and keeps
 * every band. That makes Level 4 ten bands on pink noise and seven (125 Hz to
 * 8 kHz) on the chord and arpeggio loops.
 */
export const SOURCE_RANGE: Record<EqSource, { low: number; high: number }> = {
  chords: { low: 100, high: 8000 },
  arpeggio: { low: 100, high: 8000 },
  "single-notes": { low: 200, high: 8000 },
  "pink-noise": { low: 0, high: Infinity },
};

/** The bands a round can use for a level and source. */
export function bandsFor(level: EqLevel, source: EqSource): number[] {
  const { low, high } = SOURCE_RANGE[source];
  return level.bands.filter(band => band >= low && band <= high);
}

/** "125 Hz", "1.6 kHz", "31.5 Hz". */
export function formatBand(hz: number) {
  if (hz >= 1000) return `${Number((hz / 1000).toFixed(1))} kHz`;
  return `${Number(hz.toFixed(1))} Hz`;
}

/** Q for a peaking filter about one octave wide (bandwidth N octaves: Q = √2ᴺ / (2ᴺ − 1)). */
export const PEAKING_Q = Math.SQRT2;

// ---------------------------------------------------------------- questions

export type EqQuestion = { band: number; gainDb: number };
export type EqAnswer = { band: number; boost?: boolean };

/**
 * The next round: a band from the level (never the same band twice in a row
 * when there is a choice) and a boost, or on levels with cuts a boost or a cut
 * at even odds.
 */
export function makeQuestion(level: EqLevel, random: Random, previous?: EqQuestion | null, source: EqSource = "pink-noise"): EqQuestion {
  const bands = bandsFor(level, source);
  if (bands.length === 0) throw new Error("No bands for this level and source.");
  const choices = previous && bands.length > 1 ? bands.filter(band => band !== previous.band) : bands;
  const band = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  const sign = level.cuts && random() < .5 ? -1 : 1;
  return { band, gainDb: sign * level.gainDb };
}

export type EqResult = {
  correct: boolean;
  bandCorrect: boolean;
  /** Null when the level does not ask for a direction. */
  directionCorrect: boolean | null;
  /** The answer was one octave from the right band. Feedback only, never correct. */
  nearMiss: boolean;
  /** Signed octaves from the right band to the answer: +1 means the answer was an octave high. */
  octavesOff: number;
};

/** Score an answer. A level with cuts needs the band and the direction. */
export function scoreAnswer(question: EqQuestion, answer: EqAnswer, level: EqLevel): EqResult {
  const octavesOff = Math.round(Math.log2(answer.band / question.band) * 100) / 100;
  const bandCorrect = Math.abs(octavesOff) < .05;
  const directionCorrect = level.cuts ? answer.boost === question.gainDb > 0 : null;
  const nearMiss = !bandCorrect && Math.abs(Math.abs(octavesOff) - 1) < .1;
  return { correct: bandCorrect && directionCorrect !== false, bandCorrect, directionCorrect, nearMiss, octavesOff };
}

// ---------------------------------------------------------------- stats

export type EqStats = {
  answered: number;
  correct: number;
  nearMisses: number;
  perBand: Record<string, { asked: number; correct: number }>;
  /** "actual>guess" → count, wrong band answers only. */
  confusions: Record<string, number>;
};

export const emptyStats = (): EqStats => ({ answered: 0, correct: 0, nearMisses: 0, perBand: {}, confusions: {} });

/** Fold one scored answer into the running stats, without mutating them. */
export function recordAnswer(stats: EqStats, question: EqQuestion, answer: EqAnswer, result: EqResult): EqStats {
  const key = String(question.band);
  const band = stats.perBand[key] ?? { asked: 0, correct: 0 };
  const confusions = { ...stats.confusions };
  if (!result.bandCorrect) {
    const pair = `${question.band}>${answer.band}`;
    confusions[pair] = (confusions[pair] ?? 0) + 1;
  }
  return {
    answered: stats.answered + 1,
    correct: stats.correct + (result.correct ? 1 : 0),
    nearMisses: stats.nearMisses + (result.nearMiss ? 1 : 0),
    perBand: { ...stats.perBand, [key]: { asked: band.asked + 1, correct: band.correct + (result.correct ? 1 : 0) } },
    confusions,
  };
}

/** Share correct, 0–1, or null before any answer. */
export const accuracy = (stats: Pick<EqStats, "answered" | "correct">) => stats.answered > 0 ? stats.correct / stats.answered : null;

/** Per-band accuracy, low to high, for bands that have been asked. */
export function bandAccuracy(stats: EqStats) {
  return Object.entries(stats.perBand)
    .map(([band, { asked, correct }]) => ({ band: Number(band), asked, correct, accuracy: correct / asked }))
    .sort((a, b) => a.band - b.band);
}

/** The most frequent wrong-band pairs, most frequent first, then lowest band first. */
export function topConfusions(stats: EqStats, limit = 3) {
  return Object.entries(stats.confusions)
    .map(([pair, count]) => { const [actual, guess] = pair.split(">").map(Number); return { actual, guess, count }; })
    .sort((a, b) => b.count - a.count || a.actual - b.actual || a.guess - b.guess)
    .slice(0, limit);
}

/** Answers needed in a session before its accuracy can become a level's best. */
export const MIN_ANSWERS_FOR_BEST = 10;

/** The new best for a level, or the old one when this session does not beat it or is too short. */
export function updateBest(best: number | null, stats: EqStats) {
  const current = accuracy(stats);
  if (current === null || stats.answered < MIN_ANSWERS_FOR_BEST) return best;
  return best === null || current > best ? current : best;
}

// ---------------------------------------------------------------- feedback

/**
 * What each band does on a guitar, in plain terms. Conservative on purpose:
 * where the boundaries sit varies with the guitar, the amp and the speaker.
 */
const DESCRIPTIONS: readonly [number, string][] = [
  [31.5, "sub-bass rumble, below the open low E (82 Hz). A guitar has almost nothing here; a boost mostly adds rumble and uses up headroom."],
  [63, "low rumble under the guitar's lowest note. Boosting it adds boom and stage rumble more than guitar, and crowds the kick drum and bass."],
  [100, "the fundamentals of the low strings (open A is 110 Hz). Weight and thump, and the range where a guitar competes with the bass."],
  [125, "body and thump on the low strings and palm mutes. Too much sounds boomy; too little sounds thin."],
  [200, "warmth and fullness. Too much makes chords muddy, especially with drive."],
  [250, "warmth that turns to mud. A common place to cut a little to clear up a thick rhythm part."],
  [400, "boxy, woody midrange. Too much sounds like a cardboard box; a small cut often opens up a close-miked amp."],
  [500, "the body of the midrange and some boxiness. Much of what a wah's heel-down sweep emphasises."],
  [800, "honk and nasal midrange. Part of what helps a guitar cut through a band mix."],
  [1000, "honk and forward midrange. Much of the character of a mid-boost or overdrive pedal lives near here."],
  [1600, "upper-mid bite and attack. Pushed hard it turns harsh and nasal."],
  [2000, "pick attack and bite, and a lot of a guitar's clarity. Overdone, it sounds harsh."],
  [3200, "presence and edge. The ear is most sensitive around here, so even a small boost sounds loud."],
  [4000, "presence and pick definition, and fizz on distorted tones."],
  [6400, "sizzle, string noise and distortion fizz. A typical guitar speaker rolls off steeply above about 5 kHz, so an amp tone has little up here."],
  [8000, "air and sparkle on clean and acoustic tones, plus string squeak and hiss. A guitar speaker removes most of it."],
  [16000, "air above almost everything a guitar makes. Mostly hiss, cymbals and room."],
];

/** "800 Hz: honk and nasal midrange…". Picks the nearest described band. */
export function bandDescription(hz: number) {
  let best = DESCRIPTIONS[0];
  for (const entry of DESCRIPTIONS) if (Math.abs(Math.log2(entry[0] / hz)) < Math.abs(Math.log2(best[0] / hz))) best = entry;
  return `${formatBand(hz)}: ${best[1]}`;
}

/** One line of feedback after an answer. */
export function feedbackLine(question: EqQuestion, answer: EqAnswer, result: EqResult, level: EqLevel) {
  const actual = `${formatBand(question.band)} ${question.gainDb > 0 ? "boost" : "cut"}`;
  if (result.correct) return `Correct: ${actual} of ${Math.abs(question.gainDb)} dB.`;
  if (result.bandCorrect && result.directionCorrect === false) return `Right band, wrong direction: it was a ${question.gainDb > 0 ? "boost" : "cut"} at ${formatBand(question.band)}.`;
  const guess = `${formatBand(answer.band)}${level.cuts && answer.boost !== undefined ? ` ${answer.boost ? "boost" : "cut"}` : ""}`;
  if (result.nearMiss) return `Near miss: you chose ${guess}. It was ${actual}, one octave ${result.octavesOff > 0 ? "lower" : "higher"}.`;
  return `Not this time: you chose ${guess}. It was ${actual}.`;
}

// ---------------------------------------------------------------- gain

/**
 * Pre-gain that keeps a boost from pushing the loop past full scale. The
 * source peaks at 0.7; attenuating by the boost size before the filter keeps
 * the steady-state peak about where it started. A peaking filter can still
 * overshoot on transients, which the limiter after it catches.
 */
export const preGainFor = (level: EqLevel) => 10 ** (-level.gainDb / 20);

export const dbToGain = (db: number) => 10 ** (db / 20);

// ---------------------------------------------------------------- pink noise

/**
 * Pink noise (−3 dB per octave) from white noise through Paul Kellet's
 * refined filter, deterministic for a given random source, normalised to
 * `peak`, and seamless when looped. The first 22,050 samples of filter
 * settling are discarded.
 */
export function pinkNoise(length: number, random: Random, peak = .7): Float32Array {
  const count = Math.max(0, Math.floor(length));
  const out = new Float32Array(count);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  const step = () => {
    const white = random() * 2 - 1;
    b0 = .99886 * b0 + white * .0555179;
    b1 = .99332 * b1 + white * .0750759;
    b2 = .969 * b2 + white * .153852;
    b3 = .8665 * b3 + white * .3104856;
    b4 = .55 * b4 + white * .5329522;
    b5 = -.7616 * b5 - white * .016898;
    const value = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * .5362;
    b6 = white * .115926;
    return value;
  };
  for (let i = 0; i < 22050; i++) step();
  // Crossfade the extra tail into the head so the buffer loops without a seam.
  const fade = Math.min(count, 512);
  const raw = new Float32Array(count + fade);
  for (let i = 0; i < raw.length; i++) raw[i] = step();
  for (let i = 0; i < count; i++) out[i] = i < fade ? raw[i] * (i / fade) + raw[count + i] * (1 - i / fade) : raw[i];
  let max = 0;
  for (let i = 0; i < count; i++) max = Math.max(max, Math.abs(out[i]));
  if (max > 0) for (let i = 0; i < count; i++) out[i] *= peak / max;
  return out;
}
