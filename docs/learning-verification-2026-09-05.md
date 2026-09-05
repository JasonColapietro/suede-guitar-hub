# GuitarHub daily routine and practice alignment

## Scope

This batch follows main `25ee3b5` (PR19). It adds the free A/D daily routine, aligns guitar pitch/re-articulation and rhythm rehearsal behavior with the native implementation, makes learning the primary homepage/navigation action, and supplies the privacy and terms routes used by the app. It also clarifies beginner instruction and the sixteen-bar checkpoint's diagram and bar display.

The seven routine defaults are 60, 180, 180, 120, 60, 60, 600 seconds: 21 minutes. The linked public JustinGuitar routine supplies the order and durations. Preparation, careful chord practice, manual speed counts, and song practice remain distinct. The portable template and behavior are documented in `lib/learning/routine-contract.md`.

GuitarHub's numerical detection settings are local engineering parameters. Public reference material does not disclose competitor algorithms or scoring tolerances. This batch makes web/native behavior consistent; it does not establish physical acoustic accuracy.

## Verification

- All 185 Node tests pass, including the full-minute/interrupted routine, stable attempt IDs, history preservation, repeated-note release, full rhythm observation capacity, complete click schedule, and correct four-quarter checkpoint reference. Editing a never-started plan keeps minute eligibility; editing a persisted zero-time start retains interruption.
- Full ESLint, TypeScript checking, and the 248-route production webpack build pass. The final target-edit guard and seven source-label wording refinements received a subsequent complete test/lint/typecheck pass. The separate default Turbopack CI build must build the final commit before merge.
- The shared beginner instruction JSON was reviewed across all 18 authored lessons and remains byte-identical to the native bundle. Wording cleanup preserves IDs, tasks, counts, durations, thresholds, and quiz answers.
- Real local browser walkthrough: homepage to learning path to routine; six preparation confirmations; exact seven default durations; a complete 60-second A-first attempt saved count31; reload retained it. A D-first attempt navigated away after49 seconds, returned paused at49, resumed11 seconds, and saved count8 as a raw count without a per-minute rate.
- Routine and legal pages fit a390px viewport without horizontal overflow in the earlier layout pass. The final built routine also saved an edited15-second attempt with count4 as raw count, and displayed locked Reflection saved controls. History distinguishes reviewed, unfinished, skipped, and interrupted attempts.
- Real rhythm rehearsal requested no microphone, started a four-beat count-in, ran all16 bars at80BPM, and ended at bar16/beat4 without a score. The expanded reference displays strokes on1,2,3,4. The separate study still starts with one stroke per bar.
- Privacy and terms were checked through actual local navigation. They disclose current on-device audio, local progress, hosting/application transport, and the lack of a cross-device purchase bridge. The article marketing call-to-action is absent from these pages.

The paid lesson component walkthrough used a separate local QA harness importing real components. No production bypass route was added, and this is not a completed paid-account journey. Browser checks do not substitute for Safari/device microphone tests, VoiceOver, or real purchase verification.

## Release boundaries

Before claiming this batch is live, require the exact branch's CI and preview, merge, deployed-commit evidence, and public browser/HTTP checks. PR19's existing live deployment does not include this batch.

Web still exposes only the first three guitar and first three voice lessons as its sampler. The free routine does not unlock later lesson routes or mark curriculum checkpoints complete. Remaining curriculum outlines, account-bound shared access/progress, physical audio calibration, and native store release remain separate unfinished work.
