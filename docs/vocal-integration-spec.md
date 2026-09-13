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

The measurement is done in the sing repository as `lib/audio/vibrato.ts`, with
`lib/audio/vibrato.test.ts` beside it. Rate in hertz and extent in cents are
reported separately and neither implies the other. Extent is the peak-to-peak
width of one cycle, so a vibrato described elsewhere as "±50 cents" reads as 100
here. Onset is kept out of both: the first 250 ms of the held note is excluded
from the analysis and the excursion inside that window is reported on its own as
`onsetSettleCents`, because a scooped entry counted as vibrato is how a straight
tone gets a rate.

What the numbers establish is that the voiced contour of the take's longest held
note carried a periodic modulation at that rate and of that width, after its
onset and any slide were removed. They do not establish that the modulation came
from the larynx, and nothing here separates a healthy vibrato from a wobble
caused by strain — that is W9.

A trace must be fast enough to carry the whole 3.5–9 Hz band before any rate is
reported, which the live 60 fps loop is and the offline take pass, hopping 2048
samples, is not. So vibrato is measured from the live trace; the take summary
carries the voiced-run number from W5 and not this one.

Remaining, on top of the measurement: the sing contract needs `vibratoRateHz`
moved from `no` to `yes` with the module named, and a second key for the extent,
since one key cannot carry two units. `v-l6-m3` promises only that the singer
switched from straight tone to vibrato on cue, which the measurement does
support, so it can then be retired.

### W5 — Longest unbroken voiced run

The measurement is done in the sing repository as `lib/audio/voiced-run.ts`,
tested beside it, and `analyzeTake` now returns `longestVoicedRunSec` for a
stored take. `maxCombo` remains no substitute: it counts targets hit, so it
resets on a wrong note sung beautifully and cannot tell a singer who stopped to
breathe from one who sang out of tune.

The number establishes exactly one thing: the longest stretch of the take during
which the detector reported a confident fundamental on every frame, spanning
unvoiced gaps no longer than 60 ms, which is about three frames and is a dropped
frame rather than a breath. Gaps that are spanned stay inside the run and count
toward its length.

It is not the absence of a register crack, and the tests assert the difference
both ways: a siren that cracks audibly stays voiced throughout and scores one
run of its full length, while a clean siren with one quiet catch of breath scores
two. It is also not proof the singer did not stop — a whisper or a long consonant
ends a run — and it says nothing about pitch or key.

That narrows what this retires. Of the four modules listed for it, only `v-l6-m5`
promises what the number establishes, eight bars sung without stopping.
`v-l3-m2` claims a slide heard as continuous, which is the register claim the
measurement explicitly does not make; `v-l5-m5` claims key adherence in free
singing and `v-l6-m4` claims ornament classification, neither of which is a
voicing measurement at all. Those three stay self-reported and want re-keying off
`unbrokenPhraseLength`. The contract key `unbrokenPhraseLength` moves from
`adaptable` to `yes`.

### W6 — Onset timing error

The measurement is done in the sing repository as `lib/audio/onset-timing.ts`,
tested beside it. Onsets are found two ways, the voice arriving after silence and
the pitch stepping a held note to a new one, because a detector that only watched
for silence would miss every note inside a legato phrase. The error is signed
milliseconds, negative for early, which is the whole point: a singer 40 ms ahead
of the click every time and a singer scattering 40 ms either side of it have the
same unsigned error and need opposite advice.

The correction is not optional in the code. `signedOnsetErrorMs` takes the two
lags `lib/audio/latency.ts` models as a required argument and returns null rather
than a figure without them, and matching onsets to beats happens on corrected
times, since the nearest beat to an onset reported 290 ms late is frequently the
next one. A test asserts the size of the error that correction removes.

What the number cannot do is resolve finer than about 30 ms, published as
`ONSET_RESOLUTION_MS`. One frame is 17 ms, the voicing gate opens a frame or two
into a note, and the model covers the analysis and output paths but not the
hardware capture path, for which no browser reports a figure. A reported error
smaller than that floor means on time, not a direction.

The contract key `onsetTimingError` moves from `adaptable` to `yes`. Of the two
modules listed, `v-l4-m2` promises a phrase returned on the beat against a click,
which this supports. `v-l4-m4` promises that three articulations were produced
and are audibly different, which is articulation detection and not onset timing;
it stays self-reported and wants re-keying.

### W7 — Register mechanism

**The measurement is done; the module is not retired and must not be.**

`lib/audio/register-mechanism.ts` in the sing repository measures H1−H2, the
amplitude difference between the first two harmonics of a voiced frame, in the
analyser's own decibels, and places it on one boundary with an explicit
abstention path. `lib/audio/register-mechanism.test.ts` covers the arithmetic,
the gain invariance, every abstention and the latch, and every guard and
threshold in the module was broken one at a time to confirm a test catches it.

The claim that the iOS app already had a single-boundary implementation to match
was false, and the note on the contract's `registerMechanism` row repeats it.
`guitarhub-ios` contains no spectral analysis at all: its estimator at
`GuitarHubCore/Sources/GuitarHubCore/Audio/YINPitchEstimator.swift` is
time-domain autocorrelation over vDSP, and its only vocal surface,
`GuitarHub/Practice/VocalRangeView.swift`, plots f0 and latches range extremes.
There is no H1−H2, no open quotient and no register code anywhere in it. The
boundary was therefore chosen here rather than matched, is exported as
`M1_M2_BOUNDARY_DB` at 6 dB, and is unvalidated against any recording.

The taxonomy resolves against the lesson rather than in its favour. H1−H2 reads
open quotient, which separates the heavier laryngeal mechanism from the lighter
one — M1 from M2, modal from falsetto. The pedagogical "chest" and "head" of
`v-l3-m1` both sit inside M1 and differ in resonance, so no H1−H2 boundary can
tell them apart and no smoothing will make it. Of the three things in conflict,
the three-mechanism framing is the one that cannot be measured and the binary
measurement is the one that is correct. The module promise of two is already the
right shape and needs only to name the right two: `v-l3-m1`'s promise should
become a chest-to-falsetto switch, the concept lesson may keep teaching three
mechanisms as taught material, and the checkpoint may only be scored on the
M1↔M2 crossing. Until that copy lands the module stays `self_reported`.

What a follow-up must apply, all of it in files held by other work: in
`contracts/suede-vocal.ts` and `contracts/suede-vocal.json`, the
`registerMechanism` row becomes `measurable: "adaptable"` with
`module: "lib/audio/register-mechanism.ts"` and a note saying that H1−H2 exists
as a pure function against one unvalidated boundary but no surface computes it
from a live take; and in `lib/learning/data/voice.json`, `v-l3-m1`'s promise is
reworded to the two mechanisms the boundary can separate. Not `"yes"`: nothing
in the app calls the function yet, and the row is named for a mechanism
classification that a single boundary does not provide.

Synthetic spectra establish nothing about real voices, microphones or rooms.

### W8 — Vowel and formant tracking

**A measurement now exists in the sing repository. It retires none of the three
modules this item was written to retire.**

The original scope said this retires `v-l3-m3`, `v-l5-m2` and the style half of
`v-l7-m2`. It does not, and the reason is worth recording rather than
rediscovering. Formant frequencies cannot be estimated honestly from a consumer
microphone on a sung note — least of all on a high voice, where the harmonics are
spaced wider apart than the formants they would have to reveal — so a vowel
identity or an F1 and F2 readout would be a number that is confidently wrong
often enough to be worse than no number at all. What is defensible from the same
signal is a self-relative comparison, and that is what was built.

`lib/audio/spectral-envelope.ts` in the sing repository reads the level of each
harmonic of the detected fundamental, interpolates a spectral envelope through
those samples, removes the frame's own mean so loudness and microphone distance
drop out, and reports the RMS deviation in decibels of the per-frame envelopes
from their own mean across a window. That number says whether the vocal tract
shape held still during a sustained note. It is not a vowel, not a formant
frequency, and not comparable between two singers or against a target, because a
microphone, a distance and a room are all inside it.

It abstains rather than guessing, which is a deliberate feature and not a
shortcoming. It returns no reading above roughly 583 Hz, a shade under D5, where
fewer than six harmonics fall in the 300–3500 Hz band the envelope is read
across; that covers sopranos through most of their upper range, tenors at the top
of theirs, and anyone in high head voice or whistle register. It also abstains
when the pitch moved more than a semitone across the window, because a change in
the envelope would then be partly the pitch and partly the singer and this
measurement will not pretend to separate them, and when too few frames are
readable. A surface consuming it must render an abstention as no reading rather
than as a low score.

That leaves the three modules where they were. `v-l3-m3` promises one phrase on
five vowels with consistent tone, which is a comparison across deliberately
different tract shapes and is exactly what an envelope-hold figure cannot judge.
`v-l5-m2` promises a crossing from primo to secondo on three vowels, which moves
the pitch across the break and so lands in the abstention case twice over.
`v-l7-m2` is a stylistic judgement. All three stay self-reported, and the pin of
19 does not move on this item.

What the measurement does unblock is a module, not yet written, that asks a
singer to hold one vowel steady on one sustainable note and reports how far the
shape drifted. That is a real promise this surface can keep.

### W9 — Strain and pressed phonation

**Decided rather than pending. No strain measurement was shipped, and the four
checkpoints — `v-l3-m5`, `v-l5-m4`, `v-l7-m3`, `v-l7-m4` — stay self-reported
permanently until the conditions at the end of this section are met.**

What a real measurement needs is jitter, shimmer, harmonic-to-noise ratio or
cepstral peak prominence, none of which exists in any Suede surface, and then a
threshold. **The threshold is the blocker, not the signal processing.** Any of
the four primitives can be computed from a frame buffer by somebody who reads
the literature for an afternoon. None of them means anything to a singer until a
cutoff separates a voice that is working hard from a voice that is being damaged,
and that cutoff cannot be chosen in a commit. It would be derived from an
uncalibrated consumer microphone, in an unknown room, on an unknown gain chain,
and then shown to somebody as a verdict about their body. Recording the gap as
decided is not pessimism about the DSP; it is a refusal to invent the number that
would make the DSP mean something.

`ringRatio` is prohibited, and now guarded. It is the share of plotted energy in
a fixed 2800–3200 Hz band — genuine, shipped, and self-relative, which the
vendored contract states in as many words and which makes it meaningless against
a target, another singer, or a notion of safety. It is also exactly the shape of
thing somebody reaches for under deadline: one number, higher on a bright
forward tone, that looks like it might say something about effort. Shipping it as
a safety verdict would be the most harmful available version of this gap, because
the failure mode is a singer who keeps going on the strength of a reassurance
nothing could have earned.

So the decision is bound by tests in both repositories rather than recorded in
this paragraph. `tests/voice-strain-prohibition.test.ts` here and
`contracts/strain-prohibition.test.ts` in the sing repository assert:

- the contract's `strainOrPressedPhonation` row stays `measurable: "no"` with no
  module and no unit, keeps naming all four primitives it lacks, and keeps the
  sentence forbidding the substitution;
- `ringRatio` keeps saying it is self-relative and not a strain measure, and
  `unsupportedClaims["strain-free-verdict"].useInstead` stays empty — an empty
  substitute list is the prohibition in machine-readable form, since every other
  unsupported claim can name the measurement a lesson should have used and this
  one cannot;
- the set of modules resting on an unmeasured strain verdict is exactly those
  four, each still `selfReported` against `strainOrPressedPhonation` with
  `proofMetric: "self_reported"`, so a fifth module gating on strain is an edit
  somebody has to make deliberately;
- no resonance share — `ringRatio`, `bandRatio`, the band constants, or the words
  "ring band" and "resonance share" — appears in the same statement as a strain,
  safety, health, damage, injury or hoarseness claim anywhere under `app`,
  `components`, `lib`, `contracts` or `scripts` in either repository. Denials at
  the level of the metric ("not a strain measure", "says nothing about strain")
  pass, because that is the honest thing to write. Reassurance about the singer
  ("no strain", "strain-free", "safe to sing") fails even when a denial sits in
  the same sentence, because that phrasing is the substitution rather than a
  statement about it. A narrower companion assertion catches the binding form,
  where a verdict-named symbol takes a band ratio as its value and nobody writes
  a sentence at all;
- the four modules' own copy — promises, skills, lesson titles and summaries —
  never implies a reading confirmed safety. This found one live defect: the belt
  module's opening lesson was titled "The Difference You Can Hear and Measure",
  on the one module in the track whose checkpoint cannot be measured at all. It
  is now "The Difference You Can Hear";
- the safety copy is still rendered where a singer reaches a voice lesson, in
  both the outline branch and `LessonSession`, rather than merely still existing
  as a constant. That is the failure the note was written for: it lived in the
  branch no voice lesson mounts and rendered nowhere for the whole track;
- jitter, shimmer, HNR and CPP cannot appear next to a safety claim in the sing
  repository either, so the primitives cannot arrive quietly ahead of the
  threshold and start meaning something.

Every one of those assertions was probed by planting the violation it forbids,
confirming the failure, and restoring: a contract row promoted to `measurable:
"yes"`, a substitute added to the strain-free claim's `useInstead`, `v-l5-m4`
promoted to `measured("ringRatio")`, the misleading lesson title restored, a file
computing a safety flag from `ringRatio`, the module caution deleted, and the
track note's render removed.

**The safety hedge `v-l5-m4` needed regardless is in.**
`MODULE_SAFETY_NOTE` in `lib/learning/curriculum.ts` carries a per-module caution
in the same register as `TRACK_SAFETY_NOTE`: it names the symptoms to stop on and
says that nothing here can tell a singer whether the attempt was safe. `v-l5-m4`
has one because it instructs a six-second sustain at the top of the passaggio, on
a free stage, and grades it on an absence of strain nothing is watching for;
`v-l7-m4` has one because it asks for creak, growl and scream on the same terms
and its own proof basis already says it carries real injury risk. Both render in
the outline branch and in `LessonSession`, so the caution does not depend on
which branch a lesson takes — the mistake that cost the track note its audience
once already.

No voice-quality primitives were added. They were permitted as a threshold-free,
verdict-free, unwired module, and the judgement was that honest jitter, shimmer
and HNR need reliable period marks, which live in `lib/audio/pitch.ts` and
`lib/audio/f0-trace.ts` — both being rewritten in this round's other work. An
unvalidated primitive sitting in `lib/audio` with no caller is also the raw
material for precisely the substitution these guards exist to prevent, and it
buys nothing until a threshold exists. Skipping it is the smaller risk.

What a future implementation would have to establish before any of this changes,
in order:

1. a primitive computed in the sing repository from period marks the pitch
   tracker actually publishes, with its own tests, no threshold and no caller;
2. a validated threshold — validated against labelled recordings and a published
   method, not against one author's ear, and stated with the population and the
   recording conditions it holds for;
3. a statement of what the threshold does **not** cover, since an uncalibrated
   browser microphone in an unknown room will not reproduce whatever conditions
   the validation used;
4. the contract's `strainOrPressedPhonation` row promoted in the same commit as
   the module that implements it, which these tests force;
5. only then a checkpoint promoted from `selfReported`, and the safety copy stays
   on the page regardless, because a measurement that can be wrong is not a
   reason to stop telling a singer what to stop on.

Short of all five, the correct state is this one: the gap open, the reason
recorded, the substitution unavailable, and the singer told the truth about what
the page can see.

### W10, W11, W12 — Calibrated loudness, polyphony, diction

`v-l4-m5` wants absolute loudness, `v-l7-m6` wants a harmony measured against a
simultaneous lead, and `v-l4-m3` wants intelligibility. Calibration needs
hardware assumptions a browser cannot make, polyphonic tracking is a rewrite of
the detector, and intelligibility scoring is a different product.

The recommendation is to record all three as decided rather than pending and
reword the lessons, which gives the pin of 19 a documented floor of four modules
that will not move.

### W13 — Latency compensation

**Done in the web scorer; the native scorer has to make the same correction
before the two surfaces agree about a timeline again.**

There was none in this repository beyond `latencyHint: "interactive"`, while
rhythm mode scores attack timing inside half a beat of the target. Nothing in the
chain is instantaneous: a guide is heard after it is scheduled, and an attack is
timestamped when the audio graph renders the block it arrived in rather than when
it reached the microphone. Both delays push a captured attack later, so the error
is a bias rather than jitter and does not average out over an exercise.

The size of it is arithmetic once it is written down, and
`tests/audio-latency.test.ts` states it: credit falls off linearly across the
half-beat window, so a path of `lag` seconds costs every target
`lag / (0.5 beats)` of its credit. At 100 beats per minute an unremarkable 80
millisecond path — a reported output latency in the forties plus input buffering
— turns a performance that was in time into 73 out of 100, which fails an
80-point checkpoint. Bluetooth output, which routinely reports 150 to 300
milliseconds, fails it outright.

Only one direction of the exchange is done. `lib/audio/latency.ts` adopts the
sing repository's module rather than inventing a second one: `outputLagSec` is
its function, and the rule that a guide lag and a capture lag add rather than
cancel is its `scoreLagSec`. What is new is the
detector half. sing corrects an analyser window and a median filter over pitch
frames; guitar practice scores onsets, and `OnsetDetector` names the centre of
the frame whose energy rose, which lands one to two 128-sample hops *before* the
attack. Measured against synthesized plucks that is 2.7 milliseconds early at
48 kHz and at most 5.6 at 44.1 kHz — the opposite sign from the platform path and
an order of magnitude smaller — so it is bounded by
`ONSET_REPORT_TOLERANCE_SEC` and a test rather than compensated for.

`scorePractice` now takes a fourth argument, `scoreLagSeconds`, and moves rhythm
observations back by it before they meet the beat grid. It defaults to zero, so a
caller with nothing to report behaves exactly as it did rather than being
compensated by a guess, and it is clamped by `MAXIMUM_SCORE_LAG_SEC` (0.25
seconds), past which a claimed latency is likelier a broken report than a path
and shifting a timeline would stop correcting a bias and start inventing a
performance. `RHYTHM_WINDOW_BEATS` is now a name instead of an inline `.5` in two
places, and both constants are serialized into `contracts/web-practice.json`
under `rhythmScoring`; the regeneration added keys and changed no existing value.

The other direction is still open: sing has no equivalent of this repository's
`claimAudioSession` and lifecycle binding, so two of its surfaces can still hold
a microphone at once. Porting that is a change to sing's audio modules and was
left alone here rather than done halfway.

`PracticeCoach` reads the capture path's reported length when capture opens and
passes it in. The scored run is guided by the on-screen cue rather than by a
click, so only the capture term applies there, and the published contract says so
in `compensatesVisualCuePath: false`: the time a cue takes to be drawn,
composited and seen is real and is not compensated, because nothing here measures
it and a guessed constant would move every score.

No fixture was invalidated. `contracts/practice-tools.json` is native-generated
and carries metronome, click-synthesis, tuner and tempo fixtures but no rhythm
*scoring* fixtures, so nothing in it had to change and nothing in it was touched.
What native owes is not a regeneration but the same correction: `AdaptiveDifficulty`
and the native rhythm scorer have to subtract the iOS output and input path — the
values `AVAudioSession` reports as `outputLatency` and `inputLatency` — from
their own observation times before comparing with the grid, and they have to use
the same half-beat window and the same 0.25-second ceiling. Until they do, the
same performance scores differently on the two surfaces, and the web number is
the correct one.

W17's `frameStaleness` entry settled the one constant this work would otherwise
have had to decide on its own, and it is honoured literally: `guitarPractice.maximumAge`
is still 0.45 and is native-owned, `MAXIMUM_SCORE_LAG_SEC` is well under it, and
a test asserts both so that compensating the scoring window cannot be read as
relaxing the staleness gate.

What the tests do not establish: they are unit tests over synthetic observations
and a synthesized pluck. They establish that the scorer is biased late when handed
a delayed timeline and unbiased when told the delay, and they bound the detector's
own timestamp error for a signal whose attacks are exactly known. They establish
nothing about real-device output latency, microphone accuracy, or timing on
physical hardware; no measurement in this repository has touched a guitar. The
bias is corrected arithmetically, not measured away.

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

**Done. Decided as documentation, and enforced as an oracle.**

`prerequisiteLessonIds` is authored on all 117 guitar instruction records and was
referenced by no code at all — not a component, not a route, not a test. The
question was the right one: enforce it, or mark it documentation.

**It is not an access gate.** The decisive reason is that a visitor with no
progress satisfies the prerequisites of exactly one lesson in 117. A guest on a
deep link, a crawler, anyone who cleared site data — under a gate, `g-l1-m1-01`
renders and the other 116 do not, which makes the twenty-two deliberately open and
indexable lessons open in name only. Two more reasons, each sufficient on its own:
completion lives in `localStorage`, so a gate is bypassed by anyone who wants to
and locks out only the honest learner on a new device; and a prerequisite here
means "this makes more sense after that", which is advice, while the thing that
must not open early is paid content, which `canOpenModule` already decides on
entitlement.

**But documentation nothing checks is a comment in a data file**, so the graph is
now enforced — as a consistency oracle over the catalog rather than a gate on the
learner. `nextLessonId` advances through lessons in catalog array order and
ignores the graph entirely, which makes the two independent statements of the same
pedagogical order, so the authored one can check the implicit one. Reorder a
module's lessons and put one before its prerequisite and
`prerequisiteOrderViolations` returns it and the test fails. That is the graph
doing real work: not stopping a learner, but stopping a reordering that would send
one somewhere they are not ready for.

`lib/learning/prerequisites.ts` holds the policy in code — `isAccessGate: false`,
and a pointer to the gate that does decide — plus functions that return what is
wrong rather than throwing, so the test reports the whole list. The graph is
verified today to be complete over all 117 records, free of dangling references and
orphans, acyclic, consistent with catalog order, and to have exactly one entry
point, with ten lessons deliberately requiring more than one predecessor. Two
tests put teeth on the policy: `lib/learning/access.ts` and
`lib/learning/curriculum.ts` must not mention prerequisites at all, and no module
anywhere may both import the graph and talk about access. Four probes confirmed
non-vacuity, including the one that matters — reversing a module's lesson order
fails the oracle and nothing else.

**A correction this turned up in its own first draft.** The policy note originally
justified itself by claiming a free lesson already depends on a closed one.
Writing the test disproved it: none does. Every cross-level edge — `g-l5-m1-01`
requires `g-l4-m5-07` — sits inside paid content, so that failure is one authored
edge away rather than present. Both facts are now asserted: that no open lesson
depends on a closed one, and that the graph does cross module boundaries, so the
risk is recorded as latent instead of overstated.

**What this does not do.** No UI shows a learner their prerequisites, and nothing
in the product behaves differently. The graph's only consumers are its own tests,
which is the intended end state for documentation — with the difference that it can
no longer be quietly wrong.

### W22 — Mastery records carry no conditions

**Done, in the sing repository.** Nothing in this one changed.

Mastery was gated on tempo but the stored record stayed a bare array of song
identifiers, which made the gate unfixable after the fact: every record already
on disk had been earned under no tempo floor at all — possibly at quarter speed,
every note four times easier to hold in tune — and was indistinguishable from a
clean pass at written tempo. Fixing the rule did not fix the records the rule had
been wrong about, and nobody looking at a mastered badge or a band unlock could
ask what run earned it.

Records now carry the tempo the run ended on, the score, the transposition and a
fingerprint of the melody as it was, and `masteryHolds` applies today's constants
when the record is read. Raising `MASTERY_SCORE` or `MASTERY_MIN_TEMPO`
retroactively stops counting what no longer clears it, with no migration; singing
a song again at tempo upgrades a record that had stopped counting.

**It mirrors this repository's `practiceSpecRevision` handling deliberately**:
keep the record, re-judge it on read, demote rather than delete — `parseProgress`
here turns a completion whose revision no longer matches into `"repeat"` rather
than dropping it. Two differences are deliberate. Songs carry no revision integer,
so a melody fingerprint plays that part, computed over pitch, onset, duration and
note count only — a corrected transcription invalidates an audit, a fixed syllable
break does not. And transposition is recorded but never gated, because fitting a
song to your own range is the point of the transpose control, not a way around the
scorer.

v1 records are honoured rather than revoked: the app failing to write down the
tempo is the app's cost to carry, not the singer's, so a returning singer keeps
their band unlocks — but `isVerified` reports false and the conditions stay null,
so nothing claims a check that never happened. A v2 record wins over the same song
in v1, so a legacy id cannot launder a run today's rule rejects. Mastery also
moved to a new storage key rather than upgrading the old one in place: writing
records into the v1 key would make a rollback to an older deploy read them as ids,
find none, and wipe every band unlock.

Two things are reported rather than enforced, on the same reasoning as W21.
`staleMasteries` names a mastery earned on a melody that has since changed;
whether a transcription fix should cost a singer their unlock is a product
decision, and this is what makes it takeable later instead of impossible to take
at all. And no UI yet shows a singer the conditions their mastery was earned
under, though the record is now there to show.

`contracts/practice-parity.ts` is untouched and needs no native re-sync: it
publishes the gate, which has not moved, and the record shape is local storage
rather than a cross-surface promise.

### W23 — Retire the outline copy and settle the taxonomy

**Done. The copy is guarded rather than retired, and the taxonomy decision is
escalated rather than taken.**

W1 has not landed: `lib/learning/data/voice-instruction.json` does not exist,
`lib/learning/instructions.ts` spreads only the three guitar sources, and
`isLessonReady` is false for all 102 voice lessons. The outline statements are
therefore still true, so deleting them would have replaced a true sentence with a
promise this repository cannot keep. `tests/voice-outline-copy.test.ts` is the
deliverable instead: it ties each statement to the readiness it claims, so the
day a voice record is authored the build says which sentence is now a lie.

Surveying every place that says "outline" or "preview" changed what the work is.
Eight of the nine derive the word from `isLessonReady` per lesson or per level —
the stage badges, the per-lesson annotations, both library badges, and the lesson
page's own heading and notice — and retire themselves. Exactly one is an
unconditional claim about the whole track, `LearningPath`'s "Voice currently
contains curriculum outlines.", and it is the only sentence a person has to
rewrite. `app/learn/page.tsx` turns out to carry no voice-specific claim at all:
its "written lessons and curriculum outlines" sentence is about both tracks and
stays true while guitar stage seven has no lesson bodies (W19), and its voice card
already counts what a guest can open rather than asserting a number. The tests on
the derived eight are not padding — they are what makes leaving those surfaces
alone safe, and they fail if a later edit swaps a derivation for a fixed word.

Every assertion is an equality between rendered markup and what `isLessonReady`
reports, never a match on the wording alone, so a sentence that drifts fails and a
sentence that outlives its premise fails too. The badge checks run on both tracks
because guitar carries stages of both kinds, and the set of files making a
track-wide claim is pinned so a fourth surface cannot quietly acquire one. Proven
by authoring one voice instruction record and wiring it in exactly as W1 will:
three of the seven tests fail, and the decisive one names the lesson that is now
ready and the file to edit.

The two `StageTwoPractice` headings were wrong in both directions. "A chord
accuracy cycle" and "Keep a light index-finger anchor" read wrongly on a voice
lesson, where `instruction_diagram` and `step_diagram` are both authorable, and
they were already wrong for guitar: seventeen of the nineteen authored panel
assets carry their own `name` and every one of them rendered under the
accuracy-cycle heading, because `decodeStageTwoAsset` dropped the field. It now
decodes it, the authored heading wins, and the two fallbacks name what the
renderer draws without naming an instrument. Four probes confirm each half.
Still guitar-shaped in that component and out of scope here: the anchor caption's
"loosen your hand", the timing checkpoint's "strums", the study's "A/D study",
and `useStageTwoProgress("guitar")`, which W1 already records as the reason two
asset kinds must not appear on a voice lesson.

**The taxonomy is left as recorded, and the open half is for the owner.** Six of
eight is already adjudicated in the vocal contract's
`knownDivergences.classifiableVoiceTypes`, and the gap is safe rather than merely
noted: both unreachable labels have a published reference band and a published
passaggio zone, so a singer who knows their category is routed correctly and only
the scan cannot tell them. Whether bass-baritone joins the classifier is a product
decision and is not taken here. The six bands already tile the range with no gap,
and a bass-baritone band of 42 to 66 overlaps bass at 40 to 64 and baritone at 45
to 69, so adding it re-partitions occupied territory rather than filling a hole:
every existing singer whose scan lands in that overlap is re-labelled on their
next scan, from a category they were shown to one they were not. That cost against
a more precise label is the owner's call. Countertenor is a separate question and
probably not a classifier output at all, since the contract marks its zone as the
figure that varies most between singers and its transition as a different event
from the other seven.

That decision is recorded as the register's fifteenth entry,
`classifiableVoiceTypes` in `contracts/adjudications.ts`, which now holds fifteen
with a tally of five `divergent`, five `unify`, three `recordedUpstream`, one
`featureGap` and one `notComparable`. Its test asserts both unreachable labels
still have a band and a zone, that the upstream record and the taxonomy agree
about which six are reachable, and that the band figures the reason argues from
have not moved; five probes confirm it fails when the reason goes stale, when a
recorded value stops naming a label, when the escalation loses its owner, when the
decision stops claiming to be recorded upstream, and when the routing check is
made to read a key that does not exist. W17's prose above still describes the
fourteen it found, because W23 may edit only its own section; the current counts
are the ones in this paragraph.

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

Done, in both directions, with one product decision proposed rather than taken.

Every figure in the original statement of this item checks out against the code.
The sing repository's `ATLAS_WORDS` is 72,394 across 27 chapters, `BOOK_WORDS` is
31,738 across 23, `SINGERS` holds 636 records and every one of them carries a
non-null `technique` paragraph, and `POP_SONGS` holds 24 songs each with a key
and a cited range. Three things about the mapping needed correcting before it
could be built, and all three were the same kind of error: a target named
loosely enough to sound settled.

The atlas band table is not an atlas chapter. `content/atlas/03-voice-types-in-the-wild.md`
deliberately refuses to print the grid, on the argument that range and voice type
are different measurements and that opening with a tidy table undercuts the
argument before it is made. The grid lives at `/atlas/vocal-range-by-voice-type`,
a separate free page built from the same `REFERENCE_BANDS` this contract already
publishes under `taxonomy`. A citation sent at the chapter would land a reader on
a page that declines to answer them, so the contract publishes the table as a
reference page under its own key and the curriculum cites that.

The belt-safety target is an atlas chapter while the other three are book
chapters. Breath is `content/book/04-breath.md`, registers is `02-registers.md`
and vocal health is `06-stamina-and-health.md`; the safety rail is
`content/atlas/06-the-safety-rail.md`, inside the atlas's borrower's-method part.
The two shelves have separate slug spaces and separate routes, so the distinction
is load-bearing rather than pedantic, and the citation type carries the shelf.

"The voice track names no repertoire at all" is true of the curriculum and not
quite true of the repository. `lib/learning/voice-proof.ts` already deep-links
three songbook slugs — `amazing-grace`, `amazing-grace-full` and `deep-river` —
as companion rooms for the three song modules. Those are public-domain melodies
in sing's scored songbook, which is a different catalogue from the 24 popular
songs: the songbook is singable with live pitch feedback, and the popular-song
catalogue is editorial pages about key and range with no audio and no melody
data. A module needs both, and they must not be linked through the same
parameter; `?song=` belongs to the songbook only.

The direction of reference is one-way and it is the sing repository outward. One
site is the source for a piece of writing and the other cites it, because two
sites publishing the same paragraph is two sites competing to be the place that
paragraph lives — the same reasoning that sent the `DefinedTerm` markup to one
side in W24. So no chapter prose is copied here. What is authored here is only
the reason a module sends a singer to a chapter, which is curricular and belongs
to the curriculum; the chapter's title, its own abstract, its Pro gate and its
URL all come out of the contract at read time.

The mechanism follows `voice-proof.ts` exactly, for the reason that file exists.
`contracts/suede-vocal.ts` in the sing repository gained an `editorial` section
at version 2: every chapter of both books with its slug, order, part, abstract,
word count, Pro gate and resolved path, the popular-song catalogue with key,
cited range, span in semitones and a difficulty derived by `popDifficulty` rather
than authored, the band-grid reference page, and a count of the singer library.
`lib/learning/voice-editorial.ts` here cites into it, and a renamed or withdrawn
chapter throws rather than producing a dead link on a lesson page. Bodies are
deliberately absent from the contract, and a test on the producing side fails if
one ever arrives.

The gate is the part that would have been easy to ship wrong. Nineteen of the
book's 23 chapters and 24 of the atlas's 27 are behind Suede Sing Pro, verified
against Stripe at `/api/book`, while voice levels one and two are free here. Most
free lessons therefore cite paid reading, which is allowed because it is the
right reading, and has to be disclosed before the click rather than discovered at
the paywall. `gate` carries that disclosure, derived from the contract's `free`
flag, and the test asserts both outcomes occur so the branch is never untested.

Repertoire is resolved from a requirement rather than from a list of slugs. A
module states how wide a span it is ready for and how hard a song it will
tolerate, and the catalogue is filtered against the contract's published ranges.
Hand-picking three slugs would go stale the first time the catalogue moved and
could name a song whose range contradicted the module that named it. The filter
is exported separately from the three songs a lesson shows, because sorting
narrowest-first and taking three means the span ceiling almost never binds on the
shortlist: a test reading only the shortlist passed with the ceiling deleted.

The vendored `contracts/suede-vocal.json` here is **provisional**. It was taken
from a local checkout with `--sing=`, and the `--check` in CI resolves the sing
repository's default branch, so the check fails until the sing side merges. That
is the correct failure and not a reason to weaken the check. The sequencing
consequence is the same one W16 already carries, and the two now wait on the same
merge.

```sh
node scripts/sync-sing-vocal.mjs --check --sing=/path/to/sing   # passes today
node scripts/sync-sing-vocal.mjs --check                        # fails until sing merges
```

In the other direction, the exit test is adopted and the streak is proposed. The
sing repository's twelve-week programme had no completion signal other than the
calendar running out, so `lib/programme-exit-tests.ts` there now states, for each
of the six practice fortnights, one condition a recording can settle, the
measurement that settles it, the room the evidence comes from, the named blocker
to look for when it does not pass, and what passing still does not prove. Every
measurement is held against the same contract's registry and must be reported
`measurable: "yes"`, so an exit test cannot come to rest on something that app
does not measure. The phase list is derived from the book's own contents rather
than listed, so a new fortnight cannot ship without a condition. The condition
renders above the Pro gate on each chapter page: the chapter is the paid thing,
and the way to tell a fortnight is finished is not.

Two halves of the reverse direction are deferred, each for a stated reason.

The streak is untouched. Removing it or demoting it is a decision about an
engagement surface, it is part of `lib/progress-shape.ts`, which is the synced
shape a native app reads, and three achievements — `streak-3`, `streak-7` and
`streak-30` — are keyed to it. The proposal is to keep the counter and stop
selling it: drop it from the progress page's own description, which currently
leads with "XP, streaks, achievements", and put the phase exit tests where it
sits. That is a product call and wants a human, so it is written down rather than
taken.

The named-blocker diagnostic is deferred on scope and on W28. Each exit test now
names its own blocker, which is the useful half and is where a singer actually
needs it. A standalone diagnostic in the sing repository would be a new
indexable page targeting the same intent as this repository's `/diagnose`, which
is exactly the cross-domain self-competition W28 exists to settle. Building it
before that decision would add a seventh pair to the six this repository already
has. It wants the `/diagnose` question graph rewritten for voice blockers, which
is editorial work of the same order as a book chapter, and it should follow W28.

What this does not establish. No chapter was read for accuracy; the citations
assert that a chapter exists under the slug the curriculum names, not that its
contents suit the module. The song requirements are judgments about span and
difficulty and are not claims that a particular voice can sing a particular song:
the key and the range are the figures publishers and fans circulate, they describe
the original recording, and nothing here measures a singer against them. The
exit tests rest on measurements the sing repository reports as implemented, which
is a claim about code and not about acoustic accuracy in a real room. And the
vendored contract is verified only against a local checkout, so nothing here
establishes that the two repositories agree on `main`.

### W26 — Cross-application vocal progress

Done for the contract and the mapping. Shared identity is untouched and stays
deferred with W27; the blocker was never authentication, and doing identity first
would have given one user two incompatible voice records.

The progress shape is published from the sing repository as
`contracts/suede-progress.json`, generated by `contracts/suede-progress.ts` from
the live validators in `lib/progress-shape.ts`, and vendored here by
`scripts/sync-sing-progress.mjs` on the same terms as the vocal and glossary
contracts: sing's default branch, a fatal error on a fetch failure rather than a
reported "verified", and `--sing=` for a local checkout.

Sing is the reference surface for the shape because the record, its three entry
points and its caps are implemented there and nowhere else — this repository has
no session-shaped record at all, so a shape declared here would be a
transcription, and a transcription cannot fail when the original moves. The
counter-argument is worth stating rather than skipping: this repository is the
side with hard validation, and `parseLearningAttempt` is the only thing in either
codebase that can refuse a record. That is an argument about the *mapping*, not
the shape, and it is why the mapping lives here in
`lib/learning-sync/sing-sessions.ts`. Lesson identifiers are authored here and
are meaningless in sing; a mapping table published from there would be an
assertion about a catalog that repository cannot see and could not revalidate
when a lesson is renumbered. So sing publishes what a session is, this side
decides what a session counts as, and `tests/sing-session-mapping.test.ts` fails
on whichever side moved.

One of the nine activity types maps. A completed range scan becomes an attempt at
`v-l1-m2-04`, the Your Range checkpoint, because it is the only session that
corresponds to exactly one authored lesson and carries the measurement that
lesson is about — and the span comes from `rangeHistory` rather than the session,
which carries no measurement of its own. Four types are ambiguous between named
candidate lessons: warmup between stage two and stage seven, pitch between
landing a note and correcting drift, breath between the two sustained-seconds
modules, song between the octave, tenth and twelfth spans. Four have no
corresponding lesson at all — ear, recording, tools and analyze. The ambiguity is
checked rather than asserted: every candidate identifier must still resolve
against the curriculum and every ambiguous verdict must still have more than one
candidate, so a reorganisation that leaves one candidate standing fails the test
and asks for the verdict to be revisited instead of leaving a refusal resting on
a reason that stopped being true. Nothing is dropped silently: every session
lands in exactly one of seven counted outcomes and the counts are proved to sum
to the input.

What a mapped record establishes is bounded and stated in the payload. An
imported attempt is legacy-sourced, and `parseLearningAttempt` forces every
legacy attempt to `repeat`, so no import can mark a lesson ready however it is
described on the way in. Sing session ids are epoch-plus-random and
`accountUUID` rejects them, so the importer requires a persisted id mapping from
the caller and counts a session without one rather than minting an identity that
would make the same practice arrive again on the next run of an append-only
ledger.

XP and the streak are published with their definitions and marked unimportable,
which is two different decisions. XP is derived from duration and has nowhere to
land in an attempt except free-form details, where it would be a number nothing
validates. The streak is a refusal on principle: this repository argues in
published copy that a streak measures attendance, and carrying the number across
would import a thing it has decided against, so the definition crosses and the
value does not. A test walks every produced attempt for `xp`, `streak`,
`achievements` and the streak's own field names.

The vendored copy is provisional and declares `"provisional": true`, because
sing's builder is not on its default branch yet. While the reference 404s the
check reports that state and passes; the byte comparison starts the moment sing
publishes, and the real contract does not carry the marker, so a stale
provisional copy fails on the first run afterwards.

Left open, deliberately: what a singer's history should mean on arrival in a
curriculum that never recorded it. Concretely, whether an imported attempt may
ever contribute to lesson completion — it cannot today, and that is what let this
ship — and whether the four activities with no corresponding lesson should get
authored voice lessons or be declared outside the curriculum. Both are product
decisions and neither was taken here.

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

Done in both repositories, as six differentiations here and three there, with the
cross-domain question proposed rather than taken.

All six pairs named in the original statement of this item are real. Every route
exists, every pair was read rather than inferred, and in each case the two pages
were competing for one query. Two of the six, the 30-day guide against
`/breakthrough` and the plateau guide against `/diagnose`, are a written guide
against the tool that does the same job, which is a real pair of pages that had
simply never said so. The remaining four needed the copy to move, and one of them
needed more than that.

The decisions live in `lib/query-ownership.ts`, written the way
`contracts/adjudications.ts` records a cross-surface decision: each cluster names
the query, the question each page now owns alone, the sentence the page prints so
a reader arriving from search is told which one they landed on, and the phrase in
its description that its sibling is not allowed to claim.
`tests/query-ownership.test.ts` renders every page in the register and fails when
a recorded scope line is not printed, when a page stops linking to the sibling it
hands the other question to, when two descriptions become interchangeable, or
when a page goes back to answering something it handed over. The sing repository
carries the same pair of files under its own conventions.

The three pages that each printed their own minute-by-minute plan for a
ten-minute practice day were the clearest case. `/guitar-practice-schedule`,
`/how-long-to-practice-guitar-each-day` and
`/guitar-practice-routine-intermediate` all answered it, which is one question
with three answers and no page owning it. The contents of a single session now
belong to the duration page, the week belongs to the schedule, and the five-block
structure belongs to the intermediate routine.

One decision went the second-best way and is recorded as such. Two essays on one
topic usually deserve consolidation, and
`/how-to-practice-guitar-effectively` against `/deliberate-practice-guitar` is
that shape: the effectiveness page restated the deliberate-practice definition in
full and then linked to the page that defines it. Retiring a URL here means
removing its entry from `GUIDES` in `lib/site.ts`, and that file was held by W24
in the same working tree, so the pair was differentiated instead, on the feedback
problem, which is a genuinely separate question: a player alone in a room cannot
buy a second pair of ears. `preferredInstead` on that register entry records the
consolidation and why it was not taken, so a later reader does not mistake the
compromise for a preference.

The three clusters in the sing repository were found by measuring rather than by
assuming, comparing the title and description of every indexable page pairwise on
content words and then reading the pages at the top of the list to check the
overlap was competition and not shared vocabulary. They are the vocal range test,
where `/voice` carried the store name "Suede Voice: Vocal Range Test" against
`/range`'s "Free Vocal Range Test" while answering an install intent rather than a
test intent; the famous-singer ranges, where the `/singers` chart and the
`/atlas` book both opened on the same six words; and the practice tools, where the
`/tools` hub enumerated the recorder and the spectrogram analyzer in its own title
and description and so bid against two pages it links to. All three stayed two or
three pages, because every page in them is a working room a visitor can use and
consolidating would have retired a tool to fix a title.

The cross-domain question is recorded in `CROSS_DOMAIN_PROPOSAL` with three
options and a recommendation, and deliberately not acted on. It is a positioning
decision about two products rather than a page edit, the two repositories have
different owners, and the cheap-looking move is the expensive one. Nothing here
moves or unpublishes the voice track, and the test asserts that: `/learn/voice`
stays in the route registry, stays in the sitemap, and stays reachable, so the
proposal cannot be read as permission by whoever opens the file next. The
recommendation is to keep the curriculum here and stop bidding for singing
queries with it, treating the voice track as something the readers already on this
site can use, and to move it to sing.suedeai.ai only once that host has a
curriculum surface to receive it.

### What this does not establish

Nothing here measures anything. Whether a differentiation recovers the clicks the
split was costing is a question for Search Console over weeks, and the register
records a decision rather than a result. The binding tests prove that each page
says which question it answers and links to the page that answers the other one;
they cannot prove a reader agrees with the distinction, and for the clean-tone
pair, the weakest of the six, a reader might reasonably not.

No redirect was added in either repository, because no page was retired. The
machinery for a consolidation is in both registers and both tests, and it was
exercised against a deliberately broken entry rather than left untested, but it
guards nothing today.

The 22 open guitar lessons, the access gate in `lib/learning/access.ts` and the
`robots.index` that follows it were read and left alone. Nothing in this item
changes what opens or what is indexable.

### W29 — Server-side enforcement of the free allowance

In the sing repository the daily guided-practice cap is measured from the local
practice log and enforced entirely client-side, so clearing browser storage
resets it. Only the long-form content and cloud sync are genuinely protected.
Deferred with W27 because it is a monetisation control. Noted because it is easy
to mistake for a security finding later.

## Sequencing

W24 has no dependencies and can start immediately. W14 is done for
the one contract it can cover and blocked on native access for the other two.
W15, W17, W18, W21, W22, W23, W25, W26 and W28 are done — W26 for its contract and
its mapping, with one product decision left open and named in its section — and W8's measurement half is done in the
sing repository while its three named modules stay self-reported — W22 in the
sing repository; W2 and W13 can now read their constants off
`contracts/adjudications.ts` instead of re-deriving them, and W2's new voice specs
will be held to the typed vocabulary at import.

W16 is the exception among the otherwise-unblocked items: it waits on the sing
repository's version 2 reaching `main`, because the re-sync resolves the default
branch. It is cheap once that lands and is a no-op before it.

W3 is next and gates W1, W2, W19 and W20. W4, W5 and W6 are done on the
measurement side in the sing repository: the measurements and their tests exist,
and what remains of each is the contract key and the module retirements its
section names, fewer of the latter than first assumed.
W7's measurement is done and retires nothing; what remains of it is a contract
row and one module promise, both in files other work holds.
W8 and W26 follow. W9 is decided rather than pending: the gap is guarded in both
repositories rather than closed, and no strain measurement was shipped. W10, W11,
W12, W27 and W29 are decided against or deferred.

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
