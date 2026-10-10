/**
 * Drill-specific teaching for every Advanced Lab drill page: three common
 * mistakes with their fixes, a three-stage tempo plan, a way to use the drill
 * in real playing, a variation, and related drills and guides.
 *
 * Every note, string, fret and interval named here is checked against the
 * drill's exercise map (`spec.targets` in `drills.ts`), and the tempo plan
 * names no BPM of its own: the numbers come from `drillTempoPresets`, so the
 * copy cannot drift from the drill's goal. Pinned by
 * `tests/advanced-lab.test.ts`.
 */

export type DrillMistake = {
  /** The mistake, short enough for a heading. */
  mistake: string;
  /** What to do instead. */
  fix: string;
};

export type DrillTeaching = {
  mistakes: readonly [DrillMistake, DrillMistake, DrillMistake];
  /** Focus at the Learn, Build and Goal presets. No tempo numbers here. */
  tempo: { learn: string; build: string; goal: string };
  /** How the drill shows up in real playing. */
  music: string;
  /** One way to change the drill once it is solid. */
  variation: string;
  /** Two or three other drill ids. */
  relatedDrills: readonly string[];
  /** One or two guide paths from `GUIDES` in `lib/site.ts`. */
  relatedGuides: readonly string[];
};

export const DRILL_TEACHING: Readonly<Record<string, DrillTeaching>> = {
  // ─── Technique ────────────────────────────────────────────────────────
  "three-note-legato-g-major": {
    mistakes: [
      {
        mistake: "The third note on each string fades",
        fix: "Hammer from just above the string with the fingertip and land right behind the fret wire. Play B on string 6 fret 7 and D on string 3 fret 7 on their own, then make the hammered version match the picked note's volume.",
      },
      {
        mistake: "The picked note at each string change lands early",
        fix: "After two legato notes the picking hand has been idle, so it tends to jump in. Count the eighths out loud and loop one crossing, B on string 6 fret 7 into C on string 5 fret 3, until the pick lands squarely on the count.",
      },
      {
        mistake: "Pull-offs drag the string sideways on the way down",
        fix: "Pull slightly down toward the floor so the string snaps off cleanly instead of bending sharp. Plant fingers 1 and 2 at frets 4 and 5 on string 3 before the pinky lets go of D, so C and B are already waiting.",
      },
    ],
    tempo: {
      learn: "Set the fingering: 1, 2 and 4 on every string, one pick stroke per string, and say \"pick, hammer, hammer\" as you go.",
      build: "Loop the turnaround on string 3, where the line peaks on D and starts pulling off, until the climb and the descent sound like one phrase.",
      goal: "All 23 notes at one volume. If the hammered notes thin out, drop to Push for two passes and come back.",
    },
    music: "Three-notes-per-string runs are how rock and fusion players cover a scale at speed. Every note in this pattern belongs to G major, which shares its notes with E minor, so the same run works as a fast fill over an Em chord as well as over G.",
    variation: "Move the whole pattern up two frets and it becomes A major: A, B and C sharp on string 6, D, E and F sharp on string 5. Then phrase it in groups of four so the picked note lands on a different part of the beat on every string.",
    relatedDrills: ["octave-string-skipping", "a-minor-sweep", "aeolian-vs-dorian"],
    relatedGuides: ["/how-to-practice-guitar-scales", "/why-cant-i-play-guitar-fast"],
  },
  "a-minor-sweep": {
    mistakes: [
      {
        mistake: "The notes ring together into a chord",
        fix: "Lift each fretting finger as soon as the next string sounds, so only one note rings at a time. If the coach hesitates on a note, the previous one is usually still ringing underneath it.",
      },
      {
        mistake: "Picking each string as a separate stroke",
        fix: "Let the pick come to rest on the next string after each note, then push through. The five notes from string 5 to string 1 are one downward push, and the four notes from string 2 back to string 5 are one upward push.",
      },
      {
        mistake: "A weak pull-off at the top of the shape",
        fix: "Keep the index finger planted on string 1 fret 8 while the pinky hammers fret 12, so the pull-off from E back to C has a fretted note to land on and the turnaround stays in time.",
      },
    ],
    tempo: {
      learn: "Treat every note as its own event. The coach should hear eleven separate notes: A, C, E, A, C, E on the way up and C, A, E, C, A on the way down.",
      build: "Join the strokes so the pick falls from string to string in one motion. At the top, the hammer-on and pull-off take over while the pick waits for the up sweep.",
      goal: "The five down-swept notes take two and a half beats. Keep that motion one smooth push, not five small ones.",
    },
    music: "Sweeps are a staple of neoclassical and metal soloing. This A minor shape works as a fast fill over an Am chord or as the climax of a phrase in A minor; finish on the low A at string 5 fret 12 so the run resolves.",
    variation: "Move the whole shape down five frets, starting on string 5 fret 7, and it becomes an E minor sweep: E, G, B, E, G, B. Alternate the A minor and E minor shapes for a i–v movement in A minor.",
    relatedDrills: ["three-note-legato-g-major", "ii-v-i-arpeggios", "octave-string-skipping"],
    relatedGuides: ["/why-cant-i-play-guitar-fast", "/practicing-guitar-with-a-metronome"],
  },
  "octave-string-skipping": {
    mistakes: [
      {
        mistake: "The skipped string rings",
        fix: "Let the finger on the lower note lean just enough to touch the string above it, and rest the picking-hand palm near the bridge. Any stray hit is then a dead click instead of a wrong note.",
      },
      {
        mistake: "The up stroke misses the octave",
        fix: "With strict alternate picking, every skip goes from a down stroke on the root to an up stroke on the octave, so the pick has to travel across the skipped string between strokes. Loop the first two notes, C on string 5 fret 3 to C on string 3 fret 5, until that travel is small and exact.",
      },
      {
        mistake: "The open A keeps ringing in the F group",
        fix: "Over F the third is the open A string, followed by A on string 3 fret 2. Touch string 5 with the picking-hand palm or a fretting finger as you play string 3, so the two A notes do not blur together.",
      },
    ],
    tempo: {
      learn: "Say the chord name at the start of each group and listen for silence on every skipped string.",
      build: "Plan the next root during the last octave of each group: C on string 5 fret 3, A on string 6 fret 5, F on string 6 fret 1, G on string 6 fret 3.",
      goal: "Sixteen eighth notes with no stray string noise, including the change into the F group.",
    },
    music: "C, Am, F and G are the I–vi–IV–V progression in C, so this drill is already a picked accompaniment part. Play it under a singer or over a strummed track, or keep only the roots and octaves for a bass-style figure.",
    variation: "Swap each third for the fifth and keep the same octave shapes. Over C that means G on string 4 fret 5 and its octave on string 2 fret 8, three frets up because the octave crosses from string 4 to string 2.",
    relatedDrills: ["three-note-legato-g-major", "every-c", "movable-shape-roots"],
    relatedGuides: ["/learn-guitar-fretboard-notes", "/why-cant-i-play-guitar-fast"],
  },
  "bends-in-tune": {
    mistakes: [
      {
        mistake: "Whole-step bends stop short of the target",
        fix: "Undershooting is the miss to listen for. Play the fretted target, then bend until the bent note and the memory of the target sound like one pitch. The coach accepts the bend within 25 cents.",
      },
      {
        mistake: "Bending with one finger",
        fix: "Put the ring finger on the bend fret with the middle and index fingers behind it on the same string, and turn the wrist as if turning a key. Three fingers give the control to stop exactly on pitch.",
      },
      {
        mistake: "Overshooting the half-step bend",
        fix: "The last pair needs only a half step: string 1 fret 7 is B, and bending it to C needs half the push of the whole-step bends before it. Play C at fret 8 first and aim for exactly that.",
      },
    ],
    tempo: {
      learn: "Each note gets two beats. Use the first to reach the pitch and the second to hold it steady.",
      build: "Reach the pitch in one smooth push instead of creeping up to it.",
      goal: "Every bend in tune within the first beat and held through the second, all four pairs in a row.",
    },
    music: "These bends sit in A minor territory. D bent up to E on string 3 is the fourth bent to the fifth, and G bent up to A on string 2 is the flat seventh bent to the root: two staple bends in blues and rock soloing.",
    variation: "Try a pre-bend: bend string 3 fret 7 up a whole step without picking, pick the bent note, then release it back down to D. The release has to land in tune too.",
    relatedDrills: ["controlled-vibrato", "blues-landing-notes", "intervals-from-a"],
    relatedGuides: ["/how-to-practice-guitar-improvisation", "/record-guitar-practice-on-phone"],
  },

  // ─── Theory ───────────────────────────────────────────────────────────
  "ii-v-i-arpeggios": {
    mistakes: [
      {
        mistake: "Playing the wrong seventh by habit",
        fix: "Cmaj7 takes B natural, string 3 fret 4; B flat would turn it into C7. G7 takes F natural on string 4 fret 3, the same F that sits in Dm7.",
      },
      {
        mistake: "Jumping position for every chord",
        fix: "All twelve notes sit between fret 2 and fret 7. Keep the hand in that area and reach rather than shift; the widest moves are G7's root on string 6 fret 3 and its third, B, on string 5 fret 2.",
      },
      {
        mistake: "Pausing at each chord change",
        fix: "Each chord lasts two beats, four eighth notes, and the next arpeggio starts on the very next eighth. Keep the line moving from C at the top of Dm7 straight into G, the root of G7.",
      },
    ],
    tempo: {
      learn: "Say the chord name as its root sounds, and name each note as root, third, fifth or seventh.",
      build: "Loop the G7 to Cmaj7 change, the V–I, until the resolution to C sounds like arriving home.",
      goal: "The full line without a pause at either chord change.",
    },
    music: "Loop Dm7, G7 and Cmaj7 for two beats each and play each arpeggio as its chord sounds. Chord tones on the beat are how jazz players outline the harmony, so the progression stays audible even with no chords underneath. Each arpeggio starts on its root on a strong beat, D, then G, then C, so the bass movement is audible inside the single line.",
    variation: "Play each arpeggio from the top down: C, A, F, D for Dm7, F, D, B, G for G7, and B, G, E, C for Cmaj7. Then move everything up two frets for Em7, A7 and Dmaj7, the ii–V–I in D.",
    relatedDrills: ["guide-tones", "aeolian-vs-dorian", "enclosures"],
    relatedGuides: ["/how-to-practice-guitar-improvisation", "/learn-guitar-fretboard-notes"],
  },
  "guide-tones": {
    mistakes: [
      {
        mistake: "Moving a finger that should stay put",
        fix: "F stays on string 4 fret 3 from Dm7 to G7, and B stays on string 3 fret 4 from G7 to Cmaj7. Leave the finger down on the shared note; only one finger moves at each change.",
      },
      {
        mistake: "Losing track of which note is the third",
        fix: "Say it as you play. F is the third of Dm7, but over G7 the same F is the seventh. The note stays and its job changes, which is the whole idea of guide tones.",
      },
      {
        mistake: "Playing pairs without hearing the line",
        fix: "Sing the moving voice: C down to B, then F down to E. Those two half steps are what make the progression sound like it resolves.",
      },
    ],
    tempo: {
      learn: "Let every note ring its full beat and listen for which voice moved.",
      build: "Hear the drill as two voices: string 4 plays F, F, E and string 3 plays C, B, B.",
      goal: "Twelve even quarter notes, two passes through the progression, with no hitch at the repeat from B back to F.",
    },
    music: "Strum each pair together as a two-note chord, F and C, then F and B, then E and B, and you have a sparse jazz comping part. Guide tones also give a solo its skeleton over changes.",
    variation: "Use the top voice, C to B to B, as the frame for a solo: improvise freely, but arrive on that note each time a new chord starts. Then do the same with the lower voice, F to F to E.",
    relatedDrills: ["ii-v-i-arpeggios", "blues-landing-notes", "enclosures"],
    relatedGuides: ["/how-to-practice-guitar-improvisation"],
  },
  "aeolian-vs-dorian": {
    mistakes: [
      {
        mistake: "Stretching for F sharp on string 5",
        fix: "F sharp is also at string 5 fret 9, but reaching for it pulls the hand out of position. Take it on string 4 fret 4 with the first finger, as the drill does, and the hand stays at the fifth fret.",
      },
      {
        mistake: "Running both scales without hearing the change",
        fix: "Stop on the sixth. Hold F in the first pass and F sharp in the second against a drone on A, from a backing track or a recorded open A string, and hear the color shift.",
      },
      {
        mistake: "Thinking of A Dorian as G major from A",
        fix: "That finds the right notes but hides the sound. Hear A as home in both: Aeolian is A minor with F, Dorian is A minor with F sharp.",
      },
    ],
    tempo: {
      learn: "Say \"flat six\" on F and \"six\" on F sharp as you play them.",
      build: "Join the scales: the Dorian pass starts on the very next eighth after the Aeolian octave.",
      goal: "Sixteen eighth notes, with the drop from the top A on string 4 back to the low A on string 6 landing cleanly.",
    },
    music: "Over an Am to D vamp, the D chord contains F sharp, so Dorian fits it note for note. Over Am to F, the F chord calls for Aeolian. Matching the sixth to the chord is how you pick the mode in real songs.",
    variation: "Run the same comparison from D, starting on string 5 fret 5: D Aeolian has B flat, D Dorian has B natural. One changed note, same lesson, new key.",
    relatedDrills: ["dorian-color", "ii-v-i-arpeggios", "intervals-from-a"],
    relatedGuides: ["/how-to-practice-guitar-scales", "/how-to-practice-guitar-improvisation"],
  },

  // ─── Rhythm & timing ──────────────────────────────────────────────────
  "funk-sixteenths": {
    mistakes: [
      {
        mistake: "The strumming hand stops between hits",
        fix: "Keep the down-up motion going through all sixteen sixteenths of each bar, passing just over the strings on the silent ones. The two up-stroke hits only line up if the hand never stops.",
      },
      {
        mistake: "The 'a' hits land early",
        fix: "The 'a' is the last sixteenth before the next beat. Count 1-e-and-a out loud and place the up stroke one sixteenth before beat 2, and again one sixteenth before beat 4.",
      },
      {
        mistake: "Strings ring through the gaps",
        fix: "Release fretting-hand pressure right after each hit so the strings go dead. Lift the fingers just off the frets without leaving the strings, so the hand stays ready for the next hit. The groove comes from short hits and clear silences.",
      },
    ],
    tempo: {
      learn: "Practice mode keeps the microphone off and plays a metronome, so count out loud and lock in the motion first.",
      build: "Move to Play · full check and keep the wrist loose; tension is what makes the up strokes rush.",
      goal: "Four bars, 24 hits, with the motion still relaxed at the end.",
    },
    music: "This is a complete funk rhythm part. Play the hits on a small chord shape such as E9 or Em7 on the middle strings, keep everything else muted, and loop it under a bass line or drum loop. The 'and' hits are down strokes and carry naturally; keep the two 'a' up strokes a little lighter for a push-and-pull feel.",
    variation: "Add a muted scratch on beats 2 and 4, the backbeat, which this pattern leaves open. The chord hits stay where they are and the part gains a snare-like pulse.",
    relatedDrills: ["triplet-sixteenth-shift", "dotted-eighth-displacement", "pick-dynamics"],
    relatedGuides: ["/how-to-practice-strumming", "/practicing-guitar-with-a-metronome"],
  },
  "quarter-note-triplets": {
    mistakes: [
      {
        mistake: "The middle hits snap to the eighth-note grid",
        fix: "The second hit drifts toward the 'and' of 1 and the third toward beat 2. They belong to neither: the second comes just after the 'and' of 1, the third a third of a beat after beat 2.",
      },
      {
        mistake: "The foot follows the hits",
        fix: "Tap all four beats. Only two hits per bar land with your foot, on beats 1 and 3; the other four fall between taps. If the foot starts tapping on every hit, slow down to the Learn rung and tap first.",
      },
      {
        mistake: "Feeling it without counting",
        fix: "Count eighth-note triplets, 1-trip-let 2-trip-let, and hit every other syllable: 1, let, trip, then 3, let, trip.",
      },
    ],
    tempo: {
      learn: "Start in the rhythm player's Tap along mode. It needs no microphone and scores each tap against the grid.",
      build: "Move to the guitar on a muted string so only the attack counts, still counting triplets under your breath.",
      goal: "Twenty-four evenly spaced hits over four bars, with beats 1 and 3 still landing on your foot.",
    },
    music: "Quarter-note triplets are how a blues or soul phrase stretches across the beat. End a phrase with three notes from A minor pentatonic, such as A, C and D, played as one quarter-note triplet; the line sounds unhurried while the band keeps time.",
    variation: "Play half-note triplets: three even hits across a full bar. They are every other hit of this drill, so the grid you just learned already contains them. Then put a chord change on beat 3: the fourth hit of each bar lands right on the change, a reliable anchor.",
    relatedDrills: ["triplet-sixteenth-shift", "dotted-eighth-displacement", "funk-sixteenths"],
    relatedGuides: ["/practicing-guitar-with-a-metronome"],
  },
  "triplet-sixteenth-shift": {
    mistakes: [
      {
        mistake: "Speeding up at the switch into sixteenths",
        fix: "The first sixteenth of the new bar lands exactly on beat 1; only the notes after it are closer together. Say \"one-e-and-a\" across the bar line and keep the foot steady. If the sixteenth bar still rushes, loop just the last triplet beat into the first sixteenth beat until both beats feel equally long.",
      },
      {
        mistake: "Triplets that limp",
        fix: "Uneven triplets turn into a swing feel. Accent the first note of each group lightly and keep \"trip\" and \"let\" exactly as long as the beat note.",
      },
      {
        mistake: "The picking direction surprises you",
        fix: "With strict alternate picking, triplets start beats 1 and 3 with a down stroke and beats 2 and 4 with an up stroke, while sixteenths start every beat with a down stroke. Expect that flip and practice it.",
      },
    ],
    tempo: {
      learn: "Use Tap along first, then a single muted string, counting the bar's subdivision out loud.",
      build: "Loop the bar line from triplets into sixteenths. That crossing is where the tempo tries to creep forward.",
      goal: "Fifty-six attacks over four bars on a beat that never moves.",
    },
    music: "Changing subdivision is how a solo builds intensity without a tempo change: phrase in triplets, then break into sixteenths for the climax. Run the drill on A minor pentatonic notes and it becomes a lead line. Start on the low A at string 6 fret 5 and walk up the box, one scale note per attack.",
    variation: "Add a bar of plain eighth notes at the start, so the line climbs from two notes per beat to three to four, then back down.",
    relatedDrills: ["quarter-note-triplets", "funk-sixteenths", "pick-dynamics"],
    relatedGuides: ["/practicing-guitar-with-a-metronome", "/why-cant-i-play-guitar-fast"],
  },
  "dotted-eighth-displacement": {
    mistakes: [
      {
        mistake: "The hits become the beat",
        fix: "Tap your foot on every beat and keep it there. Only every fourth hit lands with the foot: beat 1, then beat 4, then beat 3 of bar 2, then beat 2 of bar 3.",
      },
      {
        mistake: "Sliding into a straight eighth-note feel",
        fix: "Count every sixteenth, 1-e-and-a, and hit on every third syllable. The space between hits is three sixteenths, not two. Stress every hit slightly and feel it as a cycle of three running against the four of the bar.",
      },
      {
        mistake: "Getting lost in bar 2 or 3",
        fix: "Learn the landmarks. If the hits on beat 4 of bar 1, beat 3 of bar 2 and beat 2 of bar 3 line up with your foot, everything between them is spacing.",
      },
    ],
    tempo: {
      learn: "Tap along in the rhythm player and say the sixteenth count out loud.",
      build: "Play the hits on a muted string and check that each \"Beat\" cue lines up with your foot.",
      goal: "Sixteen hits in three bars, so the next hit would arrive exactly on the following downbeat.",
    },
    music: "A dotted-eighth delay repeats each note three sixteenths later, the same distance this drill trains, so the echoes interlock with your picking. Playing the figure by hand builds the feel behind riffs that cross the bar line.",
    variation: "Turn the hits into a riff by alternating two notes, the open low E and G on string 6 fret 3. The two notes repeat every two hits while the hits take three bars to cycle back to the downbeat, so the three-against-four is easy to hear.",
    relatedDrills: ["funk-sixteenths", "quarter-note-triplets", "triplet-sixteenth-shift"],
    relatedGuides: ["/practicing-guitar-with-a-metronome"],
  },

  // ─── Ear training ─────────────────────────────────────────────────────
  "intervals-from-a": {
    mistakes: [
      {
        mistake: "Finding the note by shape instead of by ear",
        fix: "Hear the target, sing it, then search by sound: play a note, compare, move a fret. The shapes are the reward at the end, not the method.",
      },
      {
        mistake: "Confusing the fourth and the fifth",
        fix: "The fourth, D, sits directly across from the root on string 5 fret 5; the fifth, E, is two frets higher at fret 7. By ear the fourth sounds unresolved and the fifth sounds stable and open.",
      },
      {
        mistake: "Mixing up the major sixth and minor seventh",
        fix: "They are one fret apart on string 4: F sharp at fret 4, G at fret 5. The minor seventh carries the pull of a dominant chord; the major sixth sounds sweeter.",
      },
    ],
    tempo: {
      learn: "Practice mode waits for each note, so press Hear target before every interval and take the time you need.",
      build: "Play each root and interval as a pair without looking at the diagram.",
      goal: "One note per beat, root and interval alternating, twelve notes without a miss.",
    },
    music: "Intervals are the link between hearing a melody and playing it. Twinkle, Twinkle, Little Star opens with a perfect fifth, Here Comes the Bride with a perfect fourth, and Somewhere Over the Rainbow with an octave. When the Saints Go Marching In opens with a major third, and My Bonnie Lies Over the Ocean with a major sixth. When a tune jumps, name the jump, then find it from the note you are on.",
    variation: "Run it from another root. From C on string 5 fret 3, the same six intervals are E, F, G, A, B flat and C.",
    relatedDrills: ["phrase-by-ear", "every-c", "aeolian-vs-dorian"],
    relatedGuides: ["/learn-guitar-fretboard-notes", "/how-to-practice-guitar-improvisation"],
  },
  "phrase-by-ear": {
    mistakes: [
      {
        mistake: "Checking the diagram before guessing",
        fix: "Hear the note, sing it, find it, then check. Humming is enough; what matters is that you hold the pitch in your head while you search. The ear only grows when the guess comes before the answer.",
      },
      {
        mistake: "The right note in the wrong octave",
        fix: "The whole phrase sits on strings 1 and 2 between fret 3 and fret 7. If the note name is right but the coach keeps waiting, move up or down an octave.",
      },
      {
        mistake: "Learning eight notes instead of one phrase",
        fix: "Once you have three notes, play them together before hearing the fourth. The phrase rises E, G, A, B, falls back A, G, E, and steps down to D.",
      },
    ],
    tempo: {
      learn: "Practice mode, one reference tone at a time. Speed does not matter yet; finding each note does.",
      build: "Play the first four notes from memory, then the last four, in Play · full check.",
      goal: "All eight quarter notes from memory, singing the phrase once before each pass.",
    },
    music: "Every note here comes from E minor pentatonic (E, G, A, B, D), the scale behind a great deal of rock and blues soloing. Learning it by ear is the same process as lifting a lick from a record: hear a few notes, find them, join them. Sing the phrase back before each pass; a phrase you can sing is a phrase you can find.",
    variation: "Transcribe your own: take four to eight notes of a melody you can already sing and find them on strings 1 and 2 the same way, one note at a time.",
    relatedDrills: ["intervals-from-a", "night-drive-etude", "blues-landing-notes"],
    relatedGuides: ["/how-to-memorize-songs-on-guitar", "/how-to-practice-guitar-improvisation"],
  },

  // ─── Fretboard knowledge ──────────────────────────────────────────────
  "musical-alphabet-low-e": {
    mistakes: [
      {
        mistake: "Leaving a fret between E and F or B and C",
        fix: "E to F is the open string to fret 1, and B to C is fret 7 to fret 8. Every other pair of neighbors is two frets apart. Say it as a rule while you play: no sharp between E and F, no sharp between B and C.",
      },
      {
        mistake: "Memorizing fret numbers instead of names",
        fix: "Say the name, not the number, and use the fret markers: G at the 3rd-fret dot, A at the 5th, B at the 7th and E at the 12th-fret double dot.",
      },
      {
        mistake: "Knowing the notes only in order",
        fix: "Once the run is easy, call out names at random and find them: C at fret 8, F at fret 1, D at fret 10.",
      },
    ],
    tempo: {
      learn: "Say every note name out loud as you play it.",
      build: "Stop looking at the diagram and play from the names alone.",
      goal: "Fifteen notes, one per beat, up to the 12th fret and back with no pause at the top.",
    },
    music: "These notes are the roots of every power chord and E-shape barre chord rooted on string 6. Knowing that A is at fret 5 tells you exactly where the A5 power chord and the A barre chord sit. Above fret 12 the pattern repeats: F at fret 13, G at 15, A at 17.",
    variation: "Do the same on string 5: A, B, C, D, E, F, G and A at the open string and frets 2, 3, 5, 7, 8, 10 and 12.",
    relatedDrills: ["movable-shape-roots", "every-c", "intervals-from-a"],
    relatedGuides: ["/learn-guitar-fretboard-notes", "/how-to-play-barre-chords"],
  },
  "movable-shape-roots": {
    mistakes: [
      {
        mistake: "Counting up from the nut every time",
        fix: "Use neighbors you already know. G on string 6 fret 3 sits directly beside C on string 5 fret 3: same fret, next string, a fourth higher.",
      },
      {
        mistake: "The right name on the wrong string",
        fix: "Each cue sets the string. B on string 6 fret 7 and E on string 5 fret 7 share a fret, and C appears twice, on string 5 fret 3 and string 6 fret 8. Check the string before you play.",
      },
      {
        mistake: "Building the power chord in the wrong place",
        fix: "The fifth goes on the next thinner string, two frets up. G5 is string 6 fret 3 plus string 5 fret 5; C5 is string 5 fret 3 plus string 4 fret 5.",
      },
    ],
    tempo: {
      learn: "One root per beat, named out loud before you play it.",
      build: "Away from the coach, add the power chord after each root. In the coach, play the root alone so the score stays clean.",
      goal: "Eight roots, one per beat, with no hunting.",
    },
    music: "With these roots you can play a song's chords as power chords or barre chords anywhere on the low strings. The drill's A, D and E sit at string 6 fret 5, string 5 fret 5 and string 5 fret 7, which is the I–IV–V in A inside three frets.",
    variation: "Play the same chords with roots on the other string: G at string 5 fret 10, A at string 5 fret 12, D at string 6 fret 10 and B at string 5 fret 2.",
    relatedDrills: ["musical-alphabet-low-e", "every-c", "octave-string-skipping"],
    relatedGuides: ["/how-to-play-barre-chords", "/learn-guitar-fretboard-notes"],
  },
  "every-c": {
    mistakes: [
      {
        mistake: "Forgetting the shift at the B string",
        fix: "From string 4 or 3, the octave is two strings over and three frets up, not two. String 4 fret 10 leads to string 2 fret 13, and string 3 fret 5 leads to string 1 fret 8.",
      },
      {
        mistake: "The right note in the wrong octave",
        fix: "The coach checks the octave. C3 is at string 5 fret 3 and string 6 fret 8; C4 at string 3 fret 5, string 4 fret 10 and string 2 fret 1; C5 at string 1 fret 8 and string 2 fret 13.",
      },
      {
        mistake: "Learning the order instead of the neck",
        fix: "Before each move, point at the next C. Once the drill is easy, play the seven places in a new order, lowest to highest.",
      },
    ],
    tempo: {
      learn: "Picture the next C before you move; Practice mode waits for you.",
      build: "Name the octave, 3, 4 or 5, as each note lands.",
      goal: "Seven notes, one per beat, including the twelve-fret jump on string 2 at the end.",
    },
    music: "Knowing every C means a C chord, a C major scale or a C minor pentatonic box can start from any of these places. When a solo needs to move up the neck, the next C is your next home base. The C at string 5 fret 3 is also the root of the open C chord you already know.",
    variation: "Pick another note and find it everywhere. G lives at string 6 fret 3, the open string 3, string 4 fret 5, string 5 fret 10, string 1 fret 3 and string 2 fret 8.",
    relatedDrills: ["musical-alphabet-low-e", "octave-string-skipping", "movable-shape-roots"],
    relatedGuides: ["/learn-guitar-fretboard-notes"],
  },

  // ─── Improvisation ────────────────────────────────────────────────────
  "blues-landing-notes": {
    mistakes: [
      {
        mistake: "Staying on C over A7",
        fix: "C is the blue note, and its pull up to C sharp is what sounds like the blues. Slide from string 3 fret 5 to fret 6 and let the C sharp sit.",
      },
      {
        mistake: "Missing G sharp over E7",
        fix: "G sharp, string 4 fret 6, is one fret above the G in the fifth-position pentatonic box. Over E7 take the half step up and land there.",
      },
      {
        mistake: "Playing one phrase over all three chords",
        fix: "The landing note changes with the chord: C sharp over A7, F sharp over D7, G sharp over E7. Know which chord is coming a beat early. In a standard 12-bar blues, D7 arrives in bar 5 and E7 in bar 9.",
      },
    ],
    tempo: {
      learn: "Say the chord name, then aim for its third.",
      build: "Loop each four-note phrase on its own. The D7 phrase starts on G at string 2 fret 8, a reach up from the end of the A7 phrase.",
      goal: "Twelve eighth notes over three chords, with all three thirds landed in tune.",
    },
    music: "A 12-bar blues in A uses A7, D7 and E7. Play your usual pentatonic phrases and change only the last note to the current chord's third, and every phrase sounds attached to the band. At the turnaround on E7, landing on G sharp pulls straight back to A for the next chorus.",
    variation: "Land on each chord's seventh instead: G over A7, C over D7 and D over E7. All three are already in A minor pentatonic, so they sit under your fingers.",
    relatedDrills: ["dorian-color", "enclosures", "bends-in-tune"],
    relatedGuides: ["/how-to-practice-guitar-improvisation"],
  },
  enclosures: {
    mistakes: [
      {
        mistake: "Accenting the approach notes",
        fix: "Play the two approach notes lighter and give the target the accent and a touch of vibrato. The ear should hear the target as the arrival. Say the target's name as you play it.",
      },
      {
        mistake: "Shifting position for every group",
        fix: "Each enclosure is three neighboring frets on one string: above, below, then the middle. Keep one finger per fret, for example fingers 1, 2 and 3 on frets 5, 6 and 7 of string 3 for C sharp.",
      },
      {
        mistake: "Enclosing notes that are not chord tones",
        fix: "The move works because the target belongs to the chord. The four targets here, C sharp, F sharp, A and E, spell F sharp minor 7, the same notes as A6.",
      },
    ],
    tempo: {
      learn: "Say \"above, below, land\" and hear the target as the resolution.",
      build: "Join the groups so the eighth notes run on with no gap between targets.",
      goal: "Twelve eighth notes and four targets, each landed with the accent.",
    },
    music: "In a solo, choose the chord tone you want to land on, then enclose it so it arrives with weight. Over an A major or F sharp minor chord all four targets here work as landing notes. Enclosing the chord's third as a new chord arrives is a classic bebop habit; try it with C sharp as A7 comes around in a blues.",
    variation: "Enclose from a scale step above and a half step below. In A major that puts B and G sharp around A, and F sharp and D sharp around E. The half step below keeps the pull into the target strong.",
    relatedDrills: ["blues-landing-notes", "guide-tones", "ii-v-i-arpeggios"],
    relatedGuides: ["/how-to-practice-guitar-improvisation"],
  },
  "dorian-color": {
    mistakes: [
      {
        mistake: "Resolving to F sharp",
        fix: "F sharp is color, not home. End on A or C, as the phrase does, and let F sharp pass through.",
      },
      {
        mistake: "Stretching for the sixth",
        fix: "F sharp at string 2 fret 7 sits under the ring finger in the fifth-position box, between E at fret 5 and G at fret 8. No stretch needed.",
      },
      {
        mistake: "Using it over the wrong chord",
        fix: "F sharp clashes with an F major chord. Use the Dorian sixth over Am, Am7 or a vamp from Am to D, where F sharp belongs to the D chord. Over Am to F, leave it out and play F natural instead.",
      },
    ],
    tempo: {
      learn: "Listen for F sharp, the fifth note of the phrase and its peak.",
      build: "Play the phrase, then improvise one bar of your own in the same box with F sharp in it once.",
      goal: "Nine eighth notes, F sharp clearly heard, landing back on the low A in time.",
    },
    music: "Over an Am7 vamp, alternate a bar of plain A minor pentatonic with a bar that uses F sharp. The contrast between the two is the whole effect. In the drill, F sharp falls on beat 3, a strong beat, which is why it stands out; in your own lines, put it on a strong beat or a held note for the same lift.",
    variation: "Add B, the ninth, at string 3 fret 4 or string 1 fret 7, and the box holds the full A Dorian scale: A, B, C, D, E, F sharp and G.",
    relatedDrills: ["aeolian-vs-dorian", "blues-landing-notes", "enclosures"],
    relatedGuides: ["/how-to-practice-guitar-improvisation", "/how-to-practice-guitar-scales"],
  },

  // ─── Repertoire ───────────────────────────────────────────────────────
  "night-drive-etude": {
    mistakes: [
      {
        mistake: "Cutting the long notes short",
        fix: "B in bar 1 lasts a beat and a half, and D in bar 2 lasts two full beats. Count through them and keep the string ringing until the next note.",
      },
      {
        mistake: "Snatching the eighth notes",
        fix: "Bar 3 ends with B and C as two eighth notes on string 1, frets 7 and 8. Place them evenly inside beat 4 instead of rushing into bar 4.",
      },
      {
        mistake: "Playing notes instead of a melody",
        fix: "Shape it. Bar 1 climbs to B and bar 3 climbs higher to C, the peak. Give C a little more weight, then let bar 4 fall back to E.",
      },
    ],
    tempo: {
      learn: "Practice mode first: learn the sixteen notes and their frets.",
      build: "Switch to Play · full check and count every beat out loud, especially through the held D.",
      goal: "Sixteen notes over four bars, every long note held its full length.",
    },
    music: "It works as a short intro or outro. Record an E minor chord ringing, loop it, and play the melody over it with vibrato on the held notes. The melody stays on the top two strings between fret 3 and fret 8, so you can also pick the open low E on each bar's downbeat as a drone underneath it.",
    variation: "Play it an octave lower in open position: E on string 4 fret 2, G on the open string 3, B on the open string 2, A on string 3 fret 2, D on the open string 4 and C on string 2 fret 1.",
    relatedDrills: ["phrase-by-ear", "controlled-vibrato", "alternating-bass-etude"],
    relatedGuides: ["/how-to-memorize-songs-on-guitar"],
  },
  "alternating-bass-etude": {
    mistakes: [
      {
        mistake: "The thumb follows the melody",
        fix: "The thumb plays exactly on every beat: strings 5 and 4 over C, strings 6 and 5 over G. Run the thumb alone for a few passes before adding the fingers. If it still drifts, say \"one, two, three, four\" with the thumb strokes while the fingers play.",
      },
      {
        mistake: "Lifting the chord shape",
        fix: "Keep the C shape down and add the pinky on string 2 fret 3 for D; lift the pinky and you are back on C at fret 1. Over G, the finger on string 2 fret 3 lifts for the open B and returns.",
      },
      {
        mistake: "Fingers and thumb crossing paths",
        fix: "Give each string an owner: thumb on strings 6, 5 and 4, index on 3, middle on 2, ring on 1.",
      },
    ],
    tempo: {
      learn: "Thumb alone first, then add the fingers one bar at a time.",
      build: "Play · full check follows the sixteen notes in order, thumb and finger alternating, so any hesitation shows up.",
      goal: "Two bars of steady thumb and clean melody, with the chord notes left ringing.",
    },
    music: "Alternating bass is the engine of Travis picking, country blues and folk fingerstyle. Once the thumb runs on its own, any melody on the top strings can sit over it. Rest the side of the picking hand lightly on the bass strings so the thumb thumps while the melody rings above it.",
    variation: "Pinch the first beat of each bar, thumb and finger together. Then extend the piece to four bars: C, G, Am with the thumb on strings 5 and 4, and back to C.",
    relatedDrills: ["night-drive-etude", "pick-dynamics", "octave-string-skipping"],
    relatedGuides: ["/how-to-change-chords-faster", "/guitar-practice-routine-intermediate"],
  },

  // ─── Tone ─────────────────────────────────────────────────────────────
  "controlled-vibrato": {
    mistakes: [
      {
        mistake: "Vibrato wider than the check allows",
        fix: "The coach accepts notes that stay within 40 cents, less than half of a half step. Keep the width small and even here; wide vibrato is a choice for later.",
      },
      {
        mistake: "Starting the vibrato on the attack",
        fix: "Play the note straight for the first beat, then add vibrato. A clean start sets the pitch before it moves. Vibrato that starts late and grows also sounds more vocal.",
      },
      {
        mistake: "A rate that speeds up and slows down",
        fix: "Lock the vibrato to the click. Start with two pushes per beat, then try three or four, and pivot from the wrist rather than squeezing with the finger.",
      },
    ],
    tempo: {
      learn: "Slower here means longer notes, so this rung builds sustain. Hold each note the full four beats without vibrato first, then add it.",
      build: "Add vibrato after beat 1 and keep the same number of pushes per beat on all four notes.",
      goal: "Four notes, four beats each, every one held within 40 cents. Record one pass and listen back for an even rate.",
    },
    music: "Vibrato belongs on the notes that matter: the last note of a phrase and any long held note. G, A, E and B all belong to E minor, so end any E minor phrase on one of them with this vibrato. Copy one vibrato from a player you admire, matching its speed and width; that is a direct route to finding your own.",
    variation: "Try delayed vibrato: hold the note straight for two beats and add vibrato for the last two. Then add vibrato on top of a whole-step bend.",
    relatedDrills: ["bends-in-tune", "night-drive-etude", "pick-dynamics"],
    relatedGuides: ["/record-guitar-practice-on-phone"],
  },
  "pick-dynamics": {
    mistakes: [
      {
        mistake: "The loud bars rush",
        fix: "Keep the pick motion the same size and change only how deep the pick goes into the string. Count the loud bars out loud. Rushing tends to start on the first loud note, so give that downbeat its full time.",
      },
      {
        mistake: "Soft notes too quiet to register",
        fix: "Soft still has to speak. If the coach misses soft attacks, move the phone or computer closer to the guitar rather than playing louder.",
      },
      {
        mistake: "Tensing the arm for volume",
        fix: "Volume comes from pick depth and follow-through, not a tight arm. Shake out the hand between passes. A relaxed arm also keeps the loud bars from going thin and harsh.",
      },
    ],
    tempo: {
      learn: "Exaggerate the contrast: as soft as still sounds clear, then as loud as still sounds clean.",
      build: "Hold the contrast and let the timing grid catch any drift at the bar lines.",
      goal: "Sixteen quarter notes across four bars, soft and loud, every one on the beat.",
    },
    music: "Dynamics are how a strummed part builds from verse to chorus. Play a verse soft and a chorus loud on the same chords without the tempo moving, and the song gains shape without a single new note. Picking position adds a second control: near the neck sounds warm, near the bridge sounds bright and cutting.",
    variation: "Play a crescendo: start the bar soft and get louder on each quarter note, then come back down in the next bar. Or accent only beats 2 and 4. Then add a third level, soft, medium and loud, one bar each, with the timing still locked.",
    relatedDrills: ["funk-sixteenths", "controlled-vibrato", "triplet-sixteenth-shift"],
    relatedGuides: ["/how-to-practice-strumming", "/record-guitar-practice-on-phone"],
  },
};

export function drillTeaching(id: string): DrillTeaching | undefined {
  return DRILL_TEACHING[id];
}
