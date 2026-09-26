import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_QUIZ_STATS,
  SCALES,
  TUNINGS,
  averageResponseMs,
  checkQuizAnswer,
  enharmonicName,
  fretboardGrid,
  isNatural,
  makeQuizQuestion,
  parseNote,
  positionLabel,
  positionWindows,
  positionsFor,
  prefersFlats,
  quizAnswerCells,
  quizBestKey,
  recordQuizAnswer,
  scaleById,
  scaleOctaveMidi,
  seededRandom,
  spellScale,
  tuningById,
} from "../lib/tools/fretboard.ts";

const names = (root: string, scale: string) => spellScale(parseNote(root)!, scaleById(scale)).notes.map(note => note.name).join(" ");

test("scales are spelled one letter per degree in the right key", () => {
  assert.equal(names("C", "major"), "C D E F G A B");
  assert.equal(names("F", "major"), "F G A B♭ C D E");
  assert.equal(names("Db", "major"), "D♭ E♭ F G♭ A♭ B♭ C");
  assert.equal(names("C#", "major"), "D♭ E♭ F G♭ A♭ B♭ C", "C♯ major is respelled as the simpler D♭");
  assert.equal(names("F#", "major"), "F♯ G♯ A♯ B C♯ D♯ E♯");
  assert.equal(names("E", "major"), "E F♯ G♯ A B C♯ D♯");
  assert.equal(names("D", "natural-minor"), "D E F G A B♭ C");
  assert.equal(names("C#", "natural-minor"), "C♯ D♯ E F♯ G♯ A B");
  assert.equal(names("G#", "natural-minor"), "G♯ A♯ B C♯ D♯ E F♯");
  assert.equal(names("Bb", "natural-minor"), "B♭ C D♭ E♭ F G♭ A♭");
  assert.equal(names("A", "harmonic-minor"), "A B C D E F G♯");
  assert.equal(names("D", "dorian"), "D E F G A B C");
  assert.equal(names("E", "phrygian"), "E F G A B C D");
  assert.equal(names("F", "lydian"), "F G A B C D E");
  assert.equal(names("G", "mixolydian"), "G A B C D E F");
  assert.equal(names("B", "locrian"), "B C D E F G A");
  assert.equal(names("A", "minor-pentatonic"), "A C D E G");
  assert.equal(names("A", "blues"), "A C D E♭ E G");
  assert.equal(names("G", "major-pentatonic"), "G A B D E");
  assert.equal(names("C", "whole-tone"), "C D E F♯ G♯ B♭");
  assert.equal(names("C", "arp-dim7"), "C E♭ G♭ B♭♭");
  assert.equal(names("B", "arp-m7b5"), "B D F A");
  assert.equal(names("G", "arp-dom7"), "G B D F");
  assert.equal(names("Eb", "arp-maj7"), "E♭ G B♭ D");
});

test("every scale and arpeggio has a root, rising intervals and labels", () => {
  assert.equal(SCALES.filter(scale => scale.kind === "scale").length, 13);
  assert.equal(SCALES.filter(scale => scale.kind === "arpeggio").length, 7);
  for (const scale of SCALES) {
    assert.deepEqual(scale.intervals[0], { semitones: 0, degree: "1" }, scale.id);
    for (let i = 1; i < scale.intervals.length; i++) assert.ok(scale.intervals[i].semitones > scale.intervals[i - 1].semitones, scale.id);
    assert.ok(scale.intervals.every(i => i.semitones < 12));
    // Every root spells without falling back to a mixed sharp and flat guess.
    for (let pc = 0; pc < 12; pc++) {
      const { notes } = spellScale(pc, scale);
      assert.deepEqual(notes.map(note => note.pc), scale.intervals.map(i => (pc + i.semitones) % 12), `${scale.id} on ${pc}`);
    }
  }
  assert.equal(scaleById("blues").intervals.map(i => i.degree).join(" "), "1 ♭3 4 ♭5 5 ♭7");
  assert.throws(() => scaleById("nope"));
});

test("sharp and flat preference follows the flat keys and their relative minors", () => {
  for (const key of ["F", "Bb", "Eb", "Ab", "Db"]) assert.equal(prefersFlats(parseNote(key)!, false), true, key);
  for (const key of ["D", "G", "C", "F", "Bb"]) assert.equal(prefersFlats(parseNote(key)!, true), true, `${key} minor`);
  for (const key of ["G", "D", "A", "E", "B"]) assert.equal(prefersFlats(parseNote(key)!, false), false, key);
  assert.equal(enharmonicName(6), "F♯/G♭");
  assert.equal(enharmonicName(9), "A");
  assert.equal(parseNote("B♭"), 10);
  assert.equal(parseNote("x"), null);
  assert.equal(isNatural(4), true);
  assert.equal(isNatural(3), false);
});

test("tunings are listed low to high as MIDI numbers", () => {
  assert.equal(TUNINGS.length, 9);
  assert.deepEqual(tuningById("standard").midi, [40, 45, 50, 55, 59, 64]);
  assert.deepEqual(tuningById("drop-d").midi, [38, 45, 50, 55, 59, 64]);
  assert.deepEqual(tuningById("dadgad").midi, [38, 45, 50, 55, 57, 62]);
  assert.deepEqual(tuningById("open-g").midi, [38, 43, 50, 55, 59, 62]);
  assert.deepEqual(tuningById("drop-c").midi, [36, 43, 48, 53, 57, 62]);
  for (const tuning of TUNINGS) {
    assert.equal(tuning.midi.length, 6);
    // The note names shown match the MIDI numbers.
    assert.deepEqual(tuning.notes.split(" ").map(parseNote), tuning.midi.map(m => m % 12), tuning.id);
  }
});

test("the grid gives note, midi, string and fret for every cell", () => {
  const grid = fretboardGrid(tuningById("standard"), 12);
  assert.equal(grid.length, 6 * 13);
  const lowE = grid.find(cell => cell.string === 6 && cell.fret === 0)!;
  assert.deepEqual({ note: lowE.note, midi: lowE.midi }, { note: "E", midi: 40 });
  const c = grid.find(cell => cell.string === 5 && cell.fret === 3)!;
  assert.deepEqual({ note: c.note, midi: c.midi }, { note: "C", midi: 48 });
  const high = grid.find(cell => cell.string === 1 && cell.fret === 12)!;
  assert.equal(high.midi, 76);
});

test("positions carry the key's spelling, degree and interval", () => {
  const cells = positionsFor(parseNote("A")!, scaleById("minor-pentatonic"), tuningById("standard"), 12);
  const open = cells.find(cell => cell.string === 5 && cell.fret === 0)!;
  assert.equal(positionLabel(open), "A, string 5 fret 0, root");
  assert.ok(cells.every(cell => ["A", "C", "D", "E", "G"].includes(cell.note)));
  const c = cells.find(cell => cell.string === 6 && cell.fret === 8)!;
  assert.deepEqual([c.note, c.degree, c.interval], ["C", "♭3", "minor 3rd"]);
  const flatKey = positionsFor(parseNote("F")!, scaleById("major"), tuningById("standard"), 12);
  assert.ok(flatKey.some(cell => cell.note === "B♭") && !flatKey.some(cell => cell.note.includes("♯")));
  // 22 frets: every string has the root at least once.
  const full = positionsFor(parseNote("G")!, scaleById("major"), tuningById("standard"), 22);
  for (let string = 1; string <= 6; string++) assert.ok(full.some(cell => cell.string === string && cell.isRoot));
});

test("position windows are four-fret spans that cover the neck", () => {
  for (const frets of [12, 22]) {
    for (const scale of ["major", "minor-pentatonic", "blues", "arp-major", "whole-tone"]) {
      for (let pc = 0; pc < 12; pc++) {
        const windows = positionWindows(pc, scaleById(scale), tuningById("standard"), frets);
        assert.ok(windows.length >= 3 && windows.length <= 5, `${scale} ${pc}: ${windows.length}`);
        for (const w of windows) {
          assert.ok(w.start >= 0 && w.end <= frets && w.end - w.start === 4, `${scale} ${pc} ${w.label}`);
        }
        for (let i = 1; i < windows.length; i++) assert.ok(windows[i].start > windows[i - 1].start);
      }
    }
  }
  const g = positionWindows(parseNote("G")!, scaleById("major-pentatonic"), tuningById("standard"), 22);
  assert.deepEqual(g.map(w => w.start), [3, 5, 7, 10, 12]);
  // Each pentatonic position holds two notes on every string.
  const cells = positionsFor(parseNote("G")!, scaleById("major-pentatonic"), tuningById("standard"), 22);
  for (const w of g) for (let string = 1; string <= 6; string++) {
    const inWindow = cells.filter(cell => cell.string === string && cell.fret >= w.start && cell.fret <= w.end);
    assert.ok(inWindow.length >= 2, `${w.label} string ${string}`);
  }
});

test("play scale covers one octave up from the lowest root", () => {
  assert.deepEqual(scaleOctaveMidi(parseNote("A")!, scaleById("minor-pentatonic"), tuningById("standard"), 12), [45, 48, 50, 52, 55, 57]);
  assert.deepEqual(scaleOctaveMidi(parseNote("E")!, scaleById("arp-major"), tuningById("standard"), 12), [40, 44, 47, 52]);
  assert.equal(scaleOctaveMidi(parseNote("C")!, scaleById("major"), tuningById("drop-c"), 12)[0], 36);
});

test("quiz questions come from the injected random source and do not repeat", () => {
  const settings = { naturalOnly: true, string: null };
  const a = seededRandom(42), b = seededRandom(42);
  let previous = null as ReturnType<typeof makeQuizQuestion> | null;
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const question = makeQuizQuestion(settings, a, previous);
    assert.deepEqual(question, makeQuizQuestion(settings, b, previous));
    assert.ok(isNatural(question.pc));
    assert.equal(question.string, null);
    if (previous) assert.notEqual(question.pc, previous.pc);
    seen.add(question.pc);
    previous = question;
  }
  assert.equal(seen.size, 7);
  const all = seededRandom(7);
  const allSeen = new Set<number>();
  for (let i = 0; i < 400; i++) {
    const question = makeQuizQuestion({ naturalOnly: false, string: 3 }, all);
    assert.equal(question.string, 3);
    assert.equal(parseNote(question.name), question.pc);
    allSeen.add(question.pc);
  }
  assert.equal(allSeen.size, 12);
  const named = makeQuizQuestion({ naturalOnly: true, string: null, nameString: true }, seededRandom(3));
  assert.ok(named.string! >= 1 && named.string! <= 6);
});

test("answers are checked by pitch class and string", () => {
  const question = { pc: 0, name: "C", string: 5 };
  assert.equal(checkQuizAnswer(question, { pc: 0, string: 5 }), true);
  assert.equal(checkQuizAnswer(question, { pc: 0, string: 2 }), false);
  assert.equal(checkQuizAnswer(question, { pc: 1, string: 5 }), false);
  assert.equal(checkQuizAnswer({ ...question, string: null }, { pc: 0, string: 2 }), true);
  assert.deepEqual(quizAnswerCells(question, tuningById("standard"), 22).map(cell => cell.fret), [3, 15]);
});

test("quiz stats keep a streak, best streak and average response time", () => {
  let stats = EMPTY_QUIZ_STATS;
  assert.equal(averageResponseMs(stats), null);
  stats = recordQuizAnswer(stats, true, 1000);
  stats = recordQuizAnswer(stats, true, 2000);
  stats = recordQuizAnswer(stats, false, 9000);
  stats = recordQuizAnswer(stats, true, 3000);
  assert.deepEqual(stats, { answered: 4, correct: 3, streak: 1, bestStreak: 2, totalMs: 6000 });
  assert.equal(averageResponseMs(stats), 2000);
  assert.equal(recordQuizAnswer(EMPTY_QUIZ_STATS, true, Number.NaN).totalMs, 0);
  assert.equal(quizBestKey({ naturalOnly: true, string: null }), "natural-neck");
  assert.equal(quizBestKey({ naturalOnly: false, string: 6 }), "all-string6");
});
