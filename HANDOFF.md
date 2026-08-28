# GuitarHub Breakthrough Room handoff

**Date:** 2026-08-27  
**Target repo:** `/Users/jasoncolapietro/code/suede-guitar-hub`  
**Worktree:** `/Users/jasoncolapietro/code/suede-guitar-hub.worktrees/breakthrough-room`  
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

`/Users/jasoncolapietro/code/suede-guitar-hub/research/online-guitar-community-methods-2026-08-27.md`

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
