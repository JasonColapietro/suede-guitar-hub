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

test("speed presets are labelled by purpose, climb about 10% a rung and include the goal at 100%", async () => {
  const { drillTempoPresets, drillGoalBpm } = await import("../lib/advanced/tempo-presets.ts");
  for (const drill of DRILLS) {
    const goal = drillGoalBpm(drill);
    const presets = drillTempoPresets(drill);
    assert.deepEqual(presets.map(preset => preset.label), ["Learn", "Build", "Push", "Goal", "Stretch"], drill.id);
    const atGoal = presets.find(preset => preset.id === "goal")!;
    assert.equal(atGoal.bpm, goal, `${drill.id}: the goal tempo is a preset`);
    assert.equal(atGoal.percent, 100, `${drill.id}: the goal preset is 100%`);
    for (let index = 1; index < presets.length; index++) {
      const [slower, faster] = [presets[index - 1].bpm, presets[index].bpm];
      assert.ok(faster > slower, `${drill.id}: presets must climb`);
      // The site's tempo-ladder rule: no rung more than ~10% above the last
      // (one BPM of slack for rounding to whole numbers).
      assert.ok(faster <= slower * 1.1 + 1, `${drill.id}: ${slower} → ${faster} BPM is more than a 10% step`);
    }
    const stretch = presets.at(-1)!.bpm;
    assert.ok(stretch <= goal * 1.25, `${drill.id}: Stretch is beyond the coach's 125% slider`);
    assert.ok(presets[0].bpm >= goal * .25, `${drill.id}: Learn is below the coach's 25% slider`);
    if (drill.spec.mode === "pitchSequence") {
      const beats = drill.spec.targets.map(target => target.beat);
      const shortest = Math.min(...beats.slice(1).map((beat, index) => beat - beats[index]));
      assert.ok(shortest * 60 / stretch >= guitarPractice.minimumHold, `${drill.id} notes are too short to score at the Stretch preset`);
    }
  }
});

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const GUIDE_HREFS = async () => (await import("../lib/site.ts")).GUIDES.map(guide => guide.href);

test("every drill page carries 250-400 words of its own teaching", async () => {
  const { DRILL_TEACHING } = await import("../lib/advanced/teaching.ts");
  assert.deepEqual(Object.keys(DRILL_TEACHING).sort(), DRILLS.map(drill => drill.id).sort(), "teaching and drills must match one to one");
  for (const drill of DRILLS) {
    const teaching = DRILL_TEACHING[drill.id];
    assert.equal(teaching.mistakes.length, 3, `${drill.id} needs three common mistakes`);
    const text = [...teaching.mistakes.flatMap(item => [item.mistake, item.fix]), teaching.tempo.learn, teaching.tempo.build, teaching.tempo.goal, teaching.music, teaching.variation].join(" ");
    const words = wordCount(text);
    assert.ok(words >= 250 && words <= 400, `${drill.id} teaching is ${words} words`);
    for (const stage of Object.values(teaching.tempo)) {
      // Rung tempos come from drillTempoPresets so copy cannot drift from the goal.
      assert.doesNotMatch(stage, /\d\s*BPM/i, `${drill.id} tempo copy names its own BPM`);
    }
  }
});

test("related links point at real drills and published guides", async () => {
  const { DRILL_TEACHING } = await import("../lib/advanced/teaching.ts");
  const { existsSync } = await import("node:fs");
  const guides = await GUIDE_HREFS();
  for (const drill of DRILLS) {
    const { relatedDrills, relatedGuides } = DRILL_TEACHING[drill.id];
    assert.ok(relatedDrills.length >= 2 && relatedDrills.length <= 3, `${drill.id} needs 2-3 related drills`);
    assert.equal(new Set(relatedDrills).size, relatedDrills.length, `${drill.id} repeats a related drill`);
    for (const id of relatedDrills) {
      assert.notEqual(id, drill.id, `${drill.id} links to itself`);
      assert.ok(DRILLS.some(item => item.id === id), `${drill.id} links to missing drill ${id}`);
    }
    assert.ok(relatedGuides.length >= 1 && relatedGuides.length <= 2, `${drill.id} needs 1-2 related guides`);
    for (const href of relatedGuides) {
      assert.ok(guides.includes(href), `${drill.id}: ${href} is not in GUIDES`);
      assert.ok(existsSync(`app${href}/page.tsx`), `${drill.id}: app${href}/page.tsx does not exist`);
    }
  }
});

test("drill copy states its claims confidently without absolutes or hedges", async () => {
  const { DRILL_TEACHING } = await import("../lib/advanced/teaching.ts");
  const overclaims = /\b(always|the most common|the fastest|the only way|guarantee[sd]?)\b/i;
  const hedges = /honest (limits|caveats)|what it is not|not a fit|will not promise/i;
  const british = /\b(colour\w*|practis\w*|favourite|centre|metre|recognis\w*|organis\w*|behaviour|rumour|analys(e|ing))\b/i;
  for (const drill of DRILLS) {
    const teaching = DRILL_TEACHING[drill.id];
    const copy = [drill.why, drill.summary, ...drill.steps, ...teaching.mistakes.flatMap(item => [item.mistake, item.fix]), ...Object.values(teaching.tempo), teaching.music, teaching.variation];
    for (const line of copy) {
      assert.doesNotMatch(line, overclaims, `${drill.id}: ${line}`);
      assert.doesNotMatch(line, hedges, `${drill.id}: ${line}`);
      assert.doesNotMatch(line, british, `${drill.id}: ${line}`);
    }
  }
});

test("teaching that names a drill's notes matches its exercise map", () => {
  const positions = (id: string) => DRILLS.find(item => item.id === id)!.spec.targets.map(target => `${target.guitarString}/${target.fret}`);
  // Guide tones: string 4 carries F, F, E and string 3 carries C, B, B.
  assert.deepEqual(pitches("guide-tones").slice(0, 6), ["F3", "C4", "F3", "B3", "E3", "B3"]);
  // Every C: the octave list in the second mistake.
  const everyC = DRILLS.find(item => item.id === "every-c")!.spec.targets.map(target => `${noteOf(target.midi!)}@${target.guitarString}/${target.fret}`);
  assert.deepEqual(new Set(everyC), new Set(["C3@5/3", "C3@6/8", "C4@3/5", "C4@4/10", "C4@2/1", "C5@1/8", "C5@2/13"]));
  // Night Drive: B in bar 1 lasts a beat and a half, D in bar 2 lasts two beats, and bar 3 ends B, C in eighths.
  const etude = DRILLS.find(item => item.id === "night-drive-etude")!.spec.targets;
  const length = (index: number) => etude[index + 1].beat - etude[index].beat;
  assert.equal(noteOf(etude[2].midi!), "B4"); assert.equal(length(2), 1.5);
  assert.equal(noteOf(etude[6].midi!), "D4"); assert.equal(length(6), 2);
  assert.deepEqual([noteOf(etude[10].midi!), etude[10].beat, noteOf(etude[11].midi!), etude[11].beat], ["B4", 11, "C5", 11.5]);
  // Dotted eighths: the hits that meet the foot are beat 1, beat 4, then beat 3 of bar 2 and beat 2 of bar 3.
  const dotted = DRILLS.find(item => item.id === "dotted-eighth-displacement")!.spec.targets.map(target => target.beat).filter(beat => Number.isInteger(beat));
  assert.deepEqual(dotted, [0, 3, 6, 9]);
  // Alternating bass: thumb on strings 5 and 4 over C, 6 and 5 over G.
  const thumb = DRILLS.find(item => item.id === "alternating-bass-etude")!.spec.targets.filter(target => target.cue === "Thumb").map(target => target.guitarString);
  assert.deepEqual(thumb, [5, 4, 5, 4, 6, 5, 6, 5]);
  // Enclosures: each group is three neighboring frets on one string, and the targets spell F♯m7.
  const enclosure = positions("enclosures");
  for (let group = 0; group < 4; group++) {
    const [above, below, target] = enclosure.slice(group * 3, group * 3 + 3).map(position => position.split("/").map(Number));
    assert.ok(above[0] === below[0] && below[0] === target[0] && above[1] === target[1] + 1 && below[1] === target[1] - 1, `enclosure ${group + 1}`);
  }
  assert.deepEqual(new Set(pitches("enclosures").filter((_, index) => index % 3 === 2).map(note => note.slice(0, -1))), new Set(["C#", "F#", "A", "E"]));
  // Bends: the last pair is a half step from string 1 fret 7 (B) to C.
  const bend = DRILLS.find(item => item.id === "bends-in-tune")!.spec.targets.at(-1)!;
  assert.deepEqual([bend.guitarString, bend.fret, noteOf(bend.midi!)], [1, 7, "C5"]);
});
