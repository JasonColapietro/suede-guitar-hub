/** Pure music theory for the fretboard explorer. MIDI numbers throughout. */

export const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"] as const;

export type Tuning = { id: string; name: string; strings: readonly number[] };
/** Low string first. */
export const TUNINGS: readonly Tuning[] = [
  { id: "standard", name: "Standard (E A D G B E)", strings: [40, 45, 50, 55, 59, 64] },
  { id: "half-down", name: "Half step down (E♭)", strings: [39, 44, 49, 54, 58, 63] },
  { id: "drop-d", name: "Drop D", strings: [38, 45, 50, 55, 59, 64] },
  { id: "dadgad", name: "DADGAD", strings: [38, 45, 50, 55, 57, 62] },
  { id: "open-g", name: "Open G", strings: [38, 43, 50, 55, 59, 62] },
];

export type Pattern = { id: string; name: string; group: "Scales" | "Modes" | "Arpeggios"; intervals: readonly number[] };
export const PATTERNS: readonly Pattern[] = [
  { id: "minor-pent", name: "Minor pentatonic", group: "Scales", intervals: [0, 3, 5, 7, 10] },
  { id: "major-pent", name: "Major pentatonic", group: "Scales", intervals: [0, 2, 4, 7, 9] },
  { id: "blues", name: "Blues scale", group: "Scales", intervals: [0, 3, 5, 6, 7, 10] },
  { id: "major", name: "Major (Ionian)", group: "Scales", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor", name: "Natural minor (Aeolian)", group: "Scales", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: "harmonic-minor", name: "Harmonic minor", group: "Scales", intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: "dorian", name: "Dorian", group: "Modes", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: "mixolydian", name: "Mixolydian", group: "Modes", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: "lydian", name: "Lydian", group: "Modes", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: "phrygian", name: "Phrygian", group: "Modes", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: "major-triad", name: "Major triad", group: "Arpeggios", intervals: [0, 4, 7] },
  { id: "minor-triad", name: "Minor triad", group: "Arpeggios", intervals: [0, 3, 7] },
  { id: "dom7", name: "Dominant 7", group: "Arpeggios", intervals: [0, 4, 7, 10] },
  { id: "maj7", name: "Major 7", group: "Arpeggios", intervals: [0, 4, 7, 11] },
  { id: "min7", name: "Minor 7", group: "Arpeggios", intervals: [0, 3, 7, 10] },
];

const DEGREES = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"] as const;

export const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;
export const noteName = (midi: number) => NOTE_NAMES[pitchClass(midi)];
export const degree = (midi: number, root: number) => DEGREES[pitchClass(midi - root)];

export function inPattern(midi: number, root: number, pattern: Pattern) {
  return pattern.intervals.includes(pitchClass(midi - root));
}

export type Cell = { string: number; fret: number; midi: number };

export function cells(tuning: Tuning, frets: number): Cell[][] {
  return tuning.strings.map((open, string) => Array.from({ length: frets + 1 }, (_, fret) => ({ string, fret, midi: open + fret })));
}

/** Pick a random fretted position for the note-finding quiz. */
export function quizCell(tuning: Tuning, frets: number, random: () => number = Math.random): Cell {
  const string = Math.min(tuning.strings.length - 1, Math.floor(random() * tuning.strings.length));
  const fret = Math.min(frets, Math.floor(random() * (frets + 1)));
  return { string, fret, midi: tuning.strings[string] + fret };
}

export const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
