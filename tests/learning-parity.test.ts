import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allLessons, availableLessons } from "../lib/learning/curriculum.ts";
import { getLessonInstructions } from "../lib/learning/instructions.ts";
import { browseLessons, type LessonFilter } from "../lib/learning/library.ts";
import { scorePractice, type PracticeSpec } from "../lib/audio/practice.ts";
import { practiceSelection, targetMap, chordFretRange } from "../lib/audio/practice-selection.ts";
import { recommendPracticeTempo, type TempoAttempt, type TempoReason } from "../lib/audio/practice-tempo.ts";
import type { TrackId } from "../lib/learning/models.ts";

const contract = JSON.parse(readFileSync(process.env.GUITARHUB_PARITY_CONTRACT ?? new URL("../contracts/learning.json", import.meta.url), "utf8"));
test("the native parity contract loads non-empty and names the only reference", () => {
  assert.equal(contract.version, 1);
  assert.equal(contract.reference.surface, "ios");
  assert.ok(contract.tracks.guitar.lessonIds.length > 0);
  assert.ok(Object.keys(contract.instructions).length > 0);
  assert.ok(contract.searchFixtures.length > 0);
  assert.ok(contract.tempoFixtures.length > 0);
  assert.deepEqual(contract.knownDivergences, []);
});
for (const track of ["guitar", "voice"] as const) {
  const expected = contract.tracks[track];
  test(`${track}: native catalog order, sampler and available instruction filters`, () => {
    assert.deepEqual(allLessons(track).map(entry => entry.lesson.id), expected.lessonIds, "lessonIds");
    assert.deepEqual(availableLessons(track).map(entry => entry.lesson.id), expected.samplerLessonIds, "samplerLessonIds");
    for (const [filter, key] of [["guided", "guidedLessonIds"], ["songs", "songLessonIds"], ["microphone", "microphoneLessonIds"]] as const) {
      assert.deepEqual(browseLessons(track, filter).map(entry => entry.lesson.id), expected[key], key);
    }
    assert.deepEqual(Object.fromEntries(allLessons(track).filter(entry => entry.lesson.practiceSpec).map(entry => [entry.lesson.id, entry.lesson.practiceSpec])), expected.practiceSpecs, "practiceSpecs");
  });
  for (const [id, spec] of Object.entries(expected.practiceSpecs) as [string, PracticeSpec][]) {
    test(`${id}: the entire native exercise can score; silence and slower tempo cannot complete`, () => {
      const observations = spec.targets.map(target => ({ time: target.beat * 60 / spec.bpm, confidence: 1, midi: target.midi ?? undefined, cents: 0, targetID: spec.mode === "pitchSequence" ? target.id : undefined }));
      const result = scorePractice(spec, observations, (spec.targets.at(-1)!.beat + 1) * 60 / spec.bpm);
      assert.equal(result.score, 100);
      assert.equal(result.targetCount, spec.targets.length);
      assert.equal(result.matchedTargets, spec.targets.length);
      assert.equal(result.passed, spec.completionMinimumBPM === undefined || spec.bpm >= spec.completionMinimumBPM);
      assert.equal(scorePractice(spec, []).disposition, "insufficientSignal");
      if (spec.completionMinimumBPM !== undefined) {
        const slower = { ...spec, bpm: spec.completionMinimumBPM - 1 };
        const slowObservations = slower.targets.map(target => ({ time: target.beat * 60 / slower.bpm, confidence: 1, midi: target.midi ?? undefined, cents: 0, targetID: slower.mode === "pitchSequence" ? target.id : undefined }));
        assert.equal(scorePractice(slower, slowObservations).score, 100);
        assert.equal(scorePractice(slower, slowObservations).passed, false);
      }
    });
  }
}
test("every native instruction resolves exactly its authored assets and quiz", () => {
  for (const [id, expected] of Object.entries(contract.instructions) as [string, { assetIds: string[]; quiz?: unknown }][]) {
    const instructions = getLessonInstructions(id);
    assert.ok(instructions, id);
    assert.deepEqual(instructions.assets.map(asset => asset.id), expected.assetIds, `${id}.assetIds`);
    assert.deepEqual(instructions.quiz, expected.quiz, `${id}.quiz`);
  }
});
for (const fixture of contract.searchFixtures as { track: TrackId; filter: LessonFilter; query: string; lessonIds: string[] }[]) {
  test(`native search: ${fixture.track}/${fixture.filter}/${fixture.query || "all"}`, () => {
    assert.deepEqual(browseLessons(fixture.track, fixture.filter, fixture.query).map(entry => entry.lesson.id), fixture.lessonIds);
  });
}
test("practice sections retain spacing/cues and Play ignores section controls", () => {
  const spec = allLessons("guitar").find(entry => entry.lesson.practiceSpec?.targets.some(target => target.cue))!.lesson.practiceSpec!;
  const section = practiceSelection(spec, "practice", true, 2, 5);
  assert.equal(section.targets.length, 4);
  assert.equal(section.targets[0].beat, 0);
  assert.deepEqual(section.targets.map(target => target.id), spec.targets.slice(2, 6).map(target => target.id));
  assert.deepEqual(section.targets.map(target => target.cue), spec.targets.slice(2, 6).map(target => target.cue));
  assert.equal(practiceSelection(spec, "play", true, 2, 5), spec);
  assert.equal(practiceSelection(spec, "practice", false, 2, 5), spec);
  assert.equal(targetMap(spec).at(-1)!.number, spec.targets.length);
});
test("chord diagrams include fourth-fret and upper-position shapes", () => {
  assert.deepEqual(chordFretRange([null,2,4,4,3,2]), { first: 1, last: 4 });
  assert.deepEqual(chordFretRange([5,7,7,6,5,5]), { first: 5, last: 8 });
});

for (const fixture of contract.tempoFixtures as { case: string; lessonId: string; currentBPM: number; attempts: (Omit<TempoAttempt, "specRevision"> & { specRevision: number | null })[]; expected: { bpm: number; reason: TempoReason } }[]) {
  test(`native tempo: ${fixture.lessonId}/${fixture.case}`, () => {
    const spec = allLessons("guitar").find(entry => entry.lesson.id === fixture.lessonId)!.lesson.practiceSpec!;
    const attempts = fixture.attempts.map(attempt => ({ ...attempt, specRevision: attempt.specRevision ?? undefined }));
    const actual = recommendPracticeTempo(spec, fixture.currentBPM, attempts);
    assert.equal(actual.reason, fixture.expected.reason);
    assert.ok(Math.abs(actual.bpm - fixture.expected.bpm) < 1e-8, `${actual.bpm} != ${fixture.expected.bpm}`);
  });
}
