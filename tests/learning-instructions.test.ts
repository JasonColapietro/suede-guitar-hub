import test from "node:test";
import assert from "node:assert/strict";
import { getLessonInstructions } from "../lib/learning/instructions.ts";
import { curricula } from "../lib/learning/curriculum.ts";
test("each authored beginner lesson has useful instructions that fit its session length", () => {
  for (const learningModule of curricula.guitar.levels[0].modules) {
    for (const lesson of learningModule.lessons) {
      const instructions = getLessonInstructions(lesson.id);
      assert.ok(instructions, lesson.id);
      assert.ok(instructions.steps.length >= 3);
      assert.ok(instructions.steps.every(step => step.body && step.lookCheck && step.listenCheck));
      assert.ok(instructions.criteria.length > 0);
      assert.ok(instructions.commonFixes.length > 0);
      assert.equal(instructions.practiceSegments.reduce((sum, segment) => sum + segment.seconds, 0), lesson.minutes * 60);
    }
  }
});
test("unwritten lessons remain outlines instead of fabricated complete lessons", () => {
  assert.equal(getLessonInstructions("v-l1-m1-01"), undefined);
  assert.equal(getLessonInstructions("does-not-exist"), undefined);
});
