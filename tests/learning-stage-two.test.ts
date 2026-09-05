import test from "node:test";
import assert from "node:assert/strict";
import { getInstructionAsset } from "../lib/learning/instructions.ts";
import { getLesson } from "../lib/learning/curriculum.ts";
import { studyPosition, studySoundEvents, manualMinuteResult, manualChangeRate, isFullStudyTake, parseStageTwoHistory, type StudyAttempt, type ManualChangeAttempt } from "../lib/learning/stage-two.ts";
import { scorePractice } from "../lib/audio/practice.ts";
const asset = getInstructionAsset("stage2-first-light-study");
assert.equal(asset.kind, "study");
if (asset.kind !== "study") throw new Error("Missing authored study");
const study = asset.study;
const createdAt = "2026-09-04T12:00:00Z";

test("the original A/D study retains all sixteen authored bars, four phrases and both strumming patterns", () => {
  assert.equal(study.barCount, 16);
  assert.deepEqual(study.bars.map(bar => bar.chord), ["D", "D", "A", "A", "D", "A", "D", "D", "A", "A", "D", "D", "A", "A", "D", "D"]);
  assert.equal(study.bars.at(-1)?.endBeatExclusive, 64);
  assert.deepEqual(study.phrases.map(phrase => [phrase.startBar, phrase.endBar]), [[1, 4], [5, 8], [9, 12], [13, 16]]);
  assert.deepEqual(study.variants.map(variant => variant.strokeBeatOffsets.length), [16, 64]);
});

test("one musical clock excludes the count-in and completes only after the selected final bar", () => {
  for (const percent of [25, 50, 100, 125]) {
    const bpm = study.defaultBPM * percent / 100, beatSeconds = 60 / bpm;
    assert.equal(studyPosition(study, 3 * beatSeconds, bpm, 1, 16).musicSeconds, 0);
    assert.equal(studyPosition(study, 4 * beatSeconds, bpm, 1, 16).bar, 1);
    const lastBeat = studyPosition(study, 67.9 * beatSeconds, bpm, 1, 16);
    assert.equal(lastBeat.bar, 16); assert.equal(lastBeat.beatInBar, 4); assert.equal(lastBeat.finished, false);
    const complete = studyPosition(study, 68 * beatSeconds, bpm, 1, 16);
    assert.equal(complete.finished, true); assert.ok(Math.abs(complete.musicSeconds - 64 * beatSeconds) < .001);
  }
  assert.equal(studyPosition(study, 4, 60, 5, 8).bar, 5);
  assert.equal(studyPosition(study, 19.9, 60, 5, 8).finished, false);
  assert.equal(studyPosition(study, 20, 60, 5, 8).musicSeconds, 16);
  assert.equal(studyPosition(study, 4, 60, 7, 8).bar, 7, "a resumed bar gets its own four-beat lead-in");
  assert.throws(() => studyPosition(study, 1, 0, 1, 16), /tempo/);
  assert.throws(() => studyPosition(study, 1, 60, 1.5, 16), /range/);
});

test("generated references follow authored pitches and selected phrase; quiet practice has only the count-in", () => {
  assert.equal(studySoundEvents(study, 60, 1, 16, "one-per-bar", false, false).length, 4);
  const clicks = studySoundEvents(study, 60, 1, 16, "one-per-bar", false, true);
  assert.equal(clicks.length, 68); assert.ok(clicks.every(event => event.type === "sine"));
  const full = studySoundEvents(study, 60, 1, 16, "one-per-bar", true, false);
  const chordTones = full.filter(event => event.type === "triangle");
  assert.equal(chordTones.length, study.demoEvents.reduce((total, event) => total + event.midiLowToHigh.length, 0));
  assert.deepEqual(chordTones.slice(0, 4).map(event => Math.round(69 + 12 * Math.log2(event.frequency / 440))), [50, 57, 62, 66]);
  assert.ok(chordTones.every(event => event.at >= 4 && event.at + event.duration <= 68));
  const fourPerBar = studySoundEvents(study, 60, 1, 16, "four-per-bar", true, false);
  assert.equal(fourPerBar.filter(event => event.type === "triangle").length, chordTones.length * 4);
  const phrase = studySoundEvents(study, 75, 5, 8, "one-per-bar", true, false);
  assert.ok(phrase.every(event => event.at + event.duration <= 20 * 60 / 75));
});

const change: ManualChangeAttempt = { id: "minute-1", lessonId: "g-l2-m3-06", createdAt, startingChord: "D", count: 30, durationSeconds: 60, completedMinute: true, interrupted: false };
test("only a complete uninterrupted sixty-second attempt has a changes-per-minute count", () => {
  assert.deepEqual(manualMinuteResult(10, 40, true), { durationSeconds: 30, completedMinute: false, interrupted: true });
  assert.deepEqual(manualMinuteResult(10, 70.3, false), { durationSeconds: 60, completedMinute: true, interrupted: false });
  assert.equal(manualChangeRate(change), 30);
  assert.equal(manualChangeRate({ ...change, ...manualMinuteResult(10, 40, true), count: 20 }), null);
  assert.equal(manualChangeRate({ ...change, interrupted: true }), null);
  assert.equal(manualChangeRate({ ...change, count: null }), null);
});

const take: StudyAttempt = { id: "take-1", lessonId: "g-l2-m2-04", studyId: study.id, createdAt, bpm: 60, firstBar: 1, lastBar: 16, variantId: "one-per-bar", practiceSeconds: 64, usedBacking: false, usedClicks: true, interrupted: false, timelineFinished: true, learnerPlayedAllBars: true, reviewBar: 6 };
test("study completion requires self-reported playing and the whole uninterrupted timeline", () => {
  assert.equal(isFullStudyTake(take, study), true);
  for (const patch of [{ learnerPlayedAllBars: false }, { interrupted: true }, { firstBar: 5 }, { lastBar: 8 }, { timelineFinished: false }, { studyId: "another-study" }, { practiceSeconds: 16 }]) assert.equal(isFullStudyTake({ ...take, ...patch }, study), false);
});

test("partial counts and independent study reflections survive reload without acquiring scores", () => {
  const partial = { ...change, id: "minute-partial", count: 10, ...manualMinuteResult(0, 20, true), score: 100 };
  const raw = JSON.stringify({ version: 1, track: "guitar", changes: [partial, change, { ...change, id: "bad-duration", durationSeconds: 20 }], studies: [{ ...take, score: 100 }, { ...take, id: "take-partial", firstBar: 5, practiceSeconds: 16, interrupted: true }] });
  const restored = parseStageTwoHistory(raw, "guitar");
  assert.equal(restored.changes.length, 2); assert.equal(restored.studies.length, 2);
  assert.equal(manualChangeRate(restored.changes[0]), null);
  assert.equal(Object.hasOwn(restored.changes[0], "score"), false);
  assert.equal(Object.hasOwn(restored.studies[0], "score"), false);
  assert.equal(parseStageTwoHistory(raw, "voice").changes.length, 0);
});

test("the current named checkpoint is revision two with sixty-four attacks at eighty BPM", () => {
  const spec = getLesson("guitar", "g-l2-m2-06")!.lesson.practiceSpec!;
  assert.equal(spec.revision, 2); assert.equal(spec.targets.length, 64);
  assert.equal(spec.completionMinimumBPM, 80); assert.equal(spec.targets.at(-1)?.beat, 63);
  for (const bpm of [60, 80]) {
    const result = scorePractice({ ...spec, bpm }, spec.targets.map(target => ({ time: target.beat * 60 / bpm, confidence: .95 })), 64 * 60 / bpm);
    assert.equal(result.practiceSpecRevision, 2); assert.equal(result.score, 100); assert.equal(result.passed, bpm >= 80);
  }
});
