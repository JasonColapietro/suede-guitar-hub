# GuitarHub web learning verification — 2026-09-04

Target: `JasonColapietro/suede-guitar-hub`, isolated branch `codex/guitarhub-learning-web`. The first implementation commit `93046e0` passed clean-runner CI `33923687504`. Results below cover subsequent working-tree changes and do not establish deployment.

## Current implementation

- Eighteen authored guitar lessons share identical instruction and catalog resources with iOS. Stage 2 teaches D before A, individual-string accuracy, silent anchor movement, separately counted one-minute changes, and an original sixteen-bar study. Later lessons remain outlines.
- Typed notation assets and first-answer reading quizzes preserve retries and history independently of microphone scores. New practice attempts preserve their exact exercise revision and actual tempo; legacy four-bar scores cannot complete the expanded sixteen-bar checkpoint.
- First Light includes all sixteen bars, both authored strumming patterns, four-beat count-ins, 25–125% speed, phrase selection, optional generated backing/clicks, and current-bar restart after pause. Listening, interruption and self-reported playing remain distinct.
- Manual changes use one uninterrupted sixty-second interval. Interrupted counts are retained without extrapolation. Saved drill/study evidence supplies the lesson reflection duration; the separate timer is optional and is never added twice.
- Review repaired three bugs: two-minute rests interrupting long slow rhythm exercises, a redundant timer blocking completion after recorded drills, and duplicate saves of one measured performance. Rest now occurs at a rhythm-exercise boundary; measured runs have stable identities and save once.

## Automated verification

- `npm test`: **161 passed, zero failures**, including source parity with the sibling iOS checkout, instruction decoding, quizzes, manual/study evidence, timing, pitch/onset DSP, capture ownership, minimum tempo, revision history and duplicate-save protection. Log: `/private/tmp/guitarhub-web-stage2-final-tests.log`.
- `npx tsc --noEmit --incremental false` and full `npm run lint`: passed. Logs use the same `guitarhub-web-stage2-final-` prefix.
- `npm run build -- --webpack`: passed, **245 routes**. Log: `/private/tmp/guitarhub-web-stage2-final-build.log`. The default build command remains unchanged for clean-runner CI; local Turbopack previously encountered a port-binding restriction.

## Browser evidence

The new production build rendered the corrected Stage 2 order and lesson counts, reading-check labels, original-study title, and first-module preview boundary at `http://127.0.0.1:3400/learn/guitar`.

Stage 2 components were exercised in a separate local Next.js QA harness at port 3401, importing the actual product components. No production route or access bypass was added. The harness is outside the web repository; it does not establish a paid web journey or account integration.

At 390 × 844:

- The study chart and controls fit within a 390px document width; the inspected screenshot shows the four-bar chart, reference-finished state and beat guide.
- Four-bar Listen completed and explicitly added no practice time or playing result.
- A full-range practice was paused in bar 11 and restarted that bar with a fresh four-beat count-in. Its interrupted reflection retained actual practice duration and could not mark readiness.
- A fresh uninterrupted sixteen-bar take ended with exactly **64 seconds** of music at 60 BPM, excluding the count-in. Saving its manual reflection and confirming the three self-checks enabled readiness with the optional sidebar timer still **0:00**. This is a functional self-report test, not a claim that a physical guitar was played.
- A real sixty-second A-first interval saved one manual count (31) and disabled repeat saves. A separately stopped D-first interval retained 13 actual seconds as partial practice; it was not extrapolated into a minute. Both histories remained distinct.
- A ten-question reading attempt locked a wrong first answer and its alternatives, finished at 9/10, and retained that result when retry created an unanswered second attempt. Readiness returned to revisit and the prior 9/10 stayed in reading history. Chord names stayed hidden for recognition questions.
- Study, manual drill and quiz each measured document width 390px at a 390px viewport. The viewport was reset and the isolated harness server stopped after QA.

Earlier production-browser QA exercised same-origin AudioWorklet capture with synthetic E2 input, wrong-next-note rejection, manual six-string tuning preparation, saved first-lesson reflection, reload/Continue and microphone-denial recovery. Those tests do not establish real-room acoustic accuracy.

## Open gates

- First module of each track remains the web sampler. Subsequent lessons remain previews until verified account and purchase access exists. An iOS purchase does not unlock web content today.
- The sourced 21-minute daily routine runner, editable cadence, later guitar/voice teaching and complete repertoire are unfinished.
- Real guitar/voice, noise, speaker echo, wired/Bluetooth latency, device/browser coverage and full assistive-technology testing remain unverified.
- Exact private competitor scoring tolerances and internal algorithms were not available. Source reports distinguish public reference behavior from local thresholds and original assets.
- Updated CI, merge, deployment and live verification require separate evidence. The overall goal remains active.
