import type { PracticeSpec, PracticeTarget } from "../audio/practice.ts";

/**
 * The Advanced Lab: scored drills for players past the beginner path.
 *
 * Organized by the eight skill areas a complete guitar education covers:
 * technique, theory, rhythm and timing, ear training, fretboard knowledge,
 * improvisation, repertoire and tone. Every drill runs on the same practice
 * coach as the lessons, so "Practice" waits for each note and "Play" scores
 * the whole pass at tempo.
 *
 * All music here is original. Targets are generated from string and fret so a
 * typo cannot put a note in one place on the diagram and another in the score.
 *
 * What the microphone can judge: single-note pitch (pitch drills) and attack
 * timing (rhythm drills). It cannot hear chord quality, muting, dynamics or
 * tone color, and each drill says so where that matters.
 */

export type SkillAreaId = "technique" | "theory" | "rhythm" | "ear" | "fretboard" | "improvisation" | "repertoire" | "tone";
/**
 * Difficulty, not price: every Advanced Lab drill is free. "Core" drills are the
 * fretboard map every other drill assumes, "Advanced" is the main body of the
 * lab, and "Expert" marks the drills that ask the most of the hands or the ear.
 */
export type DrillTier = "Core" | "Advanced" | "Expert";

export type Drill = {
  id: string;
  area: SkillAreaId;
  tier: DrillTier;
  title: string;
  /** One sentence for cards and the drill page header. */
  summary: string;
  /**
   * Search snippet for the drill page: a keyword-first `title` (the page adds
   * " | GuitarHub", and the whole stays inside 60 characters) and a 140-155
   * character `description` that names the instrument. Pinned by
   * `tests/advanced-lab.test.ts`.
   */
  seo: { title: string; description: string };
  /** Why an advanced player drills this. */
  why: string;
  steps: readonly string[];
  /** Honest scope of the microphone check. */
  measures: string;
  minutes: number;
  spec: PracticeSpec;
};

export const SKILL_AREAS: readonly { id: SkillAreaId; name: string; blurb: string }[] = [
  { id: "technique", name: "Technique", blurb: "Legato, sweeps, string skipping and in-tune bends at tempo." },
  { id: "theory", name: "Theory", blurb: "Arpeggios, guide tones and modes you can hear and play, not just name." },
  { id: "rhythm", name: "Rhythm & timing", blurb: "Syncopated sixteenths, triplets and displaced phrases against a steady grid." },
  { id: "ear", name: "Ear training", blurb: "Hear a sound, then find it on the neck before you look." },
  { id: "fretboard", name: "Fretboard knowledge", blurb: "Every note, every octave, and movable shapes anywhere on the neck." },
  { id: "improvisation", name: "Improvisation", blurb: "Land on chord tones, enclose targets and add color notes on purpose." },
  { id: "repertoire", name: "Repertoire", blurb: "Original etudes that put the skills into complete pieces." },
  { id: "tone", name: "Tone", blurb: "Vibrato control and pick dynamics, the parts of tone your hands own." },
];

/** Open-string MIDI numbers, string 1 (high E) to string 6 (low E). */
const OPEN: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };

type Note = readonly [string: number, fret: number, cue?: string];

/** Evenly spaced single notes, `step` beats apart. */
function notes(list: readonly Note[], step: number): PracticeTarget[] {
  return list.map(([string, fret, cue], index) => ({
    id: `target-${String(index).padStart(2, "0")}`,
    beat: Math.round(index * step * 1000) / 1000,
    midi: OPEN[string] + fret,
    guitarString: string,
    fret,
    ...(cue ? { cue } : {}),
  }));
}

/** Notes at explicit beats, for phrases with long and short values. */
function timedNotes(list: readonly (readonly [string: number, fret: number, beat: number, cue?: string])[]): PracticeTarget[] {
  return list.map(([string, fret, beat, cue], index) => ({
    id: `target-${String(index).padStart(2, "0")}`,
    beat,
    midi: OPEN[string] + fret,
    guitarString: string,
    fret,
    ...(cue ? { cue } : {}),
  }));
}

/** A bend drill: the scored pitch is the bent note, the diagram shows the fretted note. */
function bends(list: readonly (readonly [string: number, fret: number, bentSemitones: number, cue: string])[], step: number): PracticeTarget[] {
  return list.map(([string, fret, up, cue], index) => ({
    id: `target-${String(index).padStart(2, "0")}`,
    beat: index * step,
    midi: OPEN[string] + fret + up,
    guitarString: string,
    fret,
    cue,
  }));
}

/** Attack-timing targets, one bar pattern repeated. */
function rhythm(pattern: readonly (readonly [beat: number, cue: string])[], bars: number, beatsPerBar = 4): PracticeTarget[] {
  const out: PracticeTarget[] = [];
  for (let bar = 0; bar < bars; bar++) for (const [beat, cue] of pattern) {
    out.push({ id: `target-${String(out.length).padStart(2, "0")}`, beat: Math.round((bar * beatsPerBar + beat) * 1000) / 1000, cue });
  }
  return out;
}

/**
 * The authored tempo is the goal tempo, so 100% means the goal everywhere a
 * drill shows a percentage: the tab player's presets, the practice coach's
 * speed slider and the tempo plan. Slower rungs come from
 * `drillTempoPresets` in `tempo-presets.ts`.
 */
function pitchSpec(targets: PracticeTarget[], goal: number, tolerance = 35, passScore = 80): PracticeSpec {
  return { mode: "pitchSequence", bpm: goal, countInBeats: 4, toleranceCents: tolerance, passScore, completionMinimumBPM: goal, revision: 1, targets };
}
function rhythmSpec(targets: PracticeTarget[], goal: number, passScore = 80): PracticeSpec {
  return { mode: "rhythm", bpm: goal, countInBeats: 4, toleranceCents: 35, passScore, completionMinimumBPM: goal, revision: 1, targets };
}

const third = 1 / 3;

export const DRILLS: readonly Drill[] = [
  // ─── Technique ────────────────────────────────────────────────────────
  {
    id: "three-note-legato-g-major", area: "technique", tier: "Advanced", minutes: 8,
    title: "Three Notes a String, G Major",
    summary: "Pick once per string and hammer the next two, up four strings and back.",
    seo: { title: "Three-Note-Per-String Legato Drill in G Major", description: "Free three-notes-per-string guitar legato drill in G major: pick once, hammer twice, pull off on the way down, with live pitch scoring through your mic." },
    why: "Three notes per string covers the neck in fast, even runs without stretching the fretting hand or picking every note. The spot to watch is the third note on each string: it is the second hammer-on or pull-off in a row, so it is where the volume tends to drop.",
    steps: [
      "Fret 3, 5 and 7 on string 6 with fingers 1, 2 and 4. Pick the first note, hammer the other two.",
      "Repeat the pattern on strings 5, 4 and 3 (frets 4, 5, 7 on strings 4 and 3), then come back down using pull-offs.",
      "Keep every note the same volume. If the hammered notes fade, slow the tempo before adding force.",
    ],
    measures: "Pitch of each note in order. It cannot hear whether you picked or hammered, so keep that honest yourself.",
    spec: pitchSpec(notes([
      [6, 3, "Pick"], [6, 5, "Hammer"], [6, 7, "Hammer"], [5, 3, "Pick"], [5, 5, "Hammer"], [5, 7, "Hammer"],
      [4, 4, "Pick"], [4, 5, "Hammer"], [4, 7, "Hammer"], [3, 4, "Pick"], [3, 5, "Hammer"], [3, 7, "Hammer"],
      [3, 5, "Pull-off"], [3, 4, "Pull-off"], [4, 7, "Pick"], [4, 5, "Pull-off"], [4, 4, "Pull-off"],
      [5, 7, "Pick"], [5, 5, "Pull-off"], [5, 3, "Pull-off"], [6, 7, "Pick"], [6, 5, "Pull-off"], [6, 3, "Pull-off"],
    ], .5), 100),
  },
  {
    id: "a-minor-sweep", area: "technique", tier: "Expert", minutes: 8,
    title: "A Minor Sweep, Five Strings",
    summary: "One continuous pick stroke across five strings, each note separate and clean.",
    seo: { title: "A Minor Sweep Picking Drill, Five Strings", description: "Free five-string A minor sweep picking drill for guitar: one pick stroke each way, every note separated, scored live note by note through your microphone." },
    why: "A sweep is one pick stroke that falls through the strings, and it sounds like a clean arpeggio when each note stops as the next one speaks. Played slowly, it builds the rolling fretting-hand mute that keeps the notes apart.",
    steps: [
      "Fret the shape at the 12th position: string 5 fret 12, string 4 fret 10, string 3 fret 9, string 2 fret 10, string 1 fret 8 then 12.",
      "Push the pick through the strings in one downward motion, lifting each finger as soon as its note has sounded.",
      "Come back up with one upward motion. Stay slow enough that the scorer hears each note on its own.",
    ],
    measures: "Pitch of each note in order. Notes that ring together can blur the reading, which is the point of the drill.",
    spec: pitchSpec(notes([
      [5, 12, "Down"], [4, 10, "Down"], [3, 9, "Down"], [2, 10, "Down"], [1, 8, "Down"], [1, 12, "Hammer"],
      [1, 8, "Pull-off"], [2, 10, "Up"], [3, 9, "Up"], [4, 10, "Up"], [5, 12, "Up"],
    ], .5), 96),
  },
  {
    id: "octave-string-skipping", area: "technique", tier: "Advanced", minutes: 6,
    title: "String Skipping in Octaves",
    summary: "Jump over a string on every move: root, octave, third, octave through C, Am, F and G.",
    seo: { title: "Guitar String Skipping Drill in Octaves", description: "Free guitar string skipping drill: root, octave, third and octave through C, Am, F and G with strict alternate picking, scored live through your mic." },
    why: "Skipping strings puts picking accuracy under real pressure, because the pick has to clear a string it is not playing. Octave shapes make the jumps predictable so the right hand can learn them.",
    steps: [
      "For each chord play the root, jump one string to its octave, then the third and its octave. Over F the third is A: open string 5, then string 3 fret 2.",
      "Mute the skipped string with the side of your fretting finger so a stray hit does not ring.",
      "Use strict alternate picking. The scorer hears pitch only, so a missed string shows up as a wrong note.",
    ],
    measures: "Pitch of each note in order.",
    // Revision 2: the F group plays its third (A), as the steps describe.
    spec: { ...pitchSpec(notes([
      [5, 3, "C root"], [3, 5, "Octave"], [4, 2, "Third"], [2, 5, "Octave"],
      [6, 5, "A root"], [4, 7, "Octave"], [5, 3, "Third"], [3, 5, "Octave"],
      [6, 1, "F root"], [4, 3, "Octave"], [5, 0, "Third"], [3, 2, "Octave"],
      [6, 3, "G root"], [4, 5, "Octave"], [5, 2, "Third"], [3, 4, "Octave"],
    ], .5), 100), revision: 2 },
  },
  {
    id: "bends-in-tune", area: "technique", tier: "Advanced", minutes: 6,
    title: "Bends That Land in Tune",
    summary: "Play the target note fretted, then bend from a lower fret up to the exact same pitch, a whole step or a half step.",
    seo: { title: "Guitar String Bending Drill: Bends in Tune", description: "Free guitar string bending drill: hear the fretted target, then bend a whole or half step up to match it. Your microphone checks each bend within 25 cents." },
    why: "An out-of-tune bend is one of the quickest ways for a solo to sound unfinished, and bend pitch is something the microphone measures to within 25 cents. Hearing the fretted target first gives your ear the pitch to aim for.",
    steps: [
      "Play the fretted target (the first note of each pair) and listen to it.",
      "Move two frets lower and bend up a whole step until the pitch matches. On the last pair, move one fret lower (fret 7) and bend up a half step. Push with three fingers, not one.",
      "Hold the bend steady until the coach accepts it. The target is the bent pitch, not the fret you press.",
    ],
    measures: "The pitch you reach, within 25 cents. It cannot tell a slow bend from a fast one.",
    spec: pitchSpec(bends([
      [3, 9, 0, "Target: fret 9"], [3, 7, 2, "Bend fret 7 up a whole step"],
      [2, 10, 0, "Target: fret 10"], [2, 8, 2, "Bend fret 8 up a whole step"],
      [2, 12, 0, "Target: fret 12"], [2, 10, 2, "Bend fret 10 up a whole step"],
      [1, 8, 0, "Target: fret 8"], [1, 7, 1, "Bend fret 7 up a half step"],
    ], 2), 60, 25),
  },

  // ─── Theory ───────────────────────────────────────────────────────────
  {
    id: "ii-v-i-arpeggios", area: "theory", tier: "Advanced", minutes: 7,
    title: "ii–V–I Arpeggios in C",
    summary: "Spell Dm7, G7 and Cmaj7 note by note in one position.",
    seo: { title: "ii–V–I Arpeggios in C: Guitar Theory Drill", description: "Free ii–V–I guitar arpeggio drill in C: spell Dm7, G7 and Cmaj7 note by note in one position, with live pitch scoring that checks every chord tone." },
    why: "The ii–V–I is the central cadence of jazz standards and turns up across soul, bossa nova and pop. Playing each chord as its four notes connects the theory name to the sound and to a place on the neck.",
    steps: [
      "Dm7 is D, F, A, C. G7 is G, B, D, F. Cmaj7 is C, E, G, B.",
      "Say each chord name out loud as you start it, then play its notes low to high.",
      "Notice how few notes change between chords. That is voice leading, and it is next.",
    ],
    measures: "Pitch of each chord tone in order.",
    spec: pitchSpec(notes([
      [5, 5, "Dm7 · D"], [4, 3, "F"], [4, 7, "A"], [3, 5, "C"],
      [6, 3, "G7 · G"], [5, 2, "B"], [5, 5, "D"], [4, 3, "F"],
      [5, 3, "Cmaj7 · C"], [5, 7, "E"], [4, 5, "G"], [3, 4, "B"],
    ], .5), 100),
  },
  {
    id: "guide-tones", area: "theory", tier: "Expert", minutes: 6,
    title: "Guide Tones Through a ii–V–I",
    summary: "Play only the third and seventh of each chord and hear the progression move by half steps.",
    seo: { title: "Guide Tones Guitar Drill: ii–V–I 3rds and 7ths", description: "Free guide tone guitar drill: play only the 3rd and 7th of Dm7, G7 and Cmaj7 and hear the line move by half steps, with live pitch scoring on every note." },
    why: "Thirds and sevenths define a chord's quality. Moving between them by the smallest step is how players outline changes with two notes, and it gives a solo over chord changes a clear melodic spine.",
    steps: [
      "Dm7: F and C. G7: F and B. Cmaj7: E and B.",
      "Hold each pair of notes for a full beat and hear which note stays and which moves a half step.",
      "Loop it until you can sing the moving line before you play it.",
    ],
    measures: "Pitch of each guide tone in order.",
    spec: pitchSpec(notes([
      [4, 3, "Dm7 · 3rd F"], [3, 5, "7th C"], [4, 3, "G7 · 7th F"], [3, 4, "3rd B"], [4, 2, "Cmaj7 · 3rd E"], [3, 4, "7th B"],
      [4, 3, "Dm7 · 3rd F"], [3, 5, "7th C"], [4, 3, "G7 · 7th F"], [3, 4, "3rd B"], [4, 2, "Cmaj7 · 3rd E"], [3, 4, "7th B"],
    ], 1), 80),
  },
  {
    id: "aeolian-vs-dorian", area: "theory", tier: "Advanced", minutes: 6,
    title: "One Root, Two Modes",
    summary: "Play A Aeolian, then A Dorian, and hear what one changed note does.",
    seo: { title: "Aeolian vs Dorian Mode Guitar Drill in A", description: "Free guitar modes drill: play A Aeolian, then A Dorian, and hear the one note that changes, the sixth. Live pitch scoring checks each scale degree." },
    why: "Modes are easiest to hear against a fixed root. Aeolian and Dorian differ by a single note, the sixth, and that one note turns a dark minor sound into a brighter, warmer one.",
    steps: [
      "A Aeolian: A B C D E F G A, starting at string 6 fret 5.",
      "A Dorian: the same, but play F sharp (string 4 fret 4) instead of F.",
      "Play both slowly and listen for the moment the sixth arrives.",
    ],
    measures: "Pitch of each scale degree in order.",
    spec: pitchSpec(notes([
      [6, 5, "Aeolian · A"], [6, 7, "B"], [6, 8, "C"], [5, 5, "D"], [5, 7, "E"], [5, 8, "F (♭6)"], [4, 5, "G"], [4, 7, "A"],
      [6, 5, "Dorian · A"], [6, 7, "B"], [6, 8, "C"], [5, 5, "D"], [5, 7, "E"], [4, 4, "F♯ (6)"], [4, 5, "G"], [4, 7, "A"],
    ], .5), 100),
  },

  // ─── Rhythm & timing ──────────────────────────────────────────────────
  {
    id: "funk-sixteenths", area: "rhythm", tier: "Advanced", minutes: 6,
    title: "Syncopated Sixteenths",
    summary: "Keep your hand moving in sixteenths and let only the written hits sound.",
    seo: { title: "Syncopated Sixteenth Funk Guitar Rhythm Drill", description: "Free funk guitar rhythm drill: keep the strumming hand moving in sixteenths and sound only the syncopated hits. Your mic times every attack live." },
    why: "Funk rhythm guitar rides on a constant sixteenth-note motion in which many strokes deliberately miss the strings. The groove lives in which strokes connect, and attack timing is exactly what the microphone checks.",
    steps: [
      "Move your strumming hand down and up on every sixteenth, all the time, even when you are not hitting.",
      "Let the strings sound only on the cued hits. Mute everything else with your fretting hand resting lightly.",
      "The syncopated hits on the 'a' of the beat are the hard ones. Count 1-e-and-a out loud at first.",
    ],
    measures: "Timing of each attack. It cannot tell a muted scratch from a chord.",
    spec: rhythmSpec(rhythm([[0, "1 · ↓"], [.75, "a · ↑"], [1.5, "& · ↓"], [2, "3 · ↓"], [2.75, "a · ↑"], [3.5, "& · ↓"]], 4), 92),
  },
  {
    id: "quarter-note-triplets", area: "rhythm", tier: "Expert", minutes: 6,
    title: "Three Over Two",
    summary: "Play quarter-note triplets, three even hits across every two beats.",
    seo: { title: "Quarter-Note Triplets Guitar Drill (3 Over 2)", description: "Free quarter-note triplet guitar drill: three even hits across every two beats, the three-over-two feel of blues and soul, timed live by your mic." },
    why: "Quarter-note triplets float across the bar line and are a staple of blues and soul phrasing. They are easy to square off into straight quarters and eighths, and the timing grid shows the moment that happens.",
    steps: [
      "Count eighth-note triplets under your breath: 1-trip-let 2-trip-let.",
      "Hit on 1, on the 'let' of 1, and on the 'trip' of 2. That is three even hits across two beats.",
      "Use a muted strum or a single note. Keep the spacing even rather than landing on the beat.",
    ],
    measures: "Timing of each attack against the triplet grid.",
    spec: rhythmSpec(rhythm([[0, "1"], [2 * third, "let"], [4 * third, "trip"], [2, "3"], [2 + 2 * third, "let"], [2 + 4 * third, "trip"]], 4), 80),
  },
  {
    id: "triplet-sixteenth-shift", area: "rhythm", tier: "Advanced", minutes: 6,
    title: "Gear Shift: Triplets to Sixteenths",
    summary: "One bar of eighth-note triplets, one bar of sixteenths, back and forth.",
    seo: { title: "Triplets to Sixteenths Guitar Rhythm Drill", description: "Free guitar subdivision drill: one bar of eighth-note triplets, one bar of sixteenths, the beat dead still. Your mic times every attack to the grid." },
    why: "Switching subdivisions while the beat stays put is a core test of solid time. The shift into sixteenths is the usual place for the tempo to creep forward.",
    steps: [
      "Bar 1: three even notes per beat. Bar 2: four even notes per beat.",
      "Keep the beat itself dead still. Only the number of notes inside it changes.",
      "Use one muted string and alternate picking so the timing is the only variable.",
    ],
    measures: "Timing of each attack.",
    spec: rhythmSpec(rhythm([
      ...[0, 1, 2, 3].flatMap(beat => [[beat, `${beat + 1}`], [beat + third, "trip"], [beat + 2 * third, "let"]] as [number, string][]),
      ...[0, 1, 2, 3].flatMap(beat => [[4 + beat, `${beat + 1}`], [4 + beat + .25, "e"], [4 + beat + .5, "&"], [4 + beat + .75, "a"]] as [number, string][]),
    ], 2, 8), 72),
  },
  {
    id: "dotted-eighth-displacement", area: "rhythm", tier: "Expert", minutes: 5,
    title: "Dotted-Eighth Displacement",
    summary: "Hits every three sixteenths, so the accent walks across the beat for three bars.",
    seo: { title: "Dotted-Eighth Rhythm Displacement Guitar Drill", description: "Free dotted-eighth guitar rhythm drill: a hit every three sixteenths walks the accent across the beat for three bars, every attack timed by your mic." },
    why: "A figure of three against a pulse of four drives many delay-based guitar parts and a lot of modern riffing. It only works if you keep the four underneath.",
    steps: [
      "Count sixteenths: 1-e-and-a. Hit on every third one.",
      "The hits land on 1, the 'a' of 1, the 'and' of 2, the 'e' of 3, then 4, and so on.",
      "After sixteen hits you arrive back on the downbeat. Tap your foot on the beat the whole time.",
    ],
    measures: "Timing of each attack.",
    spec: rhythmSpec(Array.from({ length: 16 }, (_, index) => ({ id: `target-${String(index).padStart(2, "0")}`, beat: index * .75, cue: index % 4 === 0 ? "Beat" : "Across" })), 90),
  },

  // ─── Ear training ─────────────────────────────────────────────────────
  {
    id: "intervals-from-a", area: "ear", tier: "Advanced", minutes: 7,
    title: "Hear It, Find It: Intervals from A",
    summary: "Press Hear target, then find the note by ear before you look at the diagram.",
    seo: { title: "Guitar Interval Ear Training Drill from A", description: "Free guitar ear training drill: hear a major 3rd, perfect 4th, perfect 5th, major 6th, minor 7th and octave above A, then find each one on the neck by ear." },
    why: "Knowing what an interval sounds like on your own guitar is a big part of playing what you hear. Each pair starts on the same root, so the only new information is the distance.",
    steps: [
      "Press Hear target for each note. Try to find it on the neck without reading the fret number.",
      "Name the interval out loud before you play: major third, perfect fourth, perfect fifth, major sixth, minor seventh, octave.",
      "Only look at the diagram if you have missed twice.",
    ],
    measures: "Pitch of each note. It checks what you found, not how you found it.",
    spec: pitchSpec(notes([
      [6, 5, "Root A"], [5, 4, "Major 3rd"], [6, 5, "Root A"], [5, 5, "Perfect 4th"], [6, 5, "Root A"], [5, 7, "Perfect 5th"],
      [6, 5, "Root A"], [4, 4, "Major 6th"], [6, 5, "Root A"], [4, 5, "Minor 7th"], [6, 5, "Root A"], [4, 7, "Octave"],
    ], 1), 60),
  },
  {
    id: "phrase-by-ear", area: "ear", tier: "Advanced", minutes: 6,
    title: "An Eight-Note Phrase by Ear",
    summary: "An original E minor phrase, learned one note at a time from the reference tone.",
    seo: { title: "Guitar Transcription Drill: Phrase by Ear", description: "Free guitar transcription drill: learn an original eight-note E minor phrase by ear, one reference tone at a time, then play it from memory at tempo." },
    why: "Transcribing builds vocabulary straight from sound. This short original phrase sits in one position, so the only job is hearing the next note.",
    steps: [
      "Hear the first note and find it. Then hear each following note and find it before moving on.",
      "Once all eight are found, play the phrase from memory at tempo in Play mode.",
      "Sing it once before each pass. If you can sing it, your hands find it faster.",
    ],
    measures: "Pitch of each note in order.",
    spec: pitchSpec(notes([[2, 5], [1, 3], [1, 5], [1, 7], [1, 5], [1, 3], [2, 5], [2, 3]].map(([s, f]) => [s, f, "Hear it first"] as const), 1), 80),
  },

  // ─── Fretboard knowledge ──────────────────────────────────────────────
  {
    id: "musical-alphabet-low-e", area: "fretboard", tier: "Core", minutes: 5,
    title: "The Musical Alphabet on One String",
    summary: "Every natural note on string 6, up to the 12th fret and back down.",
    seo: { title: "Low E String Notes: Guitar Fretboard Drill", description: "Free guitar fretboard drill: play every natural note on the low E string up to the 12th fret and back, naming each one, with live pitch scoring." },
    why: "Power chords and the main barre chord shapes take their root from string 6 or 5. Knowing the natural notes on the low E string instantly is the map the rest of the fretboard work builds on.",
    steps: [
      "The notes go E F G A B C D E. There is no sharp between E and F or between B and C, so those are one fret apart.",
      "Say each note name as you play it, up to fret 12 and back.",
      "When it is easy, skip the diagram and play it from the names alone.",
    ],
    measures: "Pitch of each note in order.",
    spec: pitchSpec(notes([
      [6, 0, "E"], [6, 1, "F"], [6, 3, "G"], [6, 5, "A"], [6, 7, "B"], [6, 8, "C"], [6, 10, "D"], [6, 12, "E"],
      [6, 10, "D"], [6, 8, "C"], [6, 7, "B"], [6, 5, "A"], [6, 3, "G"], [6, 1, "F"], [6, 0, "E"],
    ], 1), 80),
  },
  {
    id: "movable-shape-roots", area: "fretboard", tier: "Core", minutes: 5,
    title: "Your First Movable Shape",
    summary: "Find the root on string 6 or 5 for eight chords, the way you would place a power or barre chord.",
    seo: { title: "Guitar Chord Roots on Strings 6 and 5 Drill", description: "Free guitar fretboard drill: place the roots of eight chords on string 6 or 5, the way you set up a power or barre chord, with live pitch scoring." },
    why: "A movable shape is only useful if you can put its root on the right fret without hunting. This drill is that placement, one root at a time.",
    steps: [
      "Each cue names a chord. Find its root on string 6 or 5 as shown.",
      "Once each root is solid, play a two-note power chord on it (root plus the note two frets higher on the next string).",
      "The scorer listens for the root, so play the root alone first on each pass.",
    ],
    measures: "Pitch of each root in order. It cannot judge the full chord.",
    spec: pitchSpec(notes([[6, 3, "G"], [5, 3, "C"], [6, 5, "A"], [5, 5, "D"], [5, 7, "E"], [6, 7, "B"], [6, 1, "F"], [6, 8, "C"]], 1), 80),
  },
  {
    id: "every-c", area: "fretboard", tier: "Advanced", minutes: 6,
    title: "Find Every C",
    summary: "The same note in seven places across three octaves.",
    seo: { title: "Find Every C on the Guitar Fretboard Drill", description: "Free guitar fretboard drill: find the note C in seven places across three octaves with octave shapes. Live pitch scoring checks the note and octave." },
    why: "Players who know the neck see one note in all its places at once. Once you can find every C, every chord and scale built on C has more than one home.",
    steps: [
      "Find each C where the cue says, switching octave on almost every note.",
      "Before each move, picture where the next C is. Use octave shapes: from string 6 or 5, two strings over and two frets up; from string 4 or 3, two strings over and three frets up, because the G and B strings are tuned a major third apart instead of a fourth.",
      "Repeat with another note on your own once this one is automatic.",
    ],
    measures: "Pitch and octave of each note.",
    spec: pitchSpec(notes([[5, 3, "C3"], [3, 5, "C4"], [6, 8, "C3"], [4, 10, "C4"], [1, 8, "C5"], [2, 1, "C4"], [2, 13, "C5"]], 1), 72),
  },

  // ─── Improvisation ────────────────────────────────────────────────────
  {
    id: "blues-landing-notes", area: "improvisation", tier: "Advanced", minutes: 7,
    title: "Land on the Chord Tone",
    summary: "Short blues phrases that resolve to the third of A7, D7 and E7.",
    seo: { title: "Blues Guitar Chord Tone Drill: A7, D7, E7", description: "Free blues guitar improvisation drill: short phrases that resolve to the major third of A7, D7 and E7, with live pitch scoring on every note you land on." },
    why: "The minor pentatonic works over a blues, but phrases sound deliberate when they land on the chord of the moment. The major third of each chord is a strong landing because it names the chord's quality.",
    steps: [
      "Over A7, slide from C to C sharp, the third of A.",
      "Over D7, land on F sharp. Over E7, land on G sharp.",
      "Play each phrase, then improvise your own that ends on the same landing note.",
    ],
    measures: "Pitch of each note in order.",
    spec: pitchSpec(notes([
      [3, 5, "A7 · C"], [3, 6, "C♯ (3rd)"], [2, 5, "E"], [1, 5, "A"],
      [2, 8, "D7 · G"], [2, 7, "F♯ (3rd)"], [3, 7, "D"], [4, 7, "A"],
      [2, 5, "E7 · E"], [3, 7, "D"], [3, 4, "B"], [4, 6, "G♯ (3rd)"],
    ], .5), 96),
  },
  {
    id: "enclosures", area: "improvisation", tier: "Expert", minutes: 6,
    title: "Enclosures",
    summary: "Approach each target from the note above and a half step below, then land on it.",
    seo: { title: "Guitar Enclosures Drill: Bebop Target Notes", description: "Free guitar enclosure drill: approach C♯, F♯, A and E from above and below, then land on the target. The bebop move, with live pitch scoring." },
    why: "An enclosure surrounds a target note before playing it. It is the bebop move that makes lines sound like they know where they are going, and it carries straight over into blues, rock and fusion lines.",
    steps: [
      "Each group of three ends on a target: C sharp, F sharp, A and E.",
      "Play the note above, the note below, then the target. The target gets the accent.",
      "Try enclosing any chord tone in your own solos once this feels natural.",
    ],
    measures: "Pitch of each note in order.",
    spec: pitchSpec(notes([
      [3, 7, "Above"], [3, 5, "Below"], [3, 6, "C♯"], [2, 8, "Above"], [2, 6, "Below"], [2, 7, "F♯"],
      [4, 8, "Above"], [4, 6, "Below"], [4, 7, "A"], [2, 6, "Above"], [2, 4, "Below"], [2, 5, "E"],
    ], .5), 100),
  },
  {
    id: "dorian-color", area: "improvisation", tier: "Advanced", minutes: 5,
    title: "Add the Dorian Sixth",
    summary: "A minor pentatonic phrase with one added note, F sharp, that changes its color.",
    seo: { title: "Dorian Sixth Guitar Improvisation Drill in A", description: "Free guitar improvisation drill: add the Dorian major sixth, F♯, to A minor pentatonic and hear the color change, with live pitch scoring on each note." },
    why: "Adding one note to a scale you already own is a quick route to a new sound. The major sixth over a minor chord is the sound of a lot of soul, funk and jazz-rock soloing.",
    steps: [
      "Play the phrase and listen for the F sharp on string 2 fret 7.",
      "Loop it and improvise with the pentatonic, adding F sharp on purpose.",
      "Resolve to A or C, not to F sharp. The sixth is color, not home.",
    ],
    measures: "Pitch of each note in order.",
    spec: pitchSpec(notes([[4, 7, "A"], [3, 5, "C"], [3, 7, "D"], [2, 5, "E"], [2, 7, "F♯ (6)"], [2, 5, "E"], [3, 7, "D"], [3, 5, "C"], [4, 7, "A"]], .5), 96),
  },

  // ─── Repertoire ───────────────────────────────────────────────────────
  {
    id: "night-drive-etude", area: "repertoire", tier: "Advanced", minutes: 8,
    title: "Night Drive, an E Minor Etude",
    summary: "An original sixteen-note melody with long and short notes, played in time.",
    seo: { title: "E Minor Guitar Etude: Night Drive Melody", description: "Free E minor guitar etude: an original sixteen-note melody mixing held and quick notes. Learn it note by note, then play it in time with live scoring." },
    why: "Drills build parts; pieces build playing. This short original melody mixes held notes with quick ones, so it tests phrasing and time together.",
    steps: [
      "Learn it in Practice mode, one note at a time.",
      "In Play mode, let the long notes ring their full length. Rushing them is the mistake to catch.",
      "Add vibrato to the held notes once the timing is solid.",
    ],
    measures: "Pitch of each note and when it lands.",
    spec: pitchSpec(timedNotes([
      [2, 5, 0], [1, 3, 1], [1, 7, 2], [1, 5, 3.5], [1, 3, 4], [2, 5, 5], [2, 3, 6],
      [2, 5, 8], [1, 3, 9], [1, 5, 10], [1, 7, 11], [1, 8, 11.5], [1, 7, 12], [1, 5, 13], [1, 3, 14], [2, 5, 15],
    ]), 88),
  },
  {
    id: "alternating-bass-etude", area: "repertoire", tier: "Advanced", minutes: 8,
    title: "Alternating Bass Etude",
    summary: "Thumb on the bass, fingers on the melody, over C and G.",
    seo: { title: "Alternating Bass Fingerstyle Guitar Etude", description: "Free fingerstyle guitar etude: your thumb alternates the bass while your fingers play the melody over C and G, with live scoring on each note." },
    why: "Alternating bass fingerstyle is a two-part texture played by one hand. Keeping the thumb perfectly steady while the fingers play a melody is a core independence skill in fingerstyle guitar.",
    steps: [
      "Your thumb plays every beat, alternating between two bass strings. Your fingers play the notes in between.",
      "Hold the C chord shape for bar 1 and G for bar 2 so notes can ring.",
      "Play single notes cleanly at first. The scorer follows the note sequence, one at a time.",
    ],
    measures: "Pitch of each note in order. It hears one note at a time, not the ringing chord.",
    spec: pitchSpec(timedNotes([
      [5, 3, 0, "Thumb"], [1, 0, .5, "Finger"], [4, 2, 1, "Thumb"], [2, 1, 1.5, "Finger"], [5, 3, 2, "Thumb"], [2, 3, 2.5, "Finger"], [4, 2, 3, "Thumb"], [2, 1, 3.5, "Finger"],
      [6, 3, 4, "Thumb"], [2, 3, 4.5, "Finger"], [5, 2, 5, "Thumb"], [2, 0, 5.5, "Finger"], [6, 3, 6, "Thumb"], [2, 3, 6.5, "Finger"], [5, 2, 7, "Thumb"], [3, 0, 7.5, "Finger"],
    ]), 80),
  },

  // ─── Tone ─────────────────────────────────────────────────────────────
  {
    id: "controlled-vibrato", area: "tone", tier: "Advanced", minutes: 5,
    title: "Controlled Vibrato",
    summary: "Four long notes with vibrato that stays recognizably on pitch.",
    seo: { title: "Guitar Vibrato Drill: Controlled Pitch", description: "Free guitar vibrato drill: four held notes with even bend vibrato that returns to pitch. Your mic checks that each note stays within 40 cents." },
    why: "Vibrato is one of the most personal parts of tone. Wide and slow or narrow and fast are both good choices; drifting sharp and staying there is not.",
    steps: [
      "Hold each note for four beats and add vibrato after the first beat.",
      "Push the string up and let it return to the fretted pitch. Bend vibrato on a fretted string can only raise the pitch, so the note moves between the fretted pitch and slightly above it.",
      "Keep the rhythm of the vibrato even. Record yourself once to hear what the room hears.",
    ],
    measures: "Whether each note stays within 40 cents of pitch. It cannot rate vibrato speed or width as good or bad.",
    spec: pitchSpec(notes([[2, 8, "Hold · vibrato"], [1, 5, "Hold · vibrato"], [3, 9, "Hold · vibrato"], [1, 7, "Hold · vibrato"]], 4), 70, 40),
  },
  {
    id: "pick-dynamics", area: "tone", tier: "Advanced", minutes: 5,
    title: "Dynamics Without Rushing",
    summary: "Alternate soft and loud bars while the timing stays exactly the same.",
    seo: { title: "Guitar Picking Dynamics Drill: Soft and Loud", description: "Free guitar picking dynamics drill: alternate soft and loud bars of quarter notes while your timing stays locked. Your mic times every attack live." },
    why: "Playing loud tends to pull the tempo forward and playing soft tends to drag it. Dynamics are a tone control you already own, as long as they do not move the time.",
    steps: [
      "Play one bar of quarter notes very softly, then one bar hard, and repeat.",
      "Change only how deep the pick goes into the string. Keep the motion the same size.",
      "Listen back to check the soft bars are truly soft. The coach checks the timing.",
    ],
    measures: "Timing of each attack. It cannot measure how loud each note is.",
    spec: rhythmSpec(rhythm([[0, "Soft"], [1, "Soft"], [2, "Soft"], [3, "Soft"], [4, "Loud"], [5, "Loud"], [6, "Loud"], [7, "Loud"]], 2, 8), 100),
  },
];

export function drillsForArea(area: SkillAreaId) { return DRILLS.filter(drill => drill.area === area); }
export function getDrill(id: string) { return DRILLS.find(drill => drill.id === id); }
export function skillArea(id: SkillAreaId) { return SKILL_AREAS.find(area => area.id === id)!; }
export const ADVANCED_PATH = "/advanced";
export function drillHref(id: string) { return `${ADVANCED_PATH}/${id}`; }
