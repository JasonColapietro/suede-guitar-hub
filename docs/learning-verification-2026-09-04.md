# GuitarHub web learning verification — 2026-09-04

## Target and scope

- Repository: `/Users/jasoncolapietro/Documents/ChatGPT/Guitar Hub iOS App/web`
- Branch at verification: `codex/guitarhub-learning-web`, based on `origin/main`.
- Remote: `https://github.com/JasonColapietro/suede-guitar-hub.git`.
- Local runtime: Next.js development server at `http://127.0.0.1:3400`.
- This report covers the new learning routes, curriculum models, instructional rendering, local progress, timer, and the visible microphone-denial recovery. It does not establish production deployment or complete curriculum parity with a commercial learning product.

## Automated verification

The following commands completed successfully from the web repository:

```text
node --test --experimental-strip-types --disable-warning=ExperimentalWarning --import ./tests/register-aliases.mjs tests/learning-*.test.ts
# tests 11
# pass 11
# fail 0
# cancelled 0
# skipped 0

npx tsc --noEmit
# Exit 0, no diagnostics

npx eslint app/learn components/learning lib/learning tests/learning-*.test.ts
# Exit 0, no diagnostics
```

The learning tests cover:

1. Unique stable native lesson identifiers.
2. First-module sampler eligibility for guitar and voice, independent of legacy level access labels.
3. Rejection of duplicate IDs and invalid practice targets.
4. Cross-track lesson lookup and stable route construction.
5. Exact equality with the sibling iOS guitar and voice JSON resources when that checkout exists. The comparison ran and passed in this workspace; it is explicitly skipped in a standalone web checkout without the iOS sibling.
6. Written instruction steps, visual/listening checks, recovery suggestions, self-check criteria, and practice-block durations for the nine authored beginner guitar lessons.
7. Missing instruction content remains missing rather than being presented as a finished lesson.
8. Track-isolated progress, permitted IDs, and removal of fabricated scores from self-reported attempts.
9. Malformed progress and invalid measured results cannot become completion.
10. Continue returns the next unfinished/revisit lesson.
11. Timer accumulation, pause handling, clock reversal protection, and duration bounds.

No production build was run by this worker. The parent is performing final integration and production verification after the local development server stops. The final small lesson-key and timer-anchor edits were verified through the running browser; the parent should include them in its final TypeScript/lint/build checks.

## Browser journeys verified

The browser was the Codex in-app browser. Test progress was created only on the local development origin.

### Browse and resume

1. Opened `/learn`; inspected the guitar and voice entry cards, free sampler copy, browser-local progress disclosure, and iOS/web access limitation.
2. Followed **Explore guitar** to `/learn/guitar`.
3. Verified the first stage expanded, authored lesson counts derived from arrays, first module available, and subsequent modules presented as previews.
4. Followed **Start first lesson** to `/learn/guitar/g-l1-m1-01`.
5. Verified authored support/pick instruction steps, look/listen checks, practice blocks, self-check criteria, and recovery advice rendered.
6. Selected **I’ve read the lesson**, selected **I’m ready for the next lesson**, and saved the self-assessment.
7. Observed **Saved in this browser**, **Marked ready to continue**, and **Self-reported. No automatic score.** The timed-practice value was honestly zero for this reading-only action.
8. Returned to the guitar path; Continue pointed to **Six Open Strings**, with one of three free lessons marked ready.
9. Reloaded the path. After client hydration, the same saved completion and Continue target remained. The server-rendered initial snapshot briefly showed the empty browser state before local storage hydrated.

### Mobile layout and practice lifecycle

1. Set the temporary browser viewport to `390 × 844`.
2. Inspected the path screenshot and measured `document.documentElement.scrollWidth === innerWidth === 390`; no overflowing descendants were found in the main learning content.
3. Followed Continue to `/learn/guitar/g-l1-m1-02`.
4. Verified the string-number/name/octave table, tuning preparation disclosure, authored exercise instructions, and live coach controls.
5. Started the practice timer and paused it at `0:17`; the visible state changed to **Practice timer paused**, preserving elapsed time.
6. Started the microphone coach. The browser returned denied access. The UI displayed **Microphone access is off. Allow it in browser settings, or practice without scoring.** No measured result was saved.
7. Inspected the mobile coach/timer screenshot. The lesson page also measured `document.documentElement.scrollWidth === innerWidth === 390`.
8. Navigated to `/learn/guitar/g-l1-m1-04`; its timer was a fresh `0:00` and no microphone coach from the previous lesson remained.
9. Navigated back to `/learn/guitar/g-l1-m1-02`; timer remained a fresh `0:00`, and the coach reset to target one with **Start** and its initial setup message. Lesson route navigation did not reuse the previous timer or denied-microphone state.
10. Reset the temporary viewport to the normal browser size.

## Screenshot evidence

Screenshots were inspected and emitted inline by the browser tool for the learning landing page, guitar path at desktop and mobile widths, and the mobile coach microphone-denial state. **No screenshot files were persisted**, so there are no local screenshot artifact paths to cite. This report does not invent screenshot filenames or claim pixel-level automated comparison.

## Current limits

- The web exposes the first module of each track as its sampler. Other modules are curriculum previews; there is no web payment or iOS entitlement bridge.
- The complete nine-lesson beginner guitar instruction source is retained in `lib/learning/data/beginner-guitar-instruction.json`. Full instructional rendering is active for the three available first-module lessons; the other six remain behind the current web-preview boundary.
- Voice sampler lessons remain explicitly labeled outlines with self-assessment; full authored voice instruction was not delivered in this worker's scope.
- Wider curriculum lessons, licensed song arrangements, demonstration media, and the source document's proposed notation quiz/interactive assets are not all implemented. Retaining their source specifications does not establish working interactive controls.
- Physical guitar/voice microphone accuracy, real-room noise behavior, hardware latency, and successful acoustic attempts were not tested in these browser journeys. Automated pitch tests and a denied-permission state do not prove those behaviors.
- No measured result was fabricated or stored by this browser QA.
- The timer was checked for start, pause, route reset, and replay initialization. Browser persistence was checked through save, navigation, and reload; cross-tab storage events and unavailable-storage fallback are implemented but were not separately exercised in this browser session.
- Desktop/mobile screenshots and a 390px width measurement provide scoped layout evidence, not a complete assistive-technology audit or coverage of every breakpoint.
- The development server initially failed with sandbox `listen EPERM`; an approved loopback-only start succeeded. This was an environment boundary, not an application failure.
- Next.js development startup generated root `AGENTS.md` and `CLAUDE.md` files and changed `next-env.d.ts`. These were identified to the parent as development side effects to review separately from the learning feature.

## Development server handoff

The worker sent an interrupt to development-server session `96131` after completing QA. The tool returned terminal completion with **exit code 0**; the development process is stopped for the parent's production build. No product code was changed during this final reporting task.


## Final integration checks (parent verification)

- Full web suite: 130 passed, zero failures. TypeScript, scoped ESLint, and full `npm run lint` passed.
- Production: `npm run build -- --webpack` passed, generating 245 routes. Default Turbopack was blocked locally by a subprocess port-binding restriction after font access was restored; the new clean-runner CI runs the unchanged default `npm run build`.
- The original browser-denied microphone path does not establish OS permission behavior. The old sitewide Permissions-Policy prohibited all microphones; `/learn/:path*` now explicitly permits same-origin microphone use with consent. Non-learning pages retain the deny policy. The AudioWorklet loads from a same-origin static JS file under the existing CSP.
- A local production browser test supplied a synthetic E2 stream through the actual AudioWorklet. Practice advanced from E2 to A2, then displayed E2 as 500 cents below A2 without advancing again or saving a score. Stop released the synthetic stream. This proves that integration path with synthetic input, not physical guitar accuracy. Test injection was removed by reloading.
- Final tuner UI: all six targets and octaves render; reference playback stops capture; interrupted/suspended input returns to an idle state; the external-tuner checklist enables confirmation and opens the practice coach. The six boxes plus final recheck are learner confirmations and do not save progress. Synthetic tuner recognition was inconclusive because the test source AudioContext suspended; do not count that as a pitch/tuning pass.
- Capture regression covers pre-cancelled setup, late permission streams, exclusive ownership, and cleanup. Active-duration regression excludes permission wait, count-in and long pauses and preserves resumed active time.
- First-module pitch instructions now have an accessible inline tuning prerequisite. Their stored prerequisite lesson IDs no longer require paid module-two lessons. Other web modules remain previews.

Still open: physical guitar/microphone/latency matrix, supported-browser device coverage, VoiceOver, account/purchase parity, full guitar/voice instruction and song arrangements, daily practice programming, and release verification. Nine authored guitar lessons exist; three are accessible in the current web sampler. Preview pages are not complete lessons.
