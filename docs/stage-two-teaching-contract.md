# Stage 2 content integration notes

The Stage 2 instruction resource supplies nine existing lesson IDs, original teaching text, reusable diagrams, an original playable study, optional external song links, exact catalog corrections, and separate manual/measured evidence contracts. The source proposal is now integrated into both catalogs; runtime and release evidence is tracked separately in the learning-verification report.

## Teaching order and stable IDs

Use module order `g-l2-m1` → `g-l2-m3` → `g-l2-m2`; retain `g-l2-m4` afterward as the existing riff module. The riff lessons are not authored by this proposal. Update navigation and Continue consistently without renaming IDs.

| ID | Proposed activity | Suggested lesson time |
|---|---|---:|
| `g-l2-m1-01` | D, then A; exact placement order and sounding strings | 3 min |
| `g-l2-m1-03` | D accuracy, then A accuracy | **6 min**: 3 + 3 |
| `g-l2-m1-06` | Manual recall/individual-string checkpoint | 5 min |
| `g-l2-m3-01` | Silent anchor movement | 3 min including the 2-minute practice block |
| `g-l2-m3-02` | Two separate one-minute manual trials, with setup/rest/review | 5 min |
| `g-l2-m3-06` | Fresh manual count checkpoint; 30 as the early guide | 5 min |
| `g-l2-m2-01` | Four-beat counting and a downstroke on beat 1 | 3 min |
| `g-l2-m2-04` | Complete original A/D study and phrase rehearsal | **10 min** |
| `g-l2-m2-06` | **Full sixteen-bar timing checkpoint at eighty** | 5 min including rehearsal/review |

The accuracy and musical-application durations deliberately replace the old five-minute catalog values. The nine lesson suggestions total 45 minutes of first-exposure material; they are not one required daily session.

The recurring routine is tuning 1 minute, D accuracy 3, A accuracy 3, silent anchor 2, A-first changes 1, D-first changes 1, and musical application 10. The published first routine's entries total **21 minutes**, despite its 20-minute heading. The JSON preserves the entries and exposes the discrepancy. The original study replaces repertoire only as a clearly labeled GuitarHub asset substitution. [Published first routine](https://www.justinguitar.com/guitar-lessons/module-1-practice-routine-b1-116)

## Exact technique and manual-count behavior

D placement is index on string 3/fret 2, middle on string 1/fret 2, then ring on string 2/fret 3. A is index on string 3/fret 2, middle on string 4/fret 2, then ring on string 2/fret 2. The accuracy cycle is place → strum → check each intended string and adjust → strum again. [D instruction](https://www.justinguitar.com/guitar-lessons/how-to-play-the-d-chord-b1-105), [A instruction](https://www.justinguitar.com/guitar-lessons/how-to-play-the-a-chord-b1-108)

The anchor block is deliberately silent. Start at D with light contact, lift middle/ring, keep the index touching string 3 within fret 2, move it slightly within that fret space, and form A; reverse. Do not require a microphone or strum to credit the practice time. [Anchor instruction](https://www.justinguitar.com/guitar-lessons/how-to-use-anchor-fingers-b1-109)

The manual trial matches the chosen native interaction: select starting A/D, form it before Start, alternate for a contiguous 60 seconds, and enter the count afterward. Starting shape is zero; each completed destination transition adds one. Save attempts separately. Interrupted work remains partial and is never extrapolated into changes/minute. Empty input differs from a count of zero. A remembered-shape check and at least 30 transitions in a full minute support early readiness; 60 is a later exercise goal. Tone accuracy remains separate from switching speed. [One-minute exercise](https://www.justinguitar.com/guitar-lessons/one-minute-changes-exercise-b1-110)

Manual records need their own model/history. If updating the existing generic lesson summary, use `source: selfReported` and `score: null`; do not force `source: manual` into an enum that does not support it or synthesize a microphone result.

## Study and full checkpoint: both sixteen bars

**First Light** is an original elementary chord study, explicitly labeled as a study. Its complete plan is:

`D D A A | D A D D | A A D D | A A D D`

Each letter occupies one 4/4 bar. The JSON includes all 16 bar records, four phrase boundaries, chord voicings, beat offsets, an optional synthesized demonstration, count-in events, and an ending at exclusive music beat 64. The initial version has **16 downstrokes**, one on beat 1 of each bar. The optional version has **64**, one on every beat. At the authored 60 BPM: 64 seconds of music plus a separate four-second count-in. A complete guide playback establishes that the guide ended; the learner supplies the performance reflection.

Use the existing **25–125% controls in 5% steps**. At authored 60 BPM these produce 15–75 BPM in 3-BPM increments. The source documents this percentage range for adaptive practice; reusing the existing GuitarHub percentage control avoids a separate study control convention. The authored 60-BPM study tempo itself is a local choice. [Practice controls](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar)

The checkpoint keeps its existing title and lesson ID. Its proposed `practiceSpec` expands the faulty 16-target array to **64 quarter-note targets** at authored 80 BPM, `countInBeats: 4`, `passScore: 75`, and **`completionMinimumBPM: 80`**. Existing target IDs `beat-01`–`beat-16` remain; `beat-17`–`beat-64` are added. Music duration is 48 seconds, count-in is 3, and the final target occurs 47.25 seconds after music starts; finish the final bar at 48 seconds.

At authored 80 BPM the same percentage control yields 20–100 BPM in 4-BPM increments. Retain slower scores at their actual tempo; only an attempt at 80 BPM or above can complete the named tempo goal. The local timing threshold of 75 is weighted timing credit, **not** a sourced competitor threshold, a ninety-percent-on-beat promise, or chord recognition.

Preserve old 16-target scores as historical **four-bar** evidence. Give the expanded specification a version/fingerprint; do not reinterpret old completion records as sixteen-bar results.

## Integration and remaining work

- The nine lesson objects use the existing typed `LessonInstruction` fields. New specifications sit in `integrationNote` and `demoAssets`, which the public native model already preserves as heterogeneous JSON. `completionMinimumBPM` is the optional `PracticeSpec` extension being implemented for this checkpoint.
- Merge lesson, asset, and reference collections by ID. Asset and reference IDs in this proposal are uniquely prefixed; preserve the existing Stage 1 library.
- Rendering must actually support the referenced diagrams, manual count interaction, original study score/transport, and explicit result forms. Decoding the JSON alone does not supply these controls. Stop reference playback before measured capture.
- The JSON corrects the unsupported automatic chord-count claim, the old twenty-clean-changes threshold, the premature forty-five-second song claim, the missing complete study, and the false bar count by supplying the full 64 targets.
- Derive displayed module/lesson totals from published arrays. The inspected Stage 2 has four actual modules and twelve actual lessons, despite claiming 24; three riff lessons remain outside this authored nine-lesson scope.
- Familiar songs are optional **external** practice links. No linked song media is included or imported. Opening a link does not establish a practice duration or completed performance.

Validation checks cover the typed content shape, native model decoding, all referenced IDs/assets, exact segment totals, chord MIDI derivation, complete study bars/beats, both stroke variants, the 21-minute routine sum, full 64-target checkpoint mapping, preserved first-16 target IDs, and both percentage-to-BPM ranges. These checks do not replace runtime or acoustic QA.
