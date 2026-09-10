import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLearningAttempt } from "../lib/learning-account/contracts.ts";
import { mergeAccountProgress, syncLessonMap } from "../lib/learning-sync/evidence.ts";
import { emptyProgress, emptyReadingQuizProgress } from "../lib/learning/progress.ts";

const contract = JSON.parse(readFileSync(new URL("../contracts/learning-evidence.json", import.meta.url), "utf8")) as {
  version: number; knownDivergences: unknown[];
  fixtures: { case: string; attempt: unknown; expectedCompleted: boolean }[];
};
test("native learning evidence fixtures are nonempty, mixed-outcome and have no untracked divergence", () => {
  assert.equal(contract.version, 1); assert.deepEqual(contract.knownDivergences, []);
  assert.equal(contract.fixtures.length, 27);
  assert.equal(new Set(contract.fixtures.map(item => item.case)).size, contract.fixtures.length);
  assert.ok(contract.fixtures.some(item => item.expectedCompleted));
  assert.ok(contract.fixtures.some(item => !item.expectedCompleted));
});
for (const fixture of contract.fixtures) test(`native guided evidence: ${fixture.case}`, () => {
  const event = parseLearningAttempt(fixture.attempt, syncLessonMap);
  const progress = mergeAccountProgress(emptyProgress(event.track), emptyReadingQuizProgress(event.track), [event]);
  const record = progress.lessons[event.lessonId];
  assert.equal(record?.assessment === "ready", fixture.expectedCompleted);
  assert.equal(progress.measuredAttempts?.length ?? 0, 0);
  if (fixture.expectedCompleted) {
    assert.equal(record.source, "selfReported"); assert.equal(record.score, null);
    assert.equal(record.updatedAt, event.createdAt);
    assert.equal(record.practiceSeconds, event.practiceSeconds);
  }
});
