# Browser account attempt sync

Account configuration remains OFF by default. The account page mounts explicit Enable sync, Pause, Sync now, a checkbox-confirmed cloud reset, and scoped sign-out. Signing in does not import earlier guest or account-local history. Actual provider configuration, test-account acceptance, and browser/device checks are separate release gates.

The client uses the shared transport adapters in `lib/learning-auth/sync.ts`. Every upload and response is bound to the verified account and current server reset epoch. Outbox/inbox storage uses one immutable key per event; no tab replaces a shared array. Uploads contain at most 100 records and 500000 encoded UTF-8 JSON bytes including the envelope. Upload acknowledgements validate the exact sent snapshot and re-read its saved event before deletion. Cursor checkpoints are immutable and written only after all page records are durable. Old epochs remain on the device for local history and are never automatically assigned to a new epoch.

Only newly saved attempts after explicit opt-in enqueue. Reading attempts and manual counts started before opt-in remain local. A reading update is a new immutable event containing its original attempt ID and first-answer snapshot. With sync enabled, an insufficient-signal finish is recorded without a grade; scored results sync when the learner saves them. Microphone results preserve scored versus insufficient-signal disposition, observed seconds, actual BPM, revision, and target evidence. Manual counts and chord studies remain self reports. Routine timers remain local because the current shared attempt contract has no routine identity or completion type.

Routine history and preparation confirmations use the existing guest key when signed out and an account-specific key when signed in. Signing in never adopts earlier browser history. Account changes replace the routine's mounted timer, tuner, and reflection controls; any final timer checkpoint retains its original account key. Routine instruction links recognize verified track access while keeping unimplemented outlines as previews. The routine identifies its history as browser-local, not cloud-synced.

Downloaded evidence is kept separate from browser-local history. The existing decoders derive current progress: reading uses authored questions and answers; measured imports require actual target count, bounded matched targets and score, observed full Play duration, current revision, and required BPM. Missing historical elapsed time is not inferred. Raw manual/study evidence cannot satisfy a measured or reading checkpoint. Progress never changes purchase access.

Pausing, sign-out, account changes, reset, and unmount invalidate outstanding operations. Sign-out suspends and broadcasts synchronously before the POST form submits. Both account and epoch are checked after network awaits. The client retries on online/focus and every 30 seconds while mounted, with bounded batch/page work and visible pending/error state. Corrupt data is retained and stops processing; it is never silently replaced with an empty queue. No microphone audio is sent.

## Verification

`tests/account-client-sync.test.ts` exercises the real injected storage/network controller, including offline reload, concurrent tabs, immutable identities, late acknowledgements/downloads, account/epoch switches, malformed data, quota failure, more than 1000 downloaded records, explicit reset, and current curriculum evidence derivation. `tests/learning-components.test.ts` renders the actual React components for account OFF/consent/reset/form markup. These are not browser interaction tests.

`tests/routine-account-scope.test.ts` exercises the real routine storage adapter for guest/A/B isolation, late cleanup, storage failure, and external changes. It inspects the production React subtree keys and renders actual access-aware lesson links. Browser timer/control transitions still require the acceptance check below.

## Browser acceptance still required

Use disposable test accounts in a configured non-production environment. Never use production cloud-history reset for QA.

1. With account flag OFF, verify guest sampler, no account sync controls, and no account requests.
2. Sign in, verify prior guest/account-local history is not uploaded, then explicitly enable sync. Complete a new quiz, full microphone Play, insufficient-signal Play, manual count, and chord study; check pending/synced state and the other signed-in device's history.
3. Go offline, save another attempt, reload, return online, and verify exactly one immutable remote event. Repeat with two tabs saving distinct events.
4. Start upload/download and sign out or switch accounts. Verify old pending bytes remain with their account, no old response reaches the new account UI, and old tabs suspend.
5. Confirm reset using a disposable account. Verify sync pauses, the server epoch changes, old device history remains visible, and old outbox events are not uploaded when sync is explicitly enabled again.
6. Continue an imported unfinished reading attempt: verify first answers are retained and current result is recomputed. Older pre-opt-in local quizzes are not uploaded automatically.
7. Verify keyboard focus, live status announcements, disabled reset until checked, mobile wrapping, and error/retry copy in actual browsers. Verify microphone timing/pitch on physical devices separately.
8. Save different routines as guest and two accounts, switch during an active timer and while entering a reflection, and verify each history remains separate after reload. Earlier guest history must remain visible only as guest. Verify a guitar entitlement opens guided instruction from the routine, and an advanced outline remains a preview. Confirm routine history is not uploaded by Enable sync.
