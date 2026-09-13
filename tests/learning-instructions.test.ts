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
test("every native voice lesson has useful instructions that fit its session length", () => {
  for (const level of curricula.voice.levels) {
    for (const learningModule of level.modules) {
      for (const lesson of learningModule.lessons) {
        const instructions = getLessonInstructions(lesson.id);
        assert.ok(instructions, lesson.id);
        assert.ok(instructions.steps.length >= 3 && instructions.steps.length <= 6);
        assert.ok(instructions.steps.every(step => step.body && step.lookCheck && step.listenCheck));
        assert.equal(new Set(instructions.steps.map(step => step.title)).size, instructions.steps.length);
        assert.ok(instructions.criteria.length >= 3 && instructions.criteria.length <= 5);
        assert.equal(new Set(instructions.criteria).size, instructions.criteria.length);
        assert.ok(instructions.commonFixes.length >= 2 && instructions.commonFixes.length <= 5);
        assert.equal(new Set(instructions.practiceSegments.map(segment => segment.instruction)).size, instructions.practiceSegments.length);
        assert.deepEqual(instructions.assets, [], `${lesson.id}: voice assets need a voice-safe renderer before authoring`);
        assert.equal(instructions.practiceSegments.reduce((sum, segment) => sum + segment.seconds, 0), lesson.minutes * 60);
      }
    }
  }
});
test("unknown lessons remain absent instead of fabricating instructions", () => {
  assert.equal(getLessonInstructions("does-not-exist"), undefined);
});
