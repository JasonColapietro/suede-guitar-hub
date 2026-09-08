# Advanced guitar instruction

This batch adds all18 actual Level5 catalog lessons, bringing the guided guitar
library to99. Stable lesson IDs, types, duration blocks and existing progress are
preserved. The remaining36 advanced guitar and102 voice topics are still outlines.
The18 new lessons use the existing instruction, chord diagram, reference-note and
written-panel renderers. They do not introduce microphone assessments.

## Teaching and evidence

- Barre and power chords: partial F, movable root/fifth shapes, complete consecutive
  entries, and an original16-bar power-chord piece with32 attacks.
- Twelve bars: one named A-blues form, A7/D7/E7, early manual chord calls and
  three consecutive choruses. This counted skeleton is not a shuffle assessment.
- First solo: A-minor-pentatonic palette, an original question and three written
  responses; musical rests retain the count.
- Bends: supported semitone practice and narrow vibrato. The20-cent checkpoint
  needs actual external chromatic observations; an unobserved result remains
  unverified. GuitarHub does not claim a bend trace or hidden-target grader.
- Triads: root/third/fifth, inversions and I/IV/V/vi in C/G/D. The corrected title
  makes clear that power, seventh and extended chords are not all three notes.

Self-check completion records the learner's reflection. Written instructions,
elapsed time, reference playback and a checked box do not create measured playing
scores. Standalone practice tools and external meters are identified explicitly;
no missing synchronized backing track or spoken chord caller is advertised.

## Source conventions

Public first-party material informed progression, slow practice and music facts.
All lesson prose, diagrams, protocols and musical examples are independently
authored. No private competitor code, thresholds, latency model or scheduler is
available or claimed. Source extraction limitations are retained in the original
staging evidence notes.

- [Yousician — How to Play the F Chord on the Guitar](https://yousician.com/blog/f-chord-guitar): Public explanation of F barre-chord difficulty and the mini-barre alternative; GuitarHub supplies the original placement exercises and entry rules.
- [Yousician — Guitar power chords](https://yousician.com/blog/power-chords): Root-and-fifth construction, absent third, movable shapes and excluded-string muting. The diagrams, riff and checkpoint protocol here are independently authored.
- [Yousician — Practice and Play modes in guitar](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar): Public practice convention of slowing difficult material and repeating a selected section before a complete performance; not a claim about private scoring or GuitarHub transport features.
- [JustinGuitar — Beginner Guitar Course, Grade 2](https://www.justinguitar.com/classes/beginner-guitar-course-grade-two): Public course scope includes F chords and power chords after initial open-chord foundations. No private lesson algorithm or exact checkpoint threshold is attributed to JustinGuitar.
- [Sonora — Beginner Guitar Roadmap](https://www.learnwithsonora.com/beginner-guitar-roadmap-b): Public progressive curriculum connects chord technique with rhythm, structured practice and musical application. The six lesson durations and target tempos come from GuitarHub, not Sonora.
- [JustinGuitar — Blues Guitar & Easy Improvisation](https://www.justinguitar.com/modules/blues-guitar-easy-improvisation): Public module links open seventh chords, twelve-bar forms and A minor-pentatonic solo/improvisation teaching. The exact map and phrase exercises here are independently authored.
- [Yousician — Practice and Play modes in guitar](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar): Public slow-and-repeat practice convention, applied here without claiming unimplemented transport, cue or score features.
- [Sonora — Beginner Guitar Roadmap](https://www.learnwithsonora.com/beginner-guitar-roadmap-b): Public progression connects rhythm, lead articulation and ensemble roles; no private curriculum or algorithm is claimed.
- [Yamaha — How to Play the Electric Guitar](https://www.yamaha.com/en/musical_instrument_guide/electric_guitar/play/): Bending raises pitch; a half bend is one semitone; vibrato varies pitch, and neighbouring strings need control. Numeric checkpoint and one-second hold are GuitarHub choices.
- [JustinGuitar — Essential Blues Lead Guitar](https://www.justinguitar.com/modules/essential-blues-lead-guitar): Public blues-lead module context for learning articulation and using it in musical phrases; full private lesson internals were not accessed.
- [JustinGuitar — Triad Chord Grips](https://www.justinguitar.com/guitar-lessons/triad-chord-grips-im-151): Public teaching starts triad grips on strings 1,2,3 and addresses muting and note order. These exact diagrams and three-key tests are independently authored.
- [Yousician — Guitar chord charts](https://yousician.com/blog/guitar-chord-charts): Major/minor root-third-fifth construction, with power and seventh chords distinguished. No literal every-chord-is-three-notes rule is adopted.

## Integration and validation

The advanced JSON is a separate bundled library merged with foundations and song
companions. Both clients use the same bytes and native-generated learning contract.
Native14 content/contract tests passed; the separate tools contract also passed.
Web876 tests passed, including real component rendering for all18 new guides.
TypeScript, ESLint and native byte-equality checks passed.
All90 chord diagrams are checked against standard-tuning fret-to-MIDI arithmetic.
The tests also check prerequisites, catalog identity, positive duration blocks,
references, asset decoding and absence of fabricated practice specifications.

This source document does not prove production deployment, App Store release,
physical microphone performance or real browser interaction. Each is verified
separately in the task handoff.
