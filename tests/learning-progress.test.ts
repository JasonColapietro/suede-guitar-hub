import test from "node:test";
import assert from "node:assert/strict";
import { parseProgress, progressKey, emptyProgress, nextLessonId, completedCount, elapsedSeconds } from "../lib/learning/progress.ts";
const ids = ["g-l1-m1-01", "g-l1-m1-02", "g-l1-m1-04"];
const record = { updatedAt: "2026-09-04T12:00:00Z", practiceSeconds: 90, assessment: "ready", source: "selfReported", score: 100 };
test("progress storage isolates tracks and removes fabricated self-report scores", () => {
  const raw = JSON.stringify({version: 1, track: "guitar", lessons: { [ids[0]]: record, "g-l2-m1-01": record }});
  const progress = parseProgress(raw, "guitar", ids);
  assert.equal(progress.lessons[ids[0]].score, null);
  assert.deepEqual(Object.keys(progress.lessons), [ids[0]]);
  assert.deepEqual(parseProgress(raw, "voice", ids), emptyProgress("voice"));
  assert.notEqual(progressKey("voice"), progressKey("guitar"));
});
test("malformed data and invalid measured attempts cannot become completion", () => {
  assert.deepEqual(parseProgress("{bad", "guitar", ids), emptyProgress("guitar"));
  const raw = JSON.stringify({version:1,track:"guitar",lessons:{[ids[0]]:{...record,source:"measured",score:null},[ids[1]]:{...record,practiceSeconds:-1}}});
  assert.equal(completedCount(ids, parseProgress(raw, "guitar", ids)), 0);
  assert.deepEqual(parseProgress("x".repeat(200_001), "guitar", ids), emptyProgress("guitar"));
});
test("continue respects unfinished and revisit lessons rather than watch time", () => {
  const progress = parseProgress(JSON.stringify({version:1,track:"guitar",lessons:{[ids[0]]:record,[ids[1]]:{...record,assessment:"repeat"}}}), "guitar", ids);
  assert.equal(completedCount(ids, progress), 1);
  assert.equal(nextLessonId(ids, progress), ids[1]);
});
test("practice time uses elapsed time, pause accumulation and a bounded duration", () => {
  assert.equal(elapsedSeconds(2000, 1000, 4500), 5);
  assert.equal(elapsedSeconds(5500, null, 200000), 5);
  assert.equal(elapsedSeconds(0, 4000, 2000), 0);
  assert.equal(elapsedSeconds(1000000000, null, 0), 86400);
});
