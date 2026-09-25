import test from "node:test";
import assert from "node:assert/strict";
import { DRILLS, SKILL_AREAS, drillsForArea } from "../lib/advanced/drills.ts";
import { parseDrillProgress, withDrillResult } from "../lib/advanced/progress.ts";
import { validSpec, type PracticeResult } from "../lib/audio/practice.ts";
import { guitarPractice } from "../lib/audio/guitar-practice.ts";

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

test("every Advanced Lab drill is a valid, playable practice spec", () => {
  assert.equal(new Set(DRILLS.map(drill => drill.id)).size, DRILLS.length, "drill ids must be unique");
  for (const drill of DRILLS) {
    assert.ok(validSpec(drill.spec), `${drill.id} has an invalid spec`);
    const goal = drill.spec.completionMinimumBPM ?? drill.spec.bpm;
    // The coach's speed slider runs 25–125 per cent of the authored tempo.
    assert.ok(goal <= drill.spec.bpm * 1.25 + 1e-9, `${drill.id} goal ${goal} is out of reach of the speed slider`);
    if (drill.spec.mode === "pitchSequence") {
      for (const target of drill.spec.targets) {
        const f = hz(target.midi!);
        assert.ok(f >= guitarPractice.minimumFrequency && f <= guitarPractice.maximumFrequency, `${drill.id} ${target.id} is outside the pitch band`);
        assert.ok(target.guitarString! >= 1 && target.guitarString! <= 6 && target.fret! >= 0 && target.fret! <= 22, `${drill.id} ${target.id} has an impossible position`);
      }
      // A note must last long enough for the pitch gate to accept it at the goal tempo.
      const beats = drill.spec.targets.map(target => target.beat);
      const shortest = Math.min(...beats.slice(1).map((beat, index) => beat - beats[index]));
      assert.ok(shortest * 60 / goal >= guitarPractice.minimumHold, `${drill.id} notes are too short to score at ${goal} BPM`);
    }
    assert.ok(drill.steps.length >= 2 && drill.measures.length > 0, `${drill.id} needs steps and an honest scope`);
  }
});

test("all eight skill areas have drills", () => {
  assert.equal(SKILL_AREAS.length, 8);
  for (const area of SKILL_AREAS) assert.ok(drillsForArea(area.id).length >= 2, `${area.name} needs at least two drills`);
});

test("saved drill progress keeps the strongest evidence and ignores unscored attempts", () => {
  const ids = DRILLS.map(drill => drill.id), id = ids[0];
  const result = (score: number, bpm: number, passed: boolean): PracticeResult => ({ bpm, score, passed, disposition: "scored", practiceSeconds: 30, matchedTargets: 1, targetCount: 1, noteScore: score, rhythmScore: null });
  let progress = withDrillResult({}, id, result(70, 90, false), "a");
  progress = withDrillResult(progress, id, result(85, 90, true), "b");
  progress = withDrillResult(progress, id, result(95, 80, false), "c");
  assert.deepEqual({ ...progress[id], updatedAt: "" }, { score: 85, bpm: 90, passed: true, updatedAt: "", attempts: 3 });
  const unscored = withDrillResult(progress, id, { ...result(0, 90, false), disposition: "insufficientSignal", score: null, passed: null }, "d");
  assert.equal(unscored, progress);
  assert.deepEqual(parseDrillProgress(JSON.stringify({ ...progress, unknown: progress[id] }), ids), progress);
  assert.deepEqual(parseDrillProgress("not json", ids), {});
});
