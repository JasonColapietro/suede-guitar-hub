# Standalone web practice tools

`/practice` provides the native practice room's standard guitar tuner and four-beat metronome without opening a lesson or signing in. Home/shared navigation, the learning hub, the tools registry, footer, and sitemap link to it. The route alone receives a microphone permission-policy override; ordinary site pages retain microphone denial.

The metronome follows native `MetronomeConfiguration.standard`: default 90 BPM, range 40–208, one-BPM slider steps, five-BPM buttons, four beats, and the same 35ms synthesized accent/tick samples. Starting plays beat one immediately. A tempo change keeps the pending beat and changes the interval after it, so dragging the slider cannot starve the click. Stop/Start begins again on beat one. Audio startup must succeed before the UI reports playback.

The standalone tuner reuses `TuningGuide`, with its lesson confirmation checklist omitted. Both standalone and lesson tuning now use native `GuitarTuning` targets, 55–1000Hz detector band, clarity, freshness, and cents guidance. Scored lesson pitch detection retains its prior defaults. A note or a green indicator never confirms preparation or records completion. Lesson checkboxes remain explicit self reports, and hearing a reference requires another recheck before confirmation.

Tuner capture, metronome, and reference tones share the existing audio arbiter within a page. Starting a new tool closes the previous tool's audio context and streams. Pending permission/playback requests are cancellable; late resources are closed. Background, page departure, and component disposal stop audio, remove timers/listeners, and require an explicit restart. Interrupted reference playback is distinguishable from a completed silent fade, so a cancelled tone cannot skip the tuner's quiet wait. Audio samples, tuner readings, and metronome state are not uploaded or saved.

## Reference contract

Native runtime constants and public behavior generate `contracts/practice-tools.json`. Do not edit the vendored file or duplicate these values in another configuration. Regenerate in the native repository:

```sh
CONTRACT_WRITE=1 swift test --package-path GuitarHubCore --filter PracticeToolsContractTests
```

Then copy or verify the exact bytes from the web root:

```sh
node scripts/sync-native-practice-tools.mjs --native=/absolute/path/to/native
node scripts/sync-native-practice-tools.mjs --native=/absolute/path/to/native --check
```

The follower tests call the real public controller/tuner behavior against nine tempo fixtures, eight beat fixtures, 78 native tuner readings, and 14 native Float waveform samples. The contract-load check rejects an empty fixture set or an untracked divergence. During this change, altering the first tempo fixture's clamped result from 40 to 41 caused exactly `native tempo 20 uses its actual clamp and beat interval` to fail. Restoring the byte-identical contract returned 107/107 controller/contract tests to passing. Native reference-side staleness evidence is recorded with its matching native change.

## Verification and browser acceptance

`tests/practice-tools.test.ts` uses the actual controller, shared capture arbiter, detector, and generated contract with injected audio/timer surfaces. It checks continuous tempo edits, restart, cancellation, playback failure, interruption, background cleanup, low/upper tuner band, and microphone error explanations. `tests/practice-tools-components.test.ts` renders actual React components and the page, and verifies route microphone policy. `tests/audio-capture.test.ts` also proves reference cancellation versus full fade completion. These are unit and server-render tests, not browser or acoustic acceptance.

The initial scoped run passed 168/168 tools, audio, route/SEO, and existing learning/routine regression tests. After adding the reference-decay confirmation guard and merging the 99-guide content release, the full Node suite passed 989/989 tests with `--test-concurrency=2`. Full ESLint, `next typegen`, `tsc --noEmit --pretty false --incremental false`, and the native contract byte check passed. Production build validation runs in CI because native release testing shares the local machine's resource budget.

When a supported browser is available, run this finite check on desktop and mobile widths:

1. Reach Practice from the homepage, learning page, and tools page; follow both tool anchors and return to the A/D routine.
2. Load the page with permission unset. Confirm neither audio nor a permission prompt starts automatically, and the tuner has no lesson checkboxes.
3. Start the metronome at 90, hear the first-beat accent, change the slider continuously, and exercise both buttons at the 40/208 boundaries. Stop and restart on beat one.
4. Block output or interrupt the audio route. Verify truthful stopped/error status, no silent running indicator, and a successful explicit retry.
5. Start the tuner, deny permission, retry after granting it, and try a missing/busy microphone. Check that each message provides a usable next step.
6. Cancel a pending microphone prompt or audio start, then allow the late request. It must not reopen resources or start a beat.
7. Pluck each standard open string at actual device input rates. Verify note, octave, below/above guidance, and the cents meter; test silence, noise, wrong octave, and stale input. Compare with a physical tuner.
8. Play and stop a reference, then try starting the tuner before its decay wait ends. Repeat by starting the metronome during the reference. In a lesson, recheck every box during playback and try confirming immediately after Stop or interruption; readiness must remain false until the decay wait expires. After expiry, a complete checklist can confirm and an incomplete checklist still cannot.
9. Start the tuner while the metronome runs and vice versa. Confirm only one tool remains active and the stopped tool explains the handoff.
10. Hide the tab, navigate away/back, and disconnect/reconnect the input/output. Confirm audio stops, no timer catches up in a burst, and returning requires explicit Start.
11. In a lesson, verify tuning checkboxes remain learner-controlled, changing a checked string invalidates the final recheck, and starting tuning or a reference clears prior confirmation.
12. Use keyboard-only navigation and a screen reader at narrow widths and increased text size. Check visible focus, selected strings, tempo value, error/status announcements, button targets, and overflow. The web version provides visual/audio beats; native-only haptics are not claimed here.

Production build, deployed header readback, actual browser/device checks, and physical acoustic timing remain separate release checks.
