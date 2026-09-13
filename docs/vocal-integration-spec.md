# Voice curriculum and Suede Sing integration

The voice track is a curriculum for an instrument this repository does not
measure. `JasonColapietro/sing` measures it: the range scan, the 44-exercise
warm-up catalogue, the breath drills, the pitch studio and the public-domain
songbook. Until 2026-09-12 the two had no link in either direction, and nothing
connected what a voice module promises to what the measuring surface can
deliver.

This document specifies the remaining work. It is a draft for review and not a
commitment of scope or dates. Values are deliberately not restated here: the
measurement statuses, taxonomy, drill constants and deep-linkable rooms live in
`contracts/suede-vocal.json`, vendored byte-for-byte from the sing repository,
and that file is the reference. Do not duplicate its numbers into another
configuration or into this document.

## What is already true

Seven changes landed on `claude/guitarhub-suede-voice-integration-9st9ur` and
are the baseline for everything below.

The sing repository publishes `contracts/suede-vocal.json`, generated from its
live modules and asserted by `contracts/suede-vocal.test.ts`. Its `measurement`
section states, per quantity, whether that surface measures it today. This
repository vendors the file and asserts its curriculum against it in
`tests/suede-vocal-parity.test.ts`. `lib/learning/voice-proof.ts` records, per
module, which measurement the module's proof rests on, or names the measurement
it lacks and states what the checkpoint does establish. Nineteen of the 34 voice
modules rest on the singer's own judgement; that count is pinned, so adding an
unmeasurable promise is a visible decision.

`LearningLevel.access` is now read. It had been present in every catalog from the
start and consulted by nothing, so nine modules the data marks `"free"` were
paywalled by `isModuleAvailable` alone. `isModuleAvailable` is unchanged because
it is pinned to `samplerLessonIds` in `contracts/learning.json`; the paywall gate
is `canOpenModule`, which now also honours `isFreeModule`, and `robots.index`
follows the same gate. Twenty-two guitar lessons are open and indexable, up from
three.

The metronome is anchored to the audio clock. Each click had started at
`context.currentTime` and re-armed a timer a full interval from that moment, so
every late `setTimeout` firing pushed the grid later without bound. Two
regression tests in `tests/practice-tools.test.ts` cover a late timer and a long
suspension, and both were proven against the old scheduler.

All 102 voice lesson pages resolve a companion room in the sing repository
through the contract rather than a hand-written URL, so a withdrawn route or
parameter fails a test instead of rotting on 102 pages. The vocal safety note in
`TRACK_SAFETY_NOTE` now renders: it had lived inside `LessonSession`, which only
mounts for a lesson that is ready, and no voice lesson is ready, so it had never
appeared once.

Thirty `proofMetric` values were realigned to the basis that actually backs them,
and the curriculum prose was corrected where it claimed measurements that do not
exist. `flag_clear` and `rate_hz` no longer appear on the voice track and are
guarded by name.

## The governing constraint

A module may promise only proof that `contracts/suede-vocal.json` reports as
`measurable: "yes"`. A quantity marked `"adaptable"` has its signal captured
correctly with nothing computing the number yet. A quantity marked `"no"` needs
acoustic analysis that exists in no Suede surface, and a module resting on one
must be worded as practice rather than proof.

Four of those gaps are worth naming here because they shape the curriculum
rather than merely limiting it. There is no strain or pressed-phonation
measurement anywhere, and four checkpoints are written as though there were.
There is no vibrato analysis. The pitch detector returns one fundamental per
frame, so a harmony held against a lead is not two measurable parts. And a
passaggio is not derivable from a range scan at all — the published zones are
per category, and `lib/voice-types.ts` in the sing repository argues that point
at length.

`proofMetric` is still typed `string?` and validated only as non-empty. The
parity test enforces consistency with the declared basis; the type does not.

## Work items

Numbered in dependency order. W3 gates W1, W2, W19 and W20. W4 through W12 each
retire named self-reports and move the pin in
`tests/suede-vocal-parity.test.ts`.

### W3 — Native authors voice instructions and regenerates the contract

Everything in the content phase depends on this. `contracts/learning.json`
declares `reference.surface: "ios"`, and `tests/learning-parity.test.ts` asserts
`browseLessons(track, "guided")` deep-equals `tracks.voice.guidedLessonIds`,
currently empty. Authoring web-side lesson bodies without a regenerated contract
fails that test, and hand-editing the vendored file removes the only guarantee
that makes it worth vendoring. Native has no voice instruction library either.

Regenerate in the native repository, then from this web root:

```sh
node scripts/sync-native-learning.mjs --native=/absolute/path/to/guitarhub-ios
node scripts/sync-native-learning.mjs --native=/absolute/path/to/guitarhub-ios --check
npm test
```

Done when `tracks.voice.guidedLessonIds` is non-empty and `--check` passes.

### W1 — Author `lib/learning/data/voice-instruction.json`

One record per covered lesson, up to 102. Authoring a record flips
`isLessonReady`, which flips the library filters, the lesson page's `available`
branch and `robots.index`. Every voice lesson currently renders the curriculum
outline and is `noindex`.

Each record requires `id`, `objective`, `steps` of three to six entries carrying
`title`, `action`, `lookCheck` and `listenCheck`, two to five `mistakeRecovery`
pairs, `practiceSegments`, a `selfAssessment` with three to five `criteria` plus
`readyWhen`, `ifNotReady`, `proves` and `doesNotProve`, and `demoAssetIds`. The
sum of `practiceSegments[].seconds` must equal the catalog lesson's `minutes`
multiplied by 60, an invariant that holds across all 117 authored guitar
records. Asset identifiers share one global namespace across every instruction
file, so prefix voice assets with `v-`. Step titles, criteria strings and
segment instructions are React keys and must be unique within a lesson.

Four authored asset kinds are safe for voice: `reference_tones`, which is the
best fit and renders a pitch comparison; `diagram`, which renders only its
`textAlternative` and falls back to a placeholder caption without one;
`rhythm_demo`; and `external_practice_links`, which requires HTTPS.

Two kinds must not appear on a voice lesson. `manual_timed_exercise` and
`original_chord_study` set evidence flags that gate completion, and
`StageTwoPractice` calls `useStageTwoProgress("guitar")` unconditionally while
`parseStageTwoHistory` rejects any lesson identifier that does not begin `g-`.
The evidence therefore cannot survive a reload and the lesson becomes
permanently uncompletable. The three guitar-only diagram kinds are also
unusable, and the asset identifiers `notation-legend`, `support-and-pick` and
`tuner-directions` are reserved by bespoke renderers.

An unknown asset identifier or an unknown `kind` throws. Because `isLessonReady`
calls the loader, the throw propagates through `generateStaticParams` and the
track page, so one bad identifier fails the whole track's build rather than one
lesson. It is never a 404 and never a silently empty section.

Wiring is not data: add the import in `lib/learning/instructions.ts` and spread
it into both `sourceAssets` and `sourceLessons`, then update
`tests/learning-instructions.test.ts`, which asserts voice instructions are
`undefined`.

### W2 — Add `practiceSpec` blocks for measured voice exercises

Scope is the 15 modules `lib/learning/voice-proof.ts` records as measured. Use
`mode: "pitchSequence"` with an integer `midi` of 21–108 on every target,
`beat` monotonically non-decreasing, and no `guitarString` or `fret`.
`toleranceCents` is 50, adjudicated in `contracts/adjudications.ts` under
`pitchToleranceCents`: sung notes are judged more forgivingly than fretted ones,
and 35 is the guitar track's number, not a default.

### W4 — Vibrato rate and extent

Retires `v-l6-m3`, whose promise previously stated a hertz figure as a measured
result. The fundamental-frequency contour is already captured at roughly 60
frames per second; no analysis code exists. Report rate and extent separately
and keep onset distinct from both. Lands in the sing repository.

### W5 — Longest unbroken voiced run

Retires `v-l3-m2`, `v-l5-m5`, `v-l6-m4` and `v-l6-m5`, the best ratio of modules
retired to work in this phase. A reducer over the voiced and unvoiced trace.
`maxCombo` is the nearest existing primitive and is not a substitute because it
is pitch-hit based. Note that an unbroken voiced run and the absence of a
register crack are different claims; state which one the number establishes.

### W6 — Onset timing error

Retires `v-l4-m2` and `v-l4-m4`. Needs an onset detector and a signed error in
milliseconds. The latency model required to do this honestly already exists in
the sing repository. Do not ship the detector before the correction: without it
every onset is attributed to the previous note.

### W7 — Register mechanism

Retires `v-l3-m1`. The H1−H2 discriminator, for which the iOS app already has a
single-boundary implementation to match rather than invent. Resolve the taxonomy
first: the lesson teaches three mechanisms, its own module promise says two, and
the measurement is binary, so the number will not answer the lesson's question
as currently written.

### W8 — Vowel and formant tracking

Retires `v-l3-m3`, `v-l5-m2` and the style half of `v-l7-m2`. Genuinely new
signal processing; one fixed band ratio is the entire spectral analysis today.

### W9 — Strain and pressed phonation

Retires four checkpoints: `v-l3-m5`, `v-l5-m4`, `v-l7-m3` and `v-l7-m4`. Last
because it needs jitter, shimmer, harmonic-to-noise ratio or cepstral peak
prominence, none of which exists in any Suede surface, plus a validated
threshold for a clinical-adjacent claim.

`ringRatio` must not be substituted. It is a self-relative resonance share, the
contract says so, and shipping it as a safety verdict would be the most harmful
available version of this gap. Until the measurement exists these modules stay
self-reported and the safety copy stays on the page. `v-l5-m4` places a
six-second sustain at the top of the passaggio and needs a safety hedge
regardless of whether the measurement ever lands.

### W10, W11, W12 — Calibrated loudness, polyphony, diction

`v-l4-m5` wants absolute loudness, `v-l7-m6` wants a harmony measured against a
simultaneous lead, and `v-l4-m3` wants intelligibility. Calibration needs
hardware assumptions a browser cannot make, polyphonic tracking is a rewrite of
the detector, and intelligibility scoring is a different product.

The recommendation is to record all three as decided rather than pending and
reword the lessons, which gives the pin of 19 a documented floor of four modules
that will not move.

### W13 — Latency compensation

There is none in this repository beyond `latencyHint: "interactive"`. No
output-latency or analyser-lag correction exists, while rhythm mode scores
attack timing inside a half-beat window, so every scored attempt is biased late.
Fixing it changes scored output and the rhythm and tuner fixtures in
`contracts/practice-tools.json` are native-generated, so native must move with
it.

The two repositories are complementary rather than duplicated here. This one has
audio-session claiming and lifecycle binding that the sing repository lacks; the
sing repository has the context and latency modules this one lacks. Each should
adopt the other's half.

W17's `frameStaleness` entry settles the one constant this work would otherwise
have had to decide on its own: the 0.45-second reading age may be tightened and
must not be widened, and it is not a budget to spend on analyser lag. The rhythm
window and the staleness gate are separate numbers.

### W14 — Make contract drift fail CI

**Done for one of three contracts; the other two cannot be done this way.**

`.github/workflows/verify.yml` ran `npm ci`, `npm test`, lint, build and
`scripts/check-account-bundle.mjs`, and never ran either sync script with
`--check`. The byte verification was documented in `docs/learning-parity.md` and
`docs/practice-tools.md` and executed by nothing, so a vendored contract could go
stale with no signal at all.

The original scope here said to add the step "behind a cached native checkout".
That was optimistic: `sync-native-learning.mjs` and
`sync-native-practice-tools.mjs` both take `--native=` and read a local iOS
checkout, and the workflow has only this repository, so their `--check` genuinely
cannot run in CI. Pretending otherwise would produce a step that passes without
comparing anything, which is worse than no step.

`contracts/suede-vocal.json` is different: its reference is a public git
repository. `scripts/sync-sing-vocal.mjs` now vendors it, mirroring the two
native scripts' shape and flags, and `--check` runs on every pull request.
`npm run contracts:check` is the same check for a contributor. It reads the
reference's default branch by default and accepts `--sing=` for a local checkout,
so it works offline and can verify against an unmerged branch before it lands —
while never *vendoring* from one, since a copy taken from a branch in flight is
the drift the contract exists to prevent. A fetch failure is fatal rather than
skipped: reporting "verified" when the reference was unreachable is the absence
of a check wearing the result of one.

Still open: native-sourced drift. Either the workflow gains access to an iOS
checkout, or the native side publishes those contracts somewhere fetchable, or
this stays a human step — in which case it should stay documented as one, which
`docs/learning-parity.md` now says in as many words.

### W15 — Give this repository a contract builder

**Done.**

Several audio constants were inline literals that nothing bound: the lesson
detector band and threshold in `lib/audio/dsp.ts`, the clarity floor in the same
file, and the adaptive-tempo ratios in `lib/audio/practice-tempo.ts`. The tempo
grid matched the sing repository's 25–125 per cent in five per cent steps by
coincidence, with no test that would notice if it stopped.

They are now named exports, `contracts/web-practice.ts` builds and serializes
them, and `tests/web-practice-contract.test.ts` regenerates and byte-compares —
honouring `CONTRACT_WRITE=1`, guarding a sorted `CONTRACT_KEYS` list so a new
top-level key has to be declared in the same commit, and walking the built object
for `undefined` leaves, because the sing repository's builder silently serialized
`undefined` for two unexported constants and dropped both keys while every
equality assertion passed.

This is the first contract here that this repository *generates* rather than
follows. `learning.json`, `practice-tools.json` and `suede-vocal.json` are
vendored and the web app's job is to match them; `web-practice.json` is a record
of what the web detector and tempo grid actually do, so the reference direction
is inverted and the test compares the file against the code rather than the code
against the file.

Two things the work turned up, neither of which a pure equality check would have
found:

The published audible range cannot be derived from the tolerance factors. The
band is `60`–`1400` Hz and a refined estimate is allowed to land within ten per
cent outside it, so `minHz * 0.9` looks like the real floor — but the lag search
is bounded by `minHz` itself, so a note below 60 Hz has no candidate period to
find. `lowestAudibleMidi` is 35, not 33. The test plays a tone at the published
floor and confirms the detector names it, then plays one two semitones below and
confirms the detector never *confirms* that note; out of band it either reports
nothing or reports something else, which is the whole reason a lesson has to
respect the published floor. Low open E at MIDI 40 and the twelfth fret of the
high E at 76 both sit comfortably inside, asserted explicitly.

Only the grid's ceiling is checkable against the vocal contract from here. The
full vocal practice grid lives in the sing repository's `practice-parity`
contract, which this repository does not vendor; `suede-vocal.json` carries the
warmup tempos, whose maximum is `1.25`. The test pins that against
`TEMPO_MAXIMUM_RATIO`, so a learner practising guitar and voice in the same week
cannot find one app willing to push to 125 per cent and the other stopping
somewhere else. A separate test walks the recommender up from 25 per cent on
perfect scores and down from 125 on failures and asserts every recommendation
lands on a percentage the contract publishes, and that each walk settles on the
published bound.

### W16 — Re-sync `practice-parity` v2 into `Suede-AI/suede-voice`

That contract moved to version 2: the XP earn rate, all level rungs with titles,
and `mastery.minTempo`. Until the vendored copy moves, the native assertions
cannot see any of it, including the tempo gate that stops a quarter-speed pass
counting as mastery. The command is in the sing repository's
`contracts/README.md`.

This cannot be done yet, for a reason worth stating because it is easy to get
wrong. The re-sync fetches the file from the GitHub contents API without a `ref`,
which resolves to the default branch, and the sing repository's `main` still
carries version 1 — v2 exists only on
`claude/guitarhub-suede-voice-integration-9st9ur`. Running the documented command
today therefore vendors v1 and changes nothing, while looking like the item was
completed.

So W16 depends on the sing change reaching `main`. Fetching with `?ref=` pinned
at the unmerged branch would technically move the bytes and should not be done:
the point of a vendored contract is that it tracks a published reference, and a
copy taken from an in-flight branch is the silent-drift failure the contract was
built to prevent.

Once `main` carries v2, expect the native assertions to need updating rather than
merely passing. `progress.xpThresholds` grew from 12 entries to every rung and
each entry gained a `title`, so any native assertion that checks the rung count
or destructures a rung will need to move with it.

### W17 — Adjudication register

**Done.**

Fourteen constants expressed the same concept with two or three different values
across surfaces, with no test able to notice. Each was a decision rather than a
refactor: unify and let the loser fail, or record it with the reason. Leaving them
unresolved is the condition that produced most of the defects this document
records.

`contracts/adjudications.ts` is the register and `tests/adjudications.test.ts`
binds it. Each entry names the concept, every surface's value, the decision, and
a reason long enough to be one. Five decisions came out `divergent`, four
`unify`, two `recordedUpstream`, one `featureGap`, one `notComparable`, and one
`unify` that is finished rather than assigned.

The binding is the point. Each recorded value declares how it is held: `live` (a
constant here, imported by the test), `contract` (a value in a vendored contract
or this repository's lesson data, read at a named dotted path), or `observed`
(transcribed from the other repository, where nothing here can check it). Live
and contract values are asserted against their sources on every run, so a
constant that moves without its entry moving fails the build. A `unify` entry
without a `pendingOn` surface fails as a decision with no owner; a
`recordedUpstream` entry is checked against the vocal contract's
`knownDivergences` so it cannot claim a decision nobody made. Five probes
confirmed non-vacuity: a moved live constant, a moved contract value, the lost
reconciliation sentence, a `unify` stripped of its owner, and a runtime import of
the register each fail exactly one test.

That last guard earns its place. The register restates a dozen contract numbers,
which `docs/practice-tools.md` forbids doing in a configuration. The distinction
is that a configuration is read at runtime, where a stale copy changes behaviour
silently, while the register is read only by its test, which proves the
restatement still true. That distinction holds only while nothing else imports
it, so a test walks `app`, `components`, `lib`, `contracts` and `scripts` and
fails on an import — while deliberately allowing the comment in
`lib/audio/dsp.ts` that points at the register, which is the cross-reference
working as intended.

Nine of the fourteen carry a value that only a human has read. `OBSERVED_VALUE_COUNT`
pins that at nine, so it becomes a number that falls as the vocal contract grows
rather than a caveat nobody tracks. Every one of the nine also carries at least
one bound value, so no entry is inert: if this repository's side of a
disagreement moves, the register fails even when the other side is unverifiable.

**The two gates are answered in the register rather than here.**

W2 takes 50, not the guitar track's 35. Judging a sung note to 35 cents would
fail singers for an accuracy no module asks them to hold, and 50 is already
published as `pitch.sungToleranceCents`. The test asserts the answer names the
figure the contract publishes and that it fits the 1-to-100 range
`lib/learning/models.ts` validates, so the claim that no schema change is needed
is checked and not merely asserted.

W13 may tighten the staleness gate and must not widen it, and the 0.45-second
figure is not a budget to spend on analyser lag. The rhythm window and the
staleness gate are separate numbers; correcting bias in the first is not licence
to relax the second.

**Three entries worth reading for themselves.**

The accidental glyph is the only one whose losing surface is this repository, so
it is resolved rather than assigned. `noteName` keeps U+266F because that is the
correct typography; `asciiNoteName` emits the `#` the vocal contract declares,
and cross-surface comparison uses that. Picking one glyph for both jobs would
have made either the display wrong or the comparison impossible. The test also
asserts no flat spelling has appeared, because when one does this adjudication
needs a second half — voice work needs flats and this repository has none.

Grid snapping is recorded as a `unify` against sing because round-to-nearest is a
bug wearing the look of a preference: from a grid position, a five per cent step
rounded to nearest can return the tempo the learner is already at, so "ready to
increase" recommends no increase. Outward rounding always moves, which is the
whole point of a recommendation.

The clarity floors are `notComparable` and must stay that way. One minus a
cumulative-mean-normalized difference is not a normalized autocorrelation, so
0.5 here is not a looser 0.85 and neither is a looser anything of sing's. A
cross-surface assertion on "clarity" today is meaningless rather than merely
wrong, and unifying the thresholds without first unifying the definition would
produce a number that looks agreed and means nothing.

**What this does not do.** It changes no behaviour except adding
`asciiNoteName`, and it cannot make the four `unify` decisions happen: three wait
on sing and one on native. Recording an owner is not the same as moving the
value, and a reader should not take a green register as evidence that the
surfaces agree — only that they disagree in exactly the ways someone decided
they should.

### W18 — Type `proofMetric`

**Done.**

`proofMetric` was `string?`, validated as "a non-empty string" and read by
nothing. That is the hole the false claims came through: a module could declare
`rate_hz` for a vibrato rate nothing measures, or `flag_clear` for a strain check
no Suede surface performs, and validation passed. The contract work closed those
two by name; this closes the hole.

`lib/learning/proof-metrics.ts` holds the vocabulary as a closed union of
twenty-one values, each declaring its kind — `measured` (15), `selfReported` (3),
`mixed` (2), `unspecified` (1) — and `validateCurriculum` now rejects anything
outside it. Because `lib/learning/curriculum.ts` validates all three curricula at
import, an unknown value does not merely fail a test: the app refuses to boot.
Verified directly — importing the module with `rate_hz` planted in the data throws
`Unknown proofMetric: "rate_hz"` instead of loading.

The kind is the part that does work. The interesting question about a proof metric
is not its spelling but whether the app or the learner is judging, which is what
`lib/learning/voice-proof.ts` already records per voice module. A test asserts the
two agree across all 34 voice modules: a module whose basis is self-reported
because the measurement does not exist cannot carry a metric that claims one. That
is the exact shape of the defect the contract work found, now unrepresentable. A
`mixed` metric counts as claiming a measurement, because half of it is a reading
and a module carrying one is promising that half.

Five probes confirmed non-vacuity: a self-reported module given a measured metric,
an unknown value in the data, a changed kind in the registry, a union member
nothing uses, and the import-time refusal.

**Two corrections to this document.**

This section said the guitar track uses five values the voice track does not. It
uses ten, and the voice track uses six the guitar track does not; the two share
exactly `accuracy_pct` and `cents_deviation` — the two quantities both an
instrument and a voice can be judged on. The counts are asserted in the test so
the prose cannot drift back.

The field is also web-only. `contracts/learning.json` does not carry it at all,
which is a large part of why it could rot: there was no native side to disagree
with.

**Three things recorded rather than fixed.**

`composite`, on `g-l7-m6` — the unbroken three-song set — names no quantity. It is
the one `unspecified` value and the test pins that it is the only one. Stage seven
has no lesson bodies yet (W19), so it can be given a real metric when it is
authored; inventing one now would be guessing at a lesson nobody has written.

`three_pass_pitch_slots_at_90_bpm` carries a tempo inside a metric name. The tempo
belongs in the practice specification. Renaming it touches authored catalog data
for no behavioural gain, so it is flagged in the registry and left.

`beginner-guitar-instruction.json` carries `integrationNote.recommendedModuleMetadata`,
with a recommended `proofMetric` per module — and **nothing in `lib/` or `tests/`
read `integrationNote` before this work**. Three recommendations have sat
unapplied and uncontradicted: `g-l1-m1` carries `count_in_window` against a
recommended `open_string_pitch_and_self_check`, `g-l1-m2` `duration_sec` against
`six_string_tuning_check`, `g-l1-m3` `recall_pct` against
`reading_quiz_first_attempt`. All three recommended values are in the union, so
the vocabulary is shared, and a test pins the three disagreements so a fourth — or
one of these resolving — shows up in review. Adopting them changes what a module
promises, which is a native authoring decision and not a typing one.

**What this does not do.** The union types the vocabulary in use; it does not
redesign it. Nothing reads `proofMetric` to decide what to render or score, so a
module still cannot be checked against the proof it claims except through
`voice-proof.ts` on the voice side. The guitar track has no equivalent table, so
its kinds are asserted against nothing but the registry itself.

### W19 — Guitar stage seven has no lesson bodies

Eighteen lessons under `g-l7-*` are in exactly the state the voice track is in.
Same pipeline as W1 and the same native gate; worth sequencing together. Easy to
overlook because the outline problem is framed as a voice problem.

W18 left one thing waiting here: `g-l7-m6` carries `composite`, the only
`proofMetric` in the vocabulary that names no quantity. Authoring these lessons is
the moment to replace it with a real metric, and `lib/learning/proof-metrics.ts`
pins that it is the only one, so a second unnamed quantity cannot slip in
alongside it.

### W20 — A voice song catalogue is not expressible

The lesson identifier pattern in `lib/learning/models.ts` admits `g-songs` and
has no `v-songs` branch, so a voice analogue of the song-companion catalogue
cannot be authored without a schema change, which is native-side.

The sing repository owns 26 public-domain melodies with real note data and a
per-song licensing justification. That is the one song corpus that can legally
ship inside a lesson, and it is what the voice song lessons lack.

### W21 — Unenforced prerequisites

`prerequisiteLessonIds` is authored on all 117 guitar instruction records and
referenced by no code. Either enforce it or mark it documentation.

### W22 — Mastery records carry no conditions

In the sing repository, mastery is now gated on tempo but the stored record
remains a bare array of song identifiers. Nothing records the tempo,
transposition or content version a song was mastered under, so the gate cannot
be re-evaluated and a historical mastery cannot be audited. This repository
voids a completion when the authored spec revision changes; the sing repository
has no equivalent.

### W23 — Retire the outline copy and settle the taxonomy

Three surfaces state that the voice track is outlines — `LearningPath.tsx`,
`LessonLibrary.tsx` and `app/learn/page.tsx` — and all become false when W1
lands. Two `StageTwoPractice` panel headings are hardcoded to guitar wording.

Separately, the sing repository's classifier returns six of its eight published
categories; bass-baritone and countertenor are unreachable outputs. Tests prove
every reachable label has a passaggio zone and a reference band to route to, and
the gap is recorded. Whether bass-baritone joins the classifier is an open
decision, and taking it would re-label existing users.

### W24 — Shared glossary

The sing repository has 31 tested terms with stable anchors and `DefinedTerm`
structured data. This repository has no glossary and ships `passaggio`, `mix`,
`twang` and `pressed phonation` to beginners undefined.

Four words collide across the two instruments. `register` means a vocal
mechanism and a guitar octave. `support` means breath management and holding the
instrument, and is the worst by volume. `tone` carries four senses and `mix`
three. A shared entry therefore needs a domain field; one word cannot be one
entry across both.

The mechanism should follow the one already load-bearing here: the sing
repository emits the term set as static JSON and this repository vendors it with
a `--check` byte comparison. Only the sing repository should emit the
`DefinedTerm` structured data, because two sites competing as the definitional
source for one term is self-harm. Expect roughly 50 terms rather than 31.

### W25 — Reuse the editorial content

The sing repository holds 72,394 words of atlas across 27 chapters, 31,738 words
of book across 23, 636 singer records with written technique paragraphs, and 24
popular songs with key and range. The voice track names no repertoire at all. A
module-by-module mapping already exists: range and voice type to the atlas band
table, breath to the breath chapter, registers to the registers chapter, belt
safety to the safety-rail chapter, vocal health to stamina and health.

It runs both ways. This repository's four-stage method states an exit test per
stage, has a named-blocker diagnostic at `/diagnose`, and argues explicitly
against streak counters. The sing repository's twelve-week programme has none of
those, and its progress page sells streaks.

### W26 — Cross-application vocal progress

Stateless deep links are shipped; nothing else crosses. The options are an
export and import handoff, for which both halves exist and only a format plus a
session-to-lesson mapping are missing; a shared progress-shape contract; and
shared identity.

The deepest blocker is semantic rather than authentication. The sing repository's
record is a snapshot of activity-typed sessions carrying XP and streaks. This
repository's is an append-only attempt ledger keyed to authored lesson
identifiers and meaningless without the curriculum, and `parseLearningAttempt`
rejects any lesson identifier outside `allowedLessons`. A session cannot become
an attempt without a mapping that does not exist. Do the contract before shared
identity; identity without it gives one user two incompatible voice records.

### W27 — Identity and entitlement

Deferred while the product is not charging. Recorded so the blockers are not
rediscovered.

The identifier spaces are disjoint: `accountUUID` throws on anything that is not
a canonical UUID, so a Clerk identifier cannot be stored, and the email sign-in
path runs `shouldCreateUser: false` so it cannot provision a user for a sing
customer. The origins differ, so no storage is shared and no bridge exists in
either repository. The rails differ — Stripe there, Apple in-app purchase with a
pinned bundle here — and neither can produce the other's proof.

When this resumes, model entitlement as products rather than applications.
`LearningTrack` is already that shape and should be reused rather than a second
vocabulary invented, and the existing Pro key should remain a migration path so
lifetime buyers are honoured without re-purchase.

### W28 — Keyword self-competition

Six pairs of pages in this repository compete on one query each: effective
practice against deliberate practice, practice schedule against daily duration,
the intermediate routine against the schedule, the 30-day guide against the
30-day plan builder at `/breakthrough`, the plateau guide against `/diagnose`,
and two resources on clean tone. The sing repository has three clusters of its
own. Across the two, a voice curriculum is published from a domain whose name
says guitar, targeting the same intent as the sing rooms. Consolidate or
differentiate deliberately.

### W29 — Server-side enforcement of the free allowance

In the sing repository the daily guided-practice cap is measured from the local
practice log and enforced entirely client-side, so clearing browser storage
resets it. Only the long-form content and cloud sync are genuinely protected.
Deferred with W27 because it is a monetisation control. Noted because it is easy
to mistake for a security finding later.

## Sequencing

W21, W22, W24, W25 and W28 have no dependencies and can start immediately. W14 is
done for the one contract it can cover and blocked on native access for the other
two. W15, W17 and W18 are done; W2 and W13 can now read their constants off
`contracts/adjudications.ts` instead of re-deriving them, and W2's new voice specs
will be held to the typed vocabulary at import.

W16 is the exception among the otherwise-unblocked items: it waits on the sing
repository's version 2 reaching `main`, because the re-sync resolves the default
branch. It is cheap once that lands and is a no-op before it.

W3 is next and gates W1, W2, W19 and W20. W5, W6, W4 and W7 are independent of
W3 and can run in parallel; W5 retires the most modules per unit of work and W6
must ship behind latency correction. W8, W13 and W26 follow. W9 is last. W10,
W11, W12, W27 and W29 are decided against or deferred.

## Verification

The two repositories have opposite conventions and getting them wrong is the
commonest way a change here looks complete and is not.

This repository globs exactly `tests/*.test.ts`, flat and non-recursive and
TypeScript only, so a test at `tests/sub/x.test.ts`, `tests/x.test.tsx` or
`lib/x.test.ts` is never run. It uses `node:test` with `node:assert/strict` and
imports sources with an explicit `.ts` extension. The sing repository uses
Vitest, collects colocated `*.test.{ts,tsx,mts,mjs}` anywhere, and imports
without extensions through its `@/` alias.

From this web root:

```sh
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
node scripts/check-account-bundle.mjs
```

CI has no `tsc --noEmit` step, so type coverage arrives only incidentally
through the build; run it by hand. The unit suite runs with no `node_modules`
installed at all, and only the React-rendering and StoreKit suites need an
install, which makes a contract check cheap. `npm ci --offline` fails because the
cache is incomplete.

In the sing repository, regenerate a contract after any reference constant moves
and commit the JSON with the change:

```sh
CONTRACT_WRITE=1 npx vitest run contracts/suede-vocal.test.ts
```

Hold new guards to the standard the existing ones were built to. Every guard
added so far was checked by reverting its fix and confirming the test named the
exact prior value. A capability claim can rot without any number changing, so
`contracts/suede-vocal.test.ts` asserts against source that the sustain drill
reads frame volume and not fundamental frequency, and that the detector still
returns one result or null.

## What this document does not establish

Nothing here is a browser, device or acoustic acceptance result. The parity and
contract tests are unit and server-render tests over vendored data and public
accessors; they do not establish microphone accuracy, timing latency or sound
quality on physical hardware, and they do not prove keyboard or screen-reader
interaction.

Statements about the native surface are inferred from the generated contracts
rather than read from that source, and should be confirmed against it before
anyone commits to a date for W3, W13 or W20. Counts and file-level claims were
read from the two repositories on the branch named above and will drift as the
work lands.
