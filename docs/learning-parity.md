# Shared lesson and practice contract

The iOS `ContentLibrary.loadBundled` and `LessonInstructionLibrary.loadBundled`
are the reference for curriculum order, guided content, song companions,
exercise specifications and library search. The web vendors the five runtime
JSON resources byte-for-byte. It combines the song levels before `g-l5`, just as
the native loader does. `access` and `stage` in older catalog records are
optional descriptive metadata; the sampler remains the first module only.

Regenerate the reference contract using the command documented in the native
`contracts/README.md`. Then, from this web repository:

```sh
node scripts/sync-native-learning.mjs --native=/absolute/path/to/guitarhub-ios
node scripts/sync-native-learning.mjs --native=/absolute/path/to/guitarhub-ios --check
npm test
```

Neither sync script runs in CI, and cannot: both read a local iOS checkout, and
the workflow has only this repository. So `--check` for the five runtime
resources and `contracts/learning.json` is a step a human has to remember, and a
green CI run does not mean the vendored native files match iOS. The one vendored
contract whose reference is a public git repository —
`contracts/suede-vocal.json`, from `JasonColapietro/sing` — is checked on every
pull request by `scripts/sync-sing-vocal.mjs --check`. Do not read that step's
success as covering these files.

The explicit source path prevents stale sibling worktrees from silently becoming
the reference. `--check` compares raw bytes for all five sources and the generated
contract. Runtime follower tests assert catalog order, sampler boundary, every
practice specification, every instruction's assets and quiz, and native search
fixtures through the web's public accessors. Unknown authored asset kinds fail
validation. A missing contract or empty fixture set fails the suite.

Every authored microphone exercise is also scored with complete synthetic
observations. Silence must abstain. A perfect run below the authored completion
tempo must retain its score without completing the exercise. These deterministic
checks do not establish microphone accuracy on physical guitars.

Practice loops retain source target IDs and relative beat spacing. Play always
uses the complete authored specification, even when section controls were used
in Practice. Pitch Practice waits for each note, supports skipping without a
score, and returns to the count-in on each repeated section. Rhythm Practice uses
an optional metronome without microphone capture. Rhythm Play measures attack
timing; displayed chord/stroke cues do not claim chord recognition.

The first A/D daily routine remains independently available. Importing later
lessons never marks them complete or changes purchase entitlements. Popular-song
companions use original preparation drills and link to the creator's full
arrangement; external navigation does not log a song performance.

Verification on 2026-09-08:

- Combined repository tests: 812 passed, zero failed. Of these, 612 assertions
  cover the native parity contract, including 507 generated tempo cases.
- ESLint and TypeScript completed without errors.
- Next.js 16.3.3 production build completed using Turbopack; expanded lesson
  routes were generated. Account integration changes are verified separately.
- Byte comparison passed for all five runtime JSON files and the contract.
- Non-vacuity: a temporary copy changed `tracks.guitar.lessonIds[0]` to
  `mutated-lesson-id`. The follower run reported exactly one failing catalog
  assertion and 611 passes. The unchanged canonical copy reported 612 passes.
  The mutation did not modify the committed source or contract.

Physical microphone accuracy, timing latency and sound quality are device tests.
Synthetic scoring and a compiled web app do not establish those results. Browser
interaction verification should cover song/artist search, section loops and
count-ins, reference playback interruption, cue maps, and the upper-fret shapes.

Presentation review on 2026-09-08 found and corrected a visual timing gap: the
web had target cue text but only whole-beat indicators. Rhythm cues now use the
native 0.2-beat highlight window at every actual target, including offbeats, and
remain inactive through rests. The small cue indicator avoids flashing the
whole practice surface. It is not an audio-scoring change.

Eight additional checks cover the actual React components' structural output
and the cue/string/fret behavior. The complete reference inventory includes 105
chord assets; each fretted position resolves to the written pitch and fits its
view range. The eight riff references match string 6 and their written frets.
630 scoped parity/presentation assertions passed. React server rendering does
not run browser effects or prove keyboard/screen-reader interaction.

The finite pending browser matrix is in `docs/learning-ui-checklist.md`. The
sibling `browser-qa` folder imports these actual components, including all 117
authored lessons and the daily routine, and has no deployment target. Its
TypeScript configuration and audio-worklet link point to this checkout.
