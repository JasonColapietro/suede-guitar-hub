# GuitarHub reference learning evidence

Checked 2026-09-04. Scope: public, first-party documentation and developer-maintained App Store information. This is an implementation benchmark, not evidence of access to another company's source code or private architecture. Search results, testimonials, and community-member assertions were not treated as product specifications. No accounts, purchases, or external writes were used.

## Reference identity and limits

The likely meaning of “sonoroa guitar” is **Sonora Guitar Intensive**, at [learnwithsonora.com](https://www.learnwithsonora.com/). That identity is an inference from the name and guitar-learning context, not user confirmation. Sonora is a curriculum and mentorship program; its public materials do not establish a Yousician-like automatic note-scoring app.

The products do not have one identical learning model. Use Yousician for documented interactive playing behavior, JustinGuitar for beginner scaffolding and short practice routines, and Sonora for progressive musicianship and feedback. None of the sources below publishes a complete internal setup, acoustic model, numerical pitch acceptance band, onset timing window, latency-compensation formula, or placement algorithm. Exact internal parity cannot truthfully be claimed from these sources.

## Evidence matrix

“Not documented” means not established by the inspected official sources; it does not mean the feature is absent.

| Area | Yousician | JustinGuitar | Sonora |
|---|---|---|---|
| Entry and placement | Beginners are directed to Basics; experienced players are also encouraged to try introductory missions. Missions can be explored freely. [Y1] | Grade 1 begins with instrument preparation before initial chord work. No automatic placement formula established. [J1] | Mentor evaluation identifies skill gaps and recommends focus areas; beginners use Prep, intermediate/returning players Core. [S1] |
| Curriculum structure | Missions combine videos, trainers, and songs. Ten playing levels span melody/lead and chords/rhythm; a five-level knowledge theme includes ear training. [Y1] | Basics → A/D → E and rhythm → minor chords/up-strums → Dm/metronome → C/theory → G/6:8/alternate picking → consolidation. This is the published Grade 1 order, not permission to reproduce lessons. [J1] | Prep progresses from tuning/open chords through rhythm/scales, power chords, fingerstyle/barres, articulation, and ensemble work. [S2] |
| Practice cadence | Session goals can use minutes or stars; daily/weekly activity and weekly streaks are recorded. Home exposes a daily session and a continuation shortcut. [Y2] | Current app description offers a ten-minute routine and one-minute chord-change exercises. Website guidance supports regular 10–20 minute practice. [J2], [J3] | Prep recommends 20–30 minutes daily as a baseline, with optional additional practice. The approximately twelve-week sequence permits individual pace. Core advertises 5–7 weekly hours. [S1], [S2] |
| Learn, rehearse, perform | Learning path and song discovery are separate destinations. Practice repeats and provides learning aids; Play produces scores and progress. [Y2], [Y3] | Lessons, exercises, songbook, and an accompanying song player serve distinct purposes. [J2] | Lessons, assigned practice, and mentor response form the published learning loop. [S2] |
| Tempo, loop, count-in | Practice supports section boundaries, tempo adjustment, waiting for the correct note, a metronome, reference playback, and an optional bar of lead-in when a loop restarts. Adaptive tempo is documented as 25–125%, in 5% steps. [Y3] | Song tempo is adjustable. The player shows upcoming chord diagrams or strumming guidance, with backing accompaniment and optional vocals. Loop/count-in configuration is not established here. [J2] | Publicly describes a browser practice tool that slows and loops video. Count-in and adaptive-tempo rules are not established. [S1] |
| Pitch and timing feedback | Correct notes and timing affect Play scoring; highest stars require both. Detection tolerances are not published. [Y3], [Y4] | Current developer release notes describe chord detection for an exercise and separate 1–3-star **self-assessment** for songs. Do not interpret song stars as automatic acoustic accuracy. [J2] | Published feedback is mentor review of submitted playing videos. Automated pitch/timing scoring is not established. [S2] |
| Tuning and input setup | Standard six-string E–A–D–G–B–E, in-app tuner, mic permission, live input indication, input-device selection, noise/volume guidance, and clean guitar tone are documented. Interface support is device-dependent. [Y5], [Y6] | App has a tuner; web tuner provides reference string pitches with optional repeat for ear tuning. These are different tuner interactions. [J2], [J4] | Any acoustic/electric guitar in playable condition is supported by the course; mic-routing/calibration behavior is not established. [S1] |
| Progress and retry | Each task must be played to finish a mission. Results distinguish latest run from accumulated best results by song part, and offer replay/practice/continue actions. Guidance favors reasonable confidence, advancing, then revisiting. [Y1], [Y4], [Y7] | Guidance separates finishing lesson modules from consolidating skills, recommending another 1–2 months for Grade 1 consolidation. App restart of song self-assessment allows preparation before playback. [J3], [J2] | Recorded material permits revisiting and pace changes; learners can submit work for personalized feedback any day. [S2] |
| Accessible presentation | Documented left-handed fretboard/chord display, color-vision themes, volume controls, and multiple notation options. [Y3], [Y6], [Y8] | Developer declares captions and differentiation beyond color in the current App Store accessibility information. [J2] | Specific software accessibility support was not established in inspected pages. |

## Product acceptance behaviors

These are engineering acceptance conditions derived from the evidence, not claims that the references share source code or exact implementation. Apply the same observable rules on GuitarHub web and iOS; preserve GuitarHub's visual design.

1. **A beginning player has a usable first session.** Preparation leads to an attainable initial skill, a short relevant exercise, and compatible musical material. An experienced player can find appropriate material without falsely being certified by a questionnaire. Curriculum labels, prerequisites, lesson targets, and exercise content agree with each other.
2. **Mode behavior is explicit.** Before starting, the player can distinguish instruction, guided rehearsal, and an assessed performance. Changing mode never silently carries assisted results into an unassisted performance record. A manual reflection remains clearly identified as self-assessment.
3. **The transport is musically coherent.** The displayed beats, audio, note targets, progress position, and selected tempo follow one timeline. Every supported meter uses its own beats per bar. Pause/resume, seek, loop restart, backgrounding, and interruption have deterministic behavior. Rehearsal controls from the matrix should function rather than merely appear.
4. **Input readiness precedes a measured result.** Permission denial, silence, wrong device, unusable signal, and unavailable recognition remain distinguishable from incorrect playing. Reference playback or backing audio alone must not earn a passing performance. Recovery preserves the current exercise and gives a working next action.
5. **Pitch and timing are separate evidence.** A correct pitch arriving late cannot be presented as correct rhythm. Sustained audio must not manufacture multiple successful attacks; an octave error must not pass as the requested note. Missing evidence must not become a perfect score. Root-note detection alone cannot substantiate an entire chord's correctness.
6. **Results describe the actual attempt.** Record the exercise/version, tempo, mode, measured versus self-assessed source, and observed outcome. Replays preserve previous bests without rewriting the latest attempt. Completion, competence, and review readiness must not all be inferred from one “Done” tap.
7. **Practice keeps a musical purpose.** A routine tells the learner what to work on and when to stop, connects practice to the current module, and makes revisiting trouble spots easy. Cadence remains adjustable; the evidence does not support imposing one competitor's duration on every level.
8. **The accessible path stays usable.** Success/error feedback has text or shape meaning alongside color; instructional media has captions/transcripts where supplied; notation and handedness choices remain consistent. Keyboard, screen-reader, larger-text, reduced-motion, and touch operation require actual platform checks rather than inference from competitor marketing.

## Numerical and verification boundaries

- The only exact rehearsal tempo range established here is Yousician's documented adaptive range in the matrix. It is a public behavior benchmark, not proof of its control algorithm.
- Yousician's “Wait To Play” support article describes correct-note waiting but its On/Off bullets contradict that description. Implement an unambiguous label (“Wait for the correct note”) and verify the enabled state behavior; do not reproduce the contradictory wording. [Y3]
- Do not reuse GuitarTuna tuning accuracy as a Yousician performance-scoring tolerance. They are different features/products.
- Pitch cents, timing milliseconds, confidence thresholds, noise limits, input latency, and advancement cutoffs need explicit GuitarHub specifications and measured validation. Do not invent competitor numbers or label local defaults as “matching theirs.”
- Automated tests can verify transport, scoring invariants, and saved progress. They do not replace acoustic trials on physical iPhone/iPad and supported browsers, with acoustic/electric instruments, quiet/noisy rooms, speakers/headphones, missed notes, wrong octaves, early/late attacks, chords, and interrupted sessions.
- Full walkthroughs of current paid competitor apps were not performed. This report proves documented behavior only. It does not certify GuitarHub, legal rights to curricula/song arrangements, private internals, or release readiness.

## Sources

- [Y1: Guitar learning path](https://support.yousician.com/hc/en-us/articles/206930639-How-the-guitar-learning-path-works)
- [Y2: Navigation, daily activity, and goals](https://support.yousician.com/hc/en-us/articles/201558312-How-to-navigate-in-Yousician)
- [Y3: Practice and Play](https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar)
- [Y4: Scoring and result actions](https://support.yousician.com/hc/en-us/articles/208014795-Song-scoring-and-leaderboards)
- [Y5: Guitar sound recognition setup](https://support.yousician.com/hc/en-us/articles/46277332028817-Guitar-sound-recognition-issues)
- [Y6: Audio, input, and presentation settings](https://support.yousician.com/hc/en-us/articles/203751452-Game-tab)
- [Y7: Practice progression and revisiting](https://support.yousician.com/hc/en-us/articles/206912609-The-best-way-to-practice-guitar)
- [Y8: Left-handed display](https://support.yousician.com/hc/en-us/articles/202773522-Left-handed-option)
- [J1: JustinGuitar Grade 1 course outline](https://www.justinguitar.com/classes/beginner-guitar-course-grade-one)
- [J2: JustinGuitar official developer description, release notes, accessibility](https://apps.apple.com/gb/app/justin-guitar-lessons-songs/id1176125504)
- [J3: JustinGuitar learning cadence and consolidation](https://www.justinguitar.com/faq/how-justinguitar-works)
- [J4: JustinGuitar web ear tuner](https://www.justinguitar.com/guitar-tuner)
- [S1: Sonora Core, assessment, and practice software](https://www.learnwithsonora.com/)
- [S2: Sonora Prep sequence, cadence, and feedback](https://www.learnwithsonora.com/beginner-guitar-roadmap-b)

## Work record

Owned artifact: this report only. Workspace status before writing: unborn `main`, no configured Git remote, existing untracked `adversarial-audit/`, `ios/`, and `web/`; no history was available. Public sources were read with the web tool. Memory bootstrap and fallback reads timed out, so no unavailable vault content was treated as evidence. No application source was changed.

[Y1]: https://support.yousician.com/hc/en-us/articles/206930639-How-the-guitar-learning-path-works
[Y2]: https://support.yousician.com/hc/en-us/articles/201558312-How-to-navigate-in-Yousician
[Y3]: https://support.yousician.com/hc/en-us/articles/201558362-Practice-and-Play-modes-in-guitar
[Y4]: https://support.yousician.com/hc/en-us/articles/208014795-Song-scoring-and-leaderboards
[Y5]: https://support.yousician.com/hc/en-us/articles/46277332028817-Guitar-sound-recognition-issues
[Y6]: https://support.yousician.com/hc/en-us/articles/203751452-Game-tab
[Y7]: https://support.yousician.com/hc/en-us/articles/206912609-The-best-way-to-practice-guitar
[Y8]: https://support.yousician.com/hc/en-us/articles/202773522-Left-handed-option
[J1]: https://www.justinguitar.com/classes/beginner-guitar-course-grade-one
[J2]: https://apps.apple.com/gb/app/justin-guitar-lessons-songs/id1176125504
[J3]: https://www.justinguitar.com/faq/how-justinguitar-works
[J4]: https://www.justinguitar.com/guitar-tuner
[S1]: https://www.learnwithsonora.com/
[S2]: https://www.learnwithsonora.com/beginner-guitar-roadmap-b
