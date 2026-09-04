import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { curricula, availableLessons, getLesson, isModuleAvailable, lessonHref } from "../lib/learning/curriculum.ts";
import { validateCurriculum, validatePracticeSpec } from "../lib/learning/models.ts";

test("bundled curriculum contains unique stable native lesson IDs", () => {
  for (const track of ["guitar", "voice"] as const) {
    const ids = curricula[track].levels.flatMap(level => level.modules.flatMap(module => module.lessons.map(lesson => lesson.id)));
    assert.equal(new Set(ids).size, ids.length);
  }
});
test("web sampler matches native first-module boundary even with legacy free level labels", () => {
  for (const track of ["guitar", "voice"] as const) {
    const first = curricula[track].levels[0].modules[0];
    assert.deepEqual(availableLessons(track).map(({ lesson }) => lesson.id), first.lessons.map(lesson => lesson.id));
    assert.equal(isModuleAvailable(track, curricula[track].levels[0].modules[1].id), false);
    assert.equal(isModuleAvailable(track, curricula[track].levels[1].modules[0].id), false);
  }
});
test("curriculum validation rejects duplicate IDs and unsafe pitch targets", () => {
  const duplicate = structuredClone(curricula.guitar);
  duplicate.levels[0].modules[0].lessons[1].id = duplicate.levels[0].modules[0].lessons[0].id;
  assert.throws(() => validateCurriculum(duplicate, "guitar"), /duplicate/);
  const spec = structuredClone(curricula.guitar.levels[0].modules[0].lessons[1].practiceSpec!);
  spec.targets[0].midi = undefined;
  assert.throws(() => validatePracticeSpec(spec), /MIDI/);
  spec.targets[0].midi = 40;
  spec.targets[1].beat = -1;
  assert.throws(() => validatePracticeSpec(spec), /beat/);
});
test("lesson lookup rejects another track and URLs retain stable IDs", () => {
  assert.equal(getLesson("voice", "g-l1-m1-01"), undefined);
  assert.equal(lessonHref("guitar", "g-l1-m1-01"), "/learn/guitar/g-l1-m1-01");
});

// The web repository is independently deployable; compare source bundles whenever
// the sibling iOS checkout is available in the shared product workspace.
const nativeRoot = new URL("../../ios/GuitarHubCore/Sources/GuitarHubCore/Resources/", import.meta.url);
test("web bundles exactly match the sibling iOS curriculum", { skip: !existsSync(nativeRoot) }, () => {
  for (const track of ["guitar", "voice"] as const) {
    assert.deepEqual(curricula[track], JSON.parse(readFileSync(new URL(`${track}.json`, nativeRoot), "utf8")));
  }
});
