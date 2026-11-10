import test from "node:test";
import assert from "node:assert/strict";
import { FREE_MODULES, freeModuleFor, freeModuleLessonIds, isFreeModuleCandidate, parseFreeModuleChoice } from "../lib/learning/free-module.ts";

test("the free modules are the three in the shared contract", () => {
  assert.deepEqual(FREE_MODULES, { beginner: "g-l2-m1", intermediate: "g-l4-m1", advanced: "g-l5-m4" });
  assert.equal(freeModuleFor("intermediate"), "g-l4-m1");
  assert.equal(isFreeModuleCandidate("g-l1-m1"), false); // first in the catalogue is not free
  assert.ok(freeModuleLessonIds("g-l2-m1").length > 0);
  assert.ok(freeModuleLessonIds("g-l2-m1").every(id => id.startsWith("g-l2-m1-")));
});

test("a stored choice is read back only when it names a candidate module", () => {
  assert.deepEqual(parseFreeModuleChoice('{"moduleId":"g-l2-m1","placement":"beginner"}'), { moduleId: "g-l2-m1", placement: "beginner" });
  for (const raw of [null, "", "{", '{"moduleId":"g-l3-m1","placement":"beginner"}', '{"moduleId":"g-l2-m1","placement":"expert"}'])
    assert.equal(parseFreeModuleChoice(raw), null);
});
