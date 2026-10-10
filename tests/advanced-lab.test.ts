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
    // The authored tempo is the goal, so 100% on the tab player and on the
    // coach's 25–125% speed slider both mean the tempo the drill clears at.
    assert.equal(drill.spec.bpm, goal, `${drill.id}: 100% must mean the goal tempo`);
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

test("drill tiers name difficulty, never a paid plan", () => {
  // The whole lab is free, so no badge may read like a subscription tier.
  for (const drill of DRILLS) assert.ok(["Core", "Advanced", "Expert"].includes(drill.tier), `${drill.id} tier ${drill.tier}`);
});

test("every drill ships a keyword-first search title and snippet", () => {
  for (const drill of DRILLS) {
    assert.ok(`${drill.seo.title} | GuitarHub`.length <= 60, `${drill.id} title is too long for the results page`);
    assert.ok(drill.seo.description.length >= 140 && drill.seo.description.length <= 155, `${drill.id} description is ${drill.seo.description.length} characters`);
    assert.match(drill.seo.description, /guitar/i, `${drill.id} description must name the instrument`);
  }
});

/** Note name and octave of a target, so a drill's instructions can be checked against what it scores. */
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteOf = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const pitches = (id: string) => {
  const drill = DRILLS.find(item => item.id === id)!;
  return drill.spec.targets.map(target => noteOf(target.midi!));
};

test("octave string skipping plays root, octave, third, octave for every chord", () => {
  assert.deepEqual(pitches("octave-string-skipping"), [
    "C3", "C4", "E3", "E4",
    "A2", "A3", "C3", "C4",
    "F2", "F3", "A2", "A3",
    "G2", "G3", "B2", "B3",
  ]);
});

test("ear-training and fretboard drills name exactly what they score", () => {
  const intervals = DRILLS.find(item => item.id === "intervals-from-a")!;
  assert.match(intervals.steps.join(" "), /major third, perfect fourth, perfect fifth, major sixth, minor seventh, octave/);
  assert.deepEqual(pitches("intervals-from-a").filter((_, index) => index % 2 === 1), ["C#3", "D3", "E3", "F#3", "G3", "A3"]);
  assert.deepEqual(new Set(pitches("every-c").map(note => note.slice(0, -1))), new Set(["C"]));
  const bends = DRILLS.find(item => item.id === "bends-in-tune")!;
  assert.match(bends.steps.join(" "), /half step/);
});

test("triplet drills show readable beat positions, never raw floating point", async () => {
  const { targetMap, formatBeat } = await import("../lib/audio/practice-selection.ts");
  for (const id of ["quarter-note-triplets", "triplet-sixteenth-shift"]) {
    const drill = DRILLS.find(item => item.id === id);
    assert.ok(drill, id);
    for (const target of targetMap(drill!.spec)) {
      assert.match(target.beatInBar, /^\d+(\.\d{1,2})?$/, `${id}: beat ${target.beatInBar}`);
    }
  }
  assert.equal(formatBeat(1.6669999999999998), "1.67");
  assert.equal(formatBeat(1.3330000000000002), "1.33");
  assert.equal(formatBeat(2), "2");
  assert.equal(formatBeat(1.75), "1.75");
  assert.equal(formatBeat(Number.NaN), "");
});
