# Web learning interaction checklist

Status: **browser interaction checks pending**. The approved browser surface was
unavailable on 2026-09-08. Unit tests, structural React server rendering, and a
production build are separate evidence and do not check browser interaction,
actual focus order, screen-reader speech, or physical microphone performance.

Use the real web application for navigation and account/access checks. For paid
learning components without an account fixture, the disposable sibling
`browser-qa` app renders the same components locally. It does not grant access or
change the production app. Do not deploy that harness.

Run each relevant row once on desktop and at a real 390 px viewport. Confirm the
reported viewport width in the browser; a requested resize alone is not proof.
Repeat keyboard/focus checks on desktop and the audio interruptions on a mobile
browser. Use known test accounts for account-state checks and actual guitar
input for acoustic checks. Do not fabricate completion by editing storage.

| Check | Action and required result |
| --- | --- |
| Initial catalog | Guitar library starts on Guided with 99 results. Songs has 28 guided song-typed lessons: 24 popular-song companions plus three foundation song lessons and one original power-chord piece. Mic exercises has 39, Previews 36, All topics 135. Voice has 102 previews and no authored guided/mic/song lessons. |
| Search | Search `OASIS`, `Taylor Swift`, multiple words such as `a d`, and an unknown phrase. Compare with the native contract. Search is insensitive to case/diacritics; each word must match. Clearing search restores the selected filter's complete results. Empty state offers Show all topics. |
| Responsive library | Search field, filter buttons, lesson cards and long song titles fit the viewport. Buttons remain keyboard reachable with visible focus; selected filters expose pressed state. |
| Sampler | Signed-out real app opens the three first-module guitar lessons. A later lesson remains behind verified access. Voice outlines cannot be marked complete. A local progress record or query parameter never unlocks a lesson. |
| Verified access | On the real app with configured test accounts, only the account holding a verified active grant opens paid lessons. Sign-out/account switching removes that access and does not display another account's history. Refund/revocation check belongs to the account release gate. |
| Reading | Open `g-l1-m3-04`. Complete one attempt with a wrong answer, confirm its answer stays locked, then start a new attempt. Earlier attempt remains in history. Reading answers create no microphone score. Hidden chord names must also be hidden from the accessible name. |
| Chord diagrams | Inspect A, D, Em, C, Bm and F#m. Strings run 6 to 1; X/O agree with source; fingers are readable; fret 4 dots remain inside the diagram. Hide/reveal the chord name. Each sounding-pitch button has a useful name. |
| Riff reference | Open `g-l2-m4-03`. Low E Lantern has eight slots: frets 0, 2, 3, 2, 0, 2, 5, 3 on string 6. Reference buttons show E2, F#2, G2, F#2, E2, F#2, A2, G2. Hear the actual reference audio, then stop it; no microphone score or completion appears. |
| Pitch Practice | Practice waits for each clear note. Ringing one note does not satisfy its next repeated slot; pluck again or mute briefly. A wrong pitch stays on the same target. Pause, hear target, resume and skip a note: these actions remain unscored. |
| Pitch loop | Select a middle section, such as targets 3 through 6. It begins at the first selected target, preserves spacing and repeats with the authored count-in. Pause during the count-in and during playing. Resume should remain within that selected section. Change the selection while paused, then Start begins the new section. |
| Full Play boundary | After looping a small section, switch to Play. The complete authored exercise and target count return, loop controls disappear, and Play starts at its first target. Pausing or a reference interruption requires a fresh full check. |
| Riff checkpoint | `g-l2-m4-06` requires the full 24 targets at at least 90 BPM and 100% pitch-slot score. A perfect slower attempt saves practice evidence without completing the checkpoint. No claim of chord clarity, finger choice, fret buzz or precise onset timing is made. |
| Offbeat rhythm | `g-l3-m3-02` shows Ghost Strums. In Practice, do not grant a microphone: the visual cue lights at each actual target, including the half-beat upstrokes, rather than only on whole-beat circles. The light turns off between target windows. Cue and next-target count follow the chosen tempo. |
| Rests and spaces | Choose a rhythm exercise with gaps in its map. The highlight remains off through the gap, with the next target shown in beats. No rest becomes an attack target. Verify map bar/beat labels and actual audio pulse independently. |
| Rhythm loop | Choose targets 2 through 4; verify their beat spacing is retained after the first target is moved to beat 0. Each loop has a fresh count-in; count-in clicks are outside the musical targets. Pause immediately before and after the loop boundary. |
| Rhythm audio | Toggle the audible metronome in stopped Practice. With it on, listen to the whole loop and its accented downbeat. With it off, visual cues still work. Play uses microphone attack timing and no audible scoring reference. |
| Complete duration | Run the complete sixteen-bar `g-l2-m2-06` exercise. It reaches bar 16/beat 4, retains all 64 targets, and ends after the final musical beat. Beginning/count-in/background time is not counted as played music. |
| Tempo and evidence | Move the 25–125% slider in 5% steps. A saved struggle offers a lower native-recommended tempo; two strong saved results at the same tempo can offer an increase. Older revisions or attempts at other tempos must not drive this suggestion. |
| Saving | Save a measured result once. The control becomes Result recorded; repeating it does not create another attempt. History states pitch/timing, BPM and revision when relevant. Unscored, partial, skipped and reference-playback runs never create measured passes. |
| Song companion | Open one popular-song companion. Its original drill/map/shape references load, and its creator-hosted full tutorial opens externally. Returning from the external page does not mark the song complete or count outside-tab time. |
| Audio ownership | Start a mic or metronome session, then play an instruction reference. The existing session pauses and releases its resource. Stop/reference-finish leaves no ongoing oscillator or microphone stream. Start again and confirm only one session is active. |
| Interruptions | Hide the tab, navigate away, deny mic permission, interrupt device audio and return. Running practice pauses or stops without a scored result. Reopening a lesson does not resume microphone capture automatically. |
| Daily routine | Open the A/D routine on the real app. Verify seven blocks and defaults totalling 21 minutes, preparation gating, tuning setup, pause/resume, raw partial counts, immutable reviewed attempts, export and history. Routine work does not award lesson completion. |
| Accessibility | Read search/filter state, diagram alternatives, map positions and result text with a screen reader. Do not infer speech behavior from HTML alone. Timed visual cues do not flood a live region. Keyboard users can pause/stop and select loop endpoints; focus remains visible after state changes. |

Acoustic sign-off is separate: test quiet and noisy rooms, built-in versus
external microphones, low E through high E, repeated notes, alternate strings,
silence, unwanted adjacent strings, real up/down strokes, speaker leakage,
headphones and audio interruption. Record devices, OS/browser, latency and
false-positive/negative observations. Rendering and synthetic scores do not
establish acoustic accuracy.
