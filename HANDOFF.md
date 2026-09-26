# 2026-09-26: Pro tools and the tone course

## Shipped
- **Seven pro tools under `/tools/`**, all free, with no account and nothing uploaded. They are ordinary `TOOLS` registry entries, so the sitemap, footer, homepage grid, `/tools` (now split into practice tools and pro tools) and `llms.txt` pick them up.
  - `/tools/slow-downer`: open a local file (read in the browser through a `blob:` URL), 25–125% speed with pitch kept or tape mode, a waveform, an A–B loop, and a speed-up loop.
  - `/tools/chord-detector`: microphone, FFT chroma matched against 12 chord qualities, smoothed over about 0.5 s. It reports the closest fit, not a verdict.
  - `/tools/intonation-checker`: compares the 12th-fret harmonic (or the open string) with the fretted 12th and says which way to move the saddle.
  - `/tools/fretboard`: scales, modes and arpeggios in 9 tunings, note or degree labels, position windows, tap-to-hear, and a find-the-note quiz.
  - `/tools/speed-trainer`: an auto-ramping metronome (climb, climb and reset, burst) on a lookahead scheduler.
  - `/tools/pedal-lab`: a Web Audio pedalboard with 12 reorderable pedals, an amp and cab, a demo riff or live input, and 8 presets deep-linkable with `?preset=`.
  - `/tools/eq-ear-trainer`: find the boosted or cut band in 4 levels, on a guitar loop or pink noise, with a safety limiter.
- **Tone course at `/tone`**: 35 lessons in 7 modules (pickups, amps, pedals, signal chain, power, recording, tone recipes). Content is typed data in `lib/tone/modules/*.ts`. Every lesson has an exercise and a check. Each recipe links to its pedal lab preset. Progress is kept in this browser (`guitarhub.tone.v1`); a lesson counts as passed on a perfect check or as marked read by the learner. "Tone" is added to the site nav.
- **Headers**: `microphone=(self)` only on the three listening tools (`MICROPHONE_TOOLS` in `next.config.ts`), and the CSP gains `media-src 'self' blob:` for local files.
- **Copy**: the `/tools` privacy and limits copy and the privacy policy now cover the listening tools and local audio files.

## Verification
- `npm test`: 1310/1310, up from 1205. New suites cover each tool's pure logic (FFT against DFT, synthesized chords, YIN intonation runs, ramp plans, EQ questions, preset validity, IR and curves), the course data (a no-brand-name tripwire, recipe↔preset links), progress rules, server rendering of the hub and a lesson, and the microphone headers.
- `npm run lint`, `tsc --noEmit` and `npm run build` pass. The build generates all 35 lesson pages statically.
- Headless Chromium at 390 and 1280px across every new page: no console errors, no horizontal overflow, no tap target under 40px. I drove each tool: file playback at 70% with pitch kept and an A–B loop; chord and intonation capture on a fake microphone; the scale playback; the ramp moving from count-in to step 1; the pedal lab starting, reordering and loading a preset; EQ rounds scoring right and wrong; and the lesson check marking answers.

## Not verified, next steps for Jason
- Nothing has been heard on real speakers, and the listening tools have not met a real guitar. Before announcing, try the pedal lab presets, the EQ trainer's low bands, the chord detector on common open chords (Am7/C6-type confusions are expected and stated), and the intonation checker against a strobe or pedal tuner.
- Pitch-preserving slow-down quality is the browser's own and is weaker at very slow speeds; the page says so.
- Only the `/tone` hub is in the sitemap, the same arrangement as `/advanced` and its drills. Decide whether the 35 lesson URLs should be listed too; the sitemap test would need literal ids in `generateStaticParams` or a registry change.

# 2026-09-25: Mobile exercise fix, Advanced Lab, simpler site

## Shipped
- **Exercises on mobile:** the first microphone lesson (Six Open Strings) hid the exercise behind a seven-checkbox tuning form, so on a phone it looked like it never loaded. The exercise now sits directly under the lesson title; tuning is an optional fold-out.
- **iPhone audio:** `lib/audio/capture.ts` now starts the audio context and the microphone request in the same tap, re-wakes the context after the mic opens, falls back to `webkitAudioContext` and to a ScriptProcessor when AudioWorklet is missing (older iOS, in-app browsers), and treats iOS "interrupted" blips as recoverable (`watchAudioState`, 1.5 s grace) instead of stopping the exercise.
- **No pointless checkboxes:** lesson self-check boxes are gone. "You're ready when" is a list to read; a lesson is marked done with one button, or by real evidence (passing Play check, reading check, saved count/study).
- **Advanced Lab** (`/advanced`, free): 23 scored drills across 8 skill areas (technique, theory, rhythm & timing, ear training, fretboard, improvisation, repertoire, tone). All music original. Best results saved per browser.
- **Find your level** (`/start`) and a level picker in the homepage hero: new to guitar → stage 1, open chords → stage 3, advanced → Advanced Lab.
- **Lesson path:** stages fold up, the current stage opens, stage chips jump anywhere, search is folded away. Mobile height went from about 42,000px to about 6,300px.
- **Nav:** Lessons, Advanced, Practice, Tools, Guides, plus one button (Find your level). Method is reachable from Guides and the footer.

## Next steps for Jason
- Test one mic exercise on a real iPhone in Safari and inside the TikTok/Instagram in-app browser.
- Decide whether Stages 3 to 7 should open on the web; advanced players arriving from the level picker still see previews there.

# GuitarHub Breakthrough Room handoff

**Date:** 2026-08-27  
**Target repo:** `~/code/suede-guitar-hub`  
**Worktree:** `~/code/suede-guitar-hub.worktrees/breakthrough-room`  
**Branch:** `codex/breakthrough-room`  
**Base:** `main` at `ecde317`  
**Remote:** `origin` → `https://github.com/JasonColapietro/suede-guitar-hub.git`  
**Feature commit:** `2b3b910` (`feat: add GuitarHub breakthrough room`)

## What changed

- Added `/breakthrough`, a static interactive four-week plan builder for four measurable guitar goals.
- Added deterministic plan generation, cadence validation, progress normalization, browser-local recovery, and eight Node tests.
- Linked every weekly plan to a relevant Strumly resource while keeping GuitarHub as the orchestration/accountability layer.
- Repositioned the homepage around the evidence loop: baseline, repair, pressure, and proof.
- Removed unverified mentor, tuition, daily-feedback, and outcome language from the public surface.
- Kept the founding-room application to its existing four data categories while adding visible labels, required-goal validation, clearer states, and PII-free missing-key logging.
- Replaced the pre-hydration `js` class mutation with a post-hydration client marker, eliminating the browser hydration mismatch.
- Added design spec, implementation plan, and an 18/20 technical design audit.

## Research

The supporting official-source competitor report is currently preserved at:

`~/code/suede-guitar-hub/research/online-guitar-community-methods-2026-08-27.md`

It compares Pickup Music, ArtistWorks, TrueFire, Guitar Tricks, JamPlay, and JustinGuitar, then maps their strongest mechanisms into GuitarHub's closed loop:

`Diagnose → Prescribe → Practice → Prove → Correct → Share → Repeat`

The Suede Graph Flo XR packaged workflow was unavailable from the Codex plugin, so this was a direct implementation fallback; do not claim that the packaged workflow ran.

## Verification

- `npm test`: 8 passed, 0 failed.
- `npm run build`: passed on Next.js 15.5.23.
- Static routes: `/` and `/breakthrough`; dynamic route: `/api/apply`.
- `git diff --check`: passed before the feature commit.
- Browser QA at `127.0.0.1:3400`:
  - generated all four weeks and twelve actions;
  - checkbox progress updated to 8% and restored after reload;
  - no horizontal overflow at 390px or 1280px;
  - no visible Next.js error overlay or console error after the hydration fix;
  - all visible mobile links/buttons measured at least 44px tall;
  - checkbox label hit areas measured 47px;
  - reduced-motion mode produced a `0s` progress transition.
- Impeccable detector: no deterministic findings after the width animation was replaced with `transform: scaleX()`.

## Caveats

- `npm audit --omit=dev` reports three high-severity transitive advisories in the Next.js PostCSS/Sharp chain. npm offers only `npm audit fix --force`, which upgrades to Next 16.3.3 and is a breaking change. No forced upgrade was applied.
- The application delivery path still requires `RESEND_API_KEY` in the deployed environment.
- The current branch has not been merged or deployed. Live `guitarhub.org` is unchanged until a separate integration and deployment step occurs.

## Explicit deferrals

- Authentication, database-backed profiles, native crews/chat, media uploads, Strumly attempt sync, mentor operations, payments, and outcome claims.
- Schedule, timezone, practice-duration, and accountability preferences remain browser-local and are not added to the Resend payload.

## Next step

Choose whether to merge locally, push and open a pull request, or preserve the branch for later. Deployment and live verification remain separate gates after merge.
