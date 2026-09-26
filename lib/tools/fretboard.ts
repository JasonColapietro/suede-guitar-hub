/**
 * Fretboard theory for the fretboard explorer: pitch classes and their
 * spelling, scales, modes and arpeggios as interval lists, tunings, the note
 * grid, position windows, and the find-the-note quiz.
 *
 * Everything here is pure. The quiz takes an injected random source so a test
 * can pin the questions it asks.
 */

export const SHARP = "♯";
export const FLAT = "♭";

/** Letter names in order, with the pitch class of each natural. */
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11] as const;

const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;

export const mod12 = (value: number) => ((value % 12) + 12) % 12;

/** True for C, D, E, F, G, A and B. */
export const isNatural = (pc: number) => (NATURAL_PC as readonly number[]).includes(mod12(pc));

/** A pitch class named with sharps or with flats. Naturals are the same either way. */
export function pitchName(pc: number, preferFlats = false) {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

/** "F♯/G♭" for a black key, "F" for a natural. */
export function enharmonicName(pc: number) {
  const sharp = SHARP_NAMES[mod12(pc)], flat = FLAT_NAMES[mod12(pc)];
  return sharp === flat ? sharp : `${sharp}/${flat}`;
}

/**
 * Keys spelled with flats: F, B♭, E♭, A♭, D♭ major and their relative minors
 * D, G, C, F and B♭ minor. The fallback preference when a scale cannot be
 * spelled letter by letter.
 */
export function prefersFlats(rootPc: number, minor: boolean) {
  const major = minor ? mod12(rootPc + 3) : mod12(rootPc);
  return [5, 10, 3, 8, 1].includes(major);
}

/** Parse a note name such as "B♭", "Bb", "F#" or "F♯" to a pitch class. */
export function parseNote(name: string): number | null {
  const match = /^([A-Ga-g])([#♯b♭]*)$/.exec(name.trim());
  if (!match) return null;
  let pc: number = NATURAL_PC[LETTERS.indexOf(match[1].toUpperCase() as typeof LETTERS[number])];
  for (const accidental of match[2]) pc += accidental === "#" || accidental === SHARP ? 1 : -1;
  return mod12(pc);
}

// ---------------------------------------------------------------- scales

export type Interval = { semitones: number; degree: string };
export type ScaleKind = "scale" | "arpeggio";
export type Scale = { id: string; name: string; kind: ScaleKind; intervals: readonly Interval[] };

/** Build an interval list from degree labels; the semitones follow from the label. */
const DEGREE_SEMITONES: Record<string, number> = {
  "1": 0, "♭2": 1, "2": 2, "♯2": 3, "♭3": 3, "3": 4, "4": 5, "♯4": 6, "♭5": 6, "5": 7,
  "♯5": 8, "♭6": 8, "6": 9, "♭♭7": 9, "♭7": 10, "7": 11,
};
const INTERVAL_NAMES: Record<string, string> = {
  "1": "root", "♭2": "minor 2nd", "2": "major 2nd", "♯2": "augmented 2nd", "♭3": "minor 3rd", "3": "major 3rd",
  "4": "perfect 4th", "♯4": "augmented 4th", "♭5": "diminished 5th", "5": "perfect 5th", "♯5": "augmented 5th",
  "♭6": "minor 6th", "6": "major 6th", "♭♭7": "diminished 7th", "♭7": "minor 7th", "7": "major 7th",
};
const degrees = (...labels: string[]): Interval[] => labels.map(degree => {
  const semitones = DEGREE_SEMITONES[degree];
  if (semitones === undefined) throw new Error(`Unknown degree ${degree}`);
  return { semitones, degree };
});

export const SCALES: readonly Scale[] = [
  { id: "major", name: "Major (Ionian)", kind: "scale", intervals: degrees("1", "2", "3", "4", "5", "6", "7") },
  { id: "natural-minor", name: "Natural minor (Aeolian)", kind: "scale", intervals: degrees("1", "2", "♭3", "4", "5", "♭6", "♭7") },
  { id: "dorian", name: "Dorian", kind: "scale", intervals: degrees("1", "2", "♭3", "4", "5", "6", "♭7") },
  { id: "phrygian", name: "Phrygian", kind: "scale", intervals: degrees("1", "♭2", "♭3", "4", "5", "♭6", "♭7") },
  { id: "lydian", name: "Lydian", kind: "scale", intervals: degrees("1", "2", "3", "♯4", "5", "6", "7") },
  { id: "mixolydian", name: "Mixolydian", kind: "scale", intervals: degrees("1", "2", "3", "4", "5", "6", "♭7") },
  { id: "locrian", name: "Locrian", kind: "scale", intervals: degrees("1", "♭2", "♭3", "4", "♭5", "♭6", "♭7") },
  { id: "harmonic-minor", name: "Harmonic minor", kind: "scale", intervals: degrees("1", "2", "♭3", "4", "5", "♭6", "7") },
  { id: "melodic-minor", name: "Melodic minor (ascending)", kind: "scale", intervals: degrees("1", "2", "♭3", "4", "5", "6", "7") },
  { id: "major-pentatonic", name: "Major pentatonic", kind: "scale", intervals: degrees("1", "2", "3", "5", "6") },
  { id: "minor-pentatonic", name: "Minor pentatonic", kind: "scale", intervals: degrees("1", "♭3", "4", "5", "♭7") },
  { id: "blues", name: "Blues (minor pentatonic + ♭5)", kind: "scale", intervals: degrees("1", "♭3", "4", "♭5", "5", "♭7") },
  { id: "whole-tone", name: "Whole tone", kind: "scale", intervals: degrees("1", "2", "3", "♯4", "♯5", "♭7") },
  { id: "arp-major", name: "Major triad", kind: "arpeggio", intervals: degrees("1", "3", "5") },
  { id: "arp-minor", name: "Minor triad", kind: "arpeggio", intervals: degrees("1", "♭3", "5") },
  { id: "arp-dom7", name: "Dominant 7", kind: "arpeggio", intervals: degrees("1", "3", "5", "♭7") },
  { id: "arp-maj7", name: "Major 7", kind: "arpeggio", intervals: degrees("1", "3", "5", "7") },
  { id: "arp-m7", name: "Minor 7", kind: "arpeggio", intervals: degrees("1", "♭3", "5", "♭7") },
  { id: "arp-m7b5", name: "Minor 7♭5 (half-diminished)", kind: "arpeggio", intervals: degrees("1", "♭3", "♭5", "♭7") },
  { id: "arp-dim7", name: "Diminished 7", kind: "arpeggio", intervals: degrees("1", "♭3", "♭5", "♭♭7") },
];

export function scaleById(id: string): Scale {
  const scale = SCALES.find(entry => entry.id === id);
  if (!scale) throw new Error(`Unknown scale ${id}`);
  return scale;
}

/** "minor 3rd" for "♭3", and so on. */
export const intervalName = (degree: string) => INTERVAL_NAMES[degree] ?? degree;

/** A scale is minor-flavoured when it has a minor third and no major third. */
const isMinor = (scale: Scale) => scale.intervals.some(i => i.degree === "♭3") && !scale.intervals.some(i => i.degree === "3");

export type SpelledNote = { pc: number; name: string; degree: string; interval: string; semitones: number };

const ACCIDENTALS: Record<number, string> = { [-2]: "♭♭", [-1]: FLAT, 0: "", 1: SHARP, 2: "♯♯" };

/** Spell every degree on its own letter from a root letter; null when an accidental would pass a double. */
function spellFrom(rootLetter: number, rootAccidental: number, scale: Scale): SpelledNote[] | null {
  const rootPc = mod12(NATURAL_PC[rootLetter] + rootAccidental);
  const notes: SpelledNote[] = [];
  for (const { semitones, degree } of scale.intervals) {
    const number = Number(degree.replace(/[^0-9]/g, ""));
    const letter = (rootLetter + number - 1) % 7;
    const pc = mod12(rootPc + semitones);
    let accidental = mod12(pc - NATURAL_PC[letter]);
    if (accidental > 6) accidental -= 12;
    if (accidental < -2 || accidental > 2) return null;
    notes.push({ pc, name: LETTERS[letter] + ACCIDENTALS[accidental], degree, interval: intervalName(degree), semitones });
  }
  return notes;
}

const accidentalCount = (notes: readonly SpelledNote[]) => notes.reduce((sum, note) => sum + (note.name.length - 1), 0);

/**
 * Spell a scale correctly for its key. Every degree gets its own letter (so a
 * ♭3 is always a third, never a raised second), and the root is spelled
 * whichever way needs fewer accidentals: D♭ major rather than C♯ major, but
 * C♯ minor rather than D♭ minor. A tie goes to the flat-key rule, so F♯ major
 * and E♭ minor. Only the whole-tone and blues scales repeat or skip a letter;
 * their labels still decide the letter, which is the usual convention.
 */
export function spellScale(rootPc: number, scale: Scale): { rootName: string; notes: SpelledNote[] } {
  const pc = mod12(rootPc);
  const candidates: { letter: number; accidental: number }[] = [];
  for (let letter = 0; letter < 7; letter++) {
    let accidental = mod12(pc - NATURAL_PC[letter]);
    if (accidental > 6) accidental -= 12;
    if (Math.abs(accidental) <= 1) candidates.push({ letter, accidental });
  }
  // White keys keep their natural name (no E♯ or F♭ roots).
  const pool = candidates.some(c => c.accidental === 0) ? candidates.filter(c => c.accidental === 0) : candidates;
  const flats = prefersFlats(pc, isMinor(scale));
  let best: { notes: SpelledNote[]; score: number; flat: boolean } | null = null;
  for (const { letter, accidental } of pool) {
    const notes = spellFrom(letter, accidental, scale);
    if (!notes) continue;
    const score = accidentalCount(notes);
    const flat = accidental < 0;
    if (!best || score < best.score || (score === best.score && flat === flats && best.flat !== flats)) best = { notes, score, flat };
  }
  if (!best) {
    const notes = scale.intervals.map(({ semitones, degree }) => ({ pc: mod12(pc + semitones), name: pitchName(pc + semitones, flats), degree, interval: intervalName(degree), semitones }));
    return { rootName: notes[0].name, notes };
  }
  return { rootName: best.notes[0].name, notes: best.notes };
}

/** The name to show on a root button, following the flat-key rule for major keys. */
export const rootLabel = (pc: number) => pitchName(pc, prefersFlats(pc, false));

// ---------------------------------------------------------------- tunings

export type Tuning = { id: string; name: string; notes: string; midi: readonly number[] };

/** Open strings low to high, as MIDI numbers (E2 = 40). */
export const TUNINGS: readonly Tuning[] = [
  { id: "standard", name: "Standard", notes: "E A D G B E", midi: [40, 45, 50, 55, 59, 64] },
  { id: "drop-d", name: "Drop D", notes: "D A D G B E", midi: [38, 45, 50, 55, 59, 64] },
  { id: "half-step-down", name: "Half-step down", notes: "E♭ A♭ D♭ G♭ B♭ E♭", midi: [39, 44, 49, 54, 58, 63] },
  { id: "d-standard", name: "Whole-step down (D standard)", notes: "D G C F A D", midi: [38, 43, 48, 53, 57, 62] },
  { id: "dadgad", name: "DADGAD", notes: "D A D G A D", midi: [38, 45, 50, 55, 57, 62] },
  { id: "open-g", name: "Open G", notes: "D G D G B D", midi: [38, 43, 50, 55, 59, 62] },
  { id: "open-d", name: "Open D", notes: "D A D F♯ A D", midi: [38, 45, 50, 54, 57, 62] },
  { id: "open-e", name: "Open E", notes: "E B E G♯ B E", midi: [40, 47, 52, 56, 59, 64] },
  { id: "drop-c", name: "Drop C", notes: "C G C F A D", midi: [36, 43, 48, 53, 57, 62] },
];

export function tuningById(id: string): Tuning {
  const tuning = TUNINGS.find(entry => entry.id === id);
  if (!tuning) throw new Error(`Unknown tuning ${id}`);
  return tuning;
}

// ---------------------------------------------------------------- the grid

export type Cell = {
  /** Sharp-spelled name; `positionsFor` replaces it with the key's spelling. */
  note: string;
  pc: number;
  midi: number;
  /** Guitar string number: 1 is the highest string, 6 the lowest. */
  string: number;
  /** 0 is the lowest string, as in the tuning array. */
  stringIndex: number;
  fret: number;
};

/** Every string and fret from the open string to `frets`, lowest string first. */
export function fretboardGrid(tuning: Tuning | readonly number[], frets: number): Cell[] {
  const open = Array.isArray(tuning) ? tuning as readonly number[] : (tuning as Tuning).midi;
  const count = Math.max(0, Math.floor(frets));
  const cells: Cell[] = [];
  open.forEach((openMidi, stringIndex) => {
    for (let fret = 0; fret <= count; fret++) {
      const midi = openMidi + fret;
      cells.push({ note: pitchName(midi), pc: mod12(midi), midi, string: open.length - stringIndex, stringIndex, fret });
    }
  });
  return cells;
}

export type Position = Cell & { degree: string; interval: string; isRoot: boolean };

/** The cells of the grid that belong to the scale, named for its key. */
export function positionsFor(rootPc: number, scale: Scale, tuning: Tuning | readonly number[], frets: number): Position[] {
  const { notes } = spellScale(rootPc, scale);
  const byPc = new Map(notes.map(note => [note.pc, note]));
  const out: Position[] = [];
  for (const cell of fretboardGrid(tuning, frets)) {
    const note = byPc.get(cell.pc);
    if (note) out.push({ ...cell, note: note.name, degree: note.degree, interval: note.interval, isRoot: note.semitones === 0 });
  }
  return out;
}

export type PositionWindow = { index: number; start: number; end: number; label: string };

/**
 * Fret windows four frets wide plus one stretch (start to start + 4), one
 * position at a time, the way a teacher shows a scale "in position".
 *
 * Windows start on the scale notes of the lowest string within one octave of
 * its lowest root, skipping a start that is only a fret from the last one,
 * and keeping at most five. Five overlapping windows two to three frets apart
 * cover the octave, and the octave repeats above fret 12. A window that runs
 * past the last fret moves down an octave (to the nut when it is within two
 * frets of it), or back to end on the last fret;
 * two windows that land on the same frets count once.
 */
export function positionWindows(rootPc: number, scale: Scale, tuning: Tuning | readonly number[], frets: number): PositionWindow[] {
  const open = Array.isArray(tuning) ? tuning as readonly number[] : (tuning as Tuning).midi;
  const last = Math.max(4, Math.floor(frets));
  const low = open[0];
  const pcs = new Set(scale.intervals.map(i => mod12(rootPc + i.semitones)));
  const rootFret = mod12(rootPc - low);
  const candidates: number[] = [];
  for (let fret = rootFret; fret < rootFret + 12; fret++) if (pcs.has(mod12(low + fret))) candidates.push(fret);
  const starts: number[] = [];
  for (const fret of candidates) {
    if (starts.length === 5) break;
    if (starts.length === 0 || fret - starts[starts.length - 1] >= 2) starts.push(fret);
  }
  const placed = starts.map(start => {
    let from = start;
    while (from + 4 > last && from - 12 >= 0) from -= 12;
    // Just short of the next octave: the same shape starts at the nut.
    if (from + 4 > last) from = from - 12 >= -2 ? 0 : last - 4;
    return { start: from, end: from + 4 };
  });
  const unique = [...new Map(placed.map(window => [window.start, window])).values()].sort((a, b) => a.start - b.start);
  return unique.map((window, index) => ({ index, ...window, label: `Position ${index + 1} (frets ${window.start}–${window.end})` }));
}

/**
 * One octave up from the lowest root on the board, then the octave: what
 * "Play scale" plays. MIDI numbers, ascending.
 */
export function scaleOctaveMidi(rootPc: number, scale: Scale, tuning: Tuning | readonly number[], frets: number): number[] {
  const grid = fretboardGrid(tuning, frets);
  const roots = grid.filter(cell => cell.pc === mod12(rootPc)).map(cell => cell.midi);
  if (roots.length === 0) return [];
  const lowest = Math.min(...roots);
  return [...scale.intervals.map(i => lowest + i.semitones), lowest + 12];
}

/** "A, string 5 fret 0, root" for a dot's button label. */
export function positionLabel(position: Position) {
  const role = position.isRoot ? "root" : `${position.interval} (${position.degree})`;
  return `${position.note}, string ${position.string} fret ${position.fret}, ${role}`;
}

// ---------------------------------------------------------------- the quiz

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

const pick = <T,>(items: readonly T[], random: Random): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

export type QuizSettings = {
  /** Natural notes only, or all twelve. */
  naturalOnly: boolean;
  /** One string (guitar string number, 1–6) or the whole neck (null). */
  string: number | null;
  /** Ask for a note on a named string anywhere on the neck. Ignored when `string` is set. */
  nameString?: boolean;
  stringCount?: number;
};

export type QuizQuestion = {
  pc: number;
  /** How the note is named in the question, e.g. "F♯" or "G♭". */
  name: string;
  /** The string to find it on, or null for anywhere. */
  string: number | null;
};

/**
 * The next find-the-note question. Never the same note twice in a row. A
 * black key is named as a sharp or a flat at random, since players meet both.
 */
export function makeQuizQuestion(settings: QuizSettings, random: Random, previous?: QuizQuestion | null): QuizQuestion {
  const pool = Array.from({ length: 12 }, (_, pc) => pc).filter(pc => !settings.naturalOnly || isNatural(pc));
  const choices = previous && pool.length > 1 ? pool.filter(pc => pc !== previous.pc) : pool;
  const pc = pick(choices, random);
  const name = isNatural(pc) ? pitchName(pc) : pitchName(pc, random() < .5);
  const count = settings.stringCount ?? 6;
  const string = settings.string ?? (settings.nameString ? Math.min(count, 1 + Math.floor(random() * count)) : null);
  return { pc, name, string };
}

/** True when the tapped cell is the asked note on the asked string. */
export function checkQuizAnswer(question: QuizQuestion, cell: Pick<Cell, "pc" | "string">) {
  return cell.pc === question.pc && (question.string === null || cell.string === question.string);
}

/** Where the answer is, for the reveal after a wrong tap. */
export function quizAnswerCells(question: QuizQuestion, tuning: Tuning | readonly number[], frets: number) {
  return fretboardGrid(tuning, frets).filter(cell => checkQuizAnswer(question, cell));
}

export type QuizStats = { answered: number; correct: number; streak: number; bestStreak: number; totalMs: number };
export const EMPTY_QUIZ_STATS: QuizStats = { answered: 0, correct: 0, streak: 0, bestStreak: 0, totalMs: 0 };

/** Fold one answer into the running score. Response times only count correct answers. */
export function recordQuizAnswer(stats: QuizStats, correct: boolean, responseMs: number): QuizStats {
  const ms = Number.isFinite(responseMs) && responseMs > 0 ? responseMs : 0;
  const streak = correct ? stats.streak + 1 : 0;
  return {
    answered: stats.answered + 1,
    correct: stats.correct + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    totalMs: stats.totalMs + (correct ? ms : 0),
  };
}

/** Mean time to a correct answer, in milliseconds, or null before the first one. */
export const averageResponseMs = (stats: QuizStats) => stats.correct > 0 ? stats.totalMs / stats.correct : null;

/** The key a best score is stored under, one per difficulty. */
export function quizBestKey(settings: QuizSettings) {
  return `${settings.naturalOnly ? "natural" : "all"}-${settings.string === null ? "neck" : `string${settings.string}`}`;
}
