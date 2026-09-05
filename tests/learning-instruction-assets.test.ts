import test from "node:test";
import assert from "node:assert/strict";
import source from "../lib/learning/data/beginner-guitar-instruction.json" with { type: "json" };
import { getInstructionAsset, getLessonInstructions } from "../lib/learning/instructions.ts";

test("every authored lesson reference and reading question resolves to a typed asset", () => {
  for (const lesson of source.lessons) {
    const instructions = getLessonInstructions(lesson.id)!;
    assert.deepEqual(instructions.assets.map(asset => asset.id), lesson.demoAssetIds);
    for (const question of instructions.quiz?.items ?? []) if (question.demoAssetId) assert.ok(instructions.assets.some(asset => asset.id === question.demoAssetId));
  }
  assert.throws(() => getInstructionAsset("unwritten-asset"), /Missing instruction asset/);
});

test("string references retain authored numbers, open frets, and distinct E octaves", () => {
  const asset = getInstructionAsset("six-open-strings");
  assert.equal(asset.kind, "strings");
  if (asset.kind !== "strings") return;
  assert.equal(asset.referenceAHz, 440);
  assert.deepEqual(asset.strings.map(string => [string.string, string.midi, string.fret]), [[6, 40, 0], [5, 45, 0], [4, 50, 0], [3, 55, 0], [2, 59, 0], [1, 64, 0]]);
});

test("A and D diagrams preserve omitted strings, open strings, fingering, and note pitches", () => {
  for (const id of ["a-chord-reading", "d-chord-reading"]) {
    const asset = getInstructionAsset(id);
    assert.equal(asset.kind, "chord");
    if (asset.kind !== "chord") return;
    const openMidi = [40, 45, 50, 55, 59, 64];
    assert.deepEqual(asset.frets.flatMap((fret, index) => fret === null ? [] : [openMidi[index] + fret]), asset.soundingMidi);
    asset.frets.forEach((fret, index) => { if (fret === null || fret === 0) assert.equal(asset.fingers[index], null); else assert.ok(asset.fingers[index]! >= 1 && asset.fingers[index]! <= 4); });
  }
});

test("reference comparisons and rhythm diagrams preserve their authored teaching values", () => {
  const comparison = getInstructionAsset("flat-target-sharp");
  assert.equal(comparison.kind, "pitchComparison");
  if (comparison.kind === "pitchComparison") assert.deepEqual(comparison.examples.map(example => example.centsOffset), [-50, 0, 50]);
  const rhythm = getInstructionAsset("four-beat-reading");
  assert.equal(rhythm.kind, "rhythm");
  if (rhythm.kind === "rhythm") { assert.equal(rhythm.bpm, 60); assert.deepEqual(rhythm.meter, { numerator: 4, denominator: 4 }); assert.deepEqual(rhythm.eventBeats, [0, 1, 2, 3]); }
});
