# Microphone scoring: real-device release evidence

**Status: NOT RELEASE VALIDATED.** No physical device results were collected in the coding environment. CI and synthetic audio tests do not fill in this checklist.

Use a copy of this checklist for each release candidate. Keep the completed record with release evidence and link it from the release review. A code change to capture, timing, scoring or interruption handling invalidates an older candidate's sign-off.

## Candidate and testers

| Evidence field | Recorded value |
|---|---|
| Exact candidate commit SHA and deployed URL | Not recorded |
| Date and tester name | Not recorded |
| iPhone model, iOS and Safari versions | Not recorded |
| Android model, Android and Chromium versions | Not recorded |
| Built-in mic / external mic model and routing | Not recorded |
| Bluetooth input available? Actual selected input, not just headphones | Not recorded |
| Screen reader and version | Not recorded |
| Recording/log links (with tester consent; no customer recordings) | Not recorded |

For every row, record device, observed behavior, pass/fail and evidence. A blank or failed required row blocks audio release validation. If Bluetooth input is unavailable, record that limitation; do not claim Bluetooth was validated. If no device reports input latency, the reported-latency path remains unvalidated.

## Required scenarios on both phone/browser combinations

| Scenario | Expected behavior | Observation / result |
|---|---|---|
| Grant microphone permission | Capture starts only after consent; visible running state and responsive stop control | Not run |
| Deny permission | Clear recovery guidance; no score/pass or stuck running state | Not run |
| Interrupt a run (background, call/audio interruption, input disconnected) | Run pauses/stops safely; stale samples cannot earn credit; retry starts a clean capture | Not run |
| Return after interruption, retry, then stop | No duplicate capture, audible runaway playback, or continuing mic use after stop | Not run |
| Silent room / no voiced input | Insufficient signal or retry, never a completed checkpoint | Not run |
| Low-confidence/noisy input | No invented pitch, range or passing score | Not run |
| Repeat an in-time rhythm target with built-in mic | Record BPM, cue mode, repeated scores, input settings and reported lag. Compare observed timing with independently recorded cue/performance evidence | Not run |
| Input reports latency | Verify actual selected track latency reaches scoring. Record value, units and correction; source-code wiring alone is insufficient evidence | Not run |
| Input does not report latency | No crash, NaN or fabricated calibration claim; record actual fallback and result | Not run |
| Bluetooth input if supported | Record selected device and observed lag separately; no claim output-headphone testing validates microphone input | Not run |
| Keyboard navigation | Start, stop, result and retry controls reachable with visible focus and no trap | Not run |
| VoiceOver / TalkBack | Controls named; running/error/result states understandable; retry and stop discoverable | Not run |

## Complementary automated evidence

- [ ] Attach exact-head test/lint/typecheck/build results.
- [ ] Attach tests covering malformed/out-of-range input, absent latency, correction sign/bounds, interrupted runs and silence.
- [ ] Confirm imported Sing sessions remain `repeat`, with no completion or rewards.

These checks validate code behavior under specified inputs. They do not prove microphone accuracy, end-to-end hardware latency or vocal safety. The visual cue's draw/composite/perception delay is not calibrated by this change.

## Sign-off

- [ ] Required physical-device scenarios have observations and evidence, with no open scoring or recovery failures.
- [ ] Any unsupported input configuration is stated as unvalidated and excluded from release claims.
- [ ] Candidate SHA matches the exact tested deployment.

Reviewer / date / decision: **Not recorded. Release validation remains pending.**
