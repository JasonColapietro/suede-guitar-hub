import test from "node:test";
import assert from "node:assert/strict";
import { parseProgress, progressKey, emptyProgress, nextLessonId, completedCount, elapsedSeconds, withLessonRecord, type LessonRecord } from "../lib/learning/progress.ts";
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
test("slower measured practice retains its score and tempo without becoming checkpoint completion", () => {
  const raw = JSON.stringify({ version: 1, track: "guitar", lessons: { [ids[1]]: { ...record, source: "measured", bpm: 60, completionMinimumBPM: 80 } } });
  const restored = parseProgress(raw, "guitar", ids).lessons[ids[1]];
  assert.equal(restored.score, 100);
  assert.equal(restored.bpm, 60);
  assert.equal(restored.completionMinimumBPM, 80);
  assert.equal(restored.assessment, "repeat");
});
test("the revised checkpoint keeps legacy scores as repeat and only a matching full-tempo result is current", () => {
  const id = "g-l2-m2-06";
  const measured: LessonRecord = { updatedAt: "2026-09-04T12:00:00Z", practiceSeconds: 48, assessment: "ready", source: "measured", score: 100, bpm: 80 };
  const restore = (record: LessonRecord) => parseProgress(JSON.stringify({ version: 1, track: "guitar", lessons: { [id]: record } }), "guitar", [id]);
  assert.equal(restore(measured).lessons[id].assessment, "repeat");
  assert.equal(restore(measured).lessons[id].score, 100);
  assert.equal(restore({ ...measured, practiceSpecRevision: 1 }).lessons[id].assessment, "repeat");
  assert.equal(restore({ ...measured, practiceSpecRevision: 2 }).lessons[id].assessment, "ready");
  assert.equal(restore({ ...measured, practiceSpecRevision: 2, bpm: 60 }).lessons[id].assessment, "repeat");
  assert.equal(restore({ ...measured, practiceSpecRevision: 2, score: 30 }).lessons[id].assessment, "repeat");
  assert.equal(restore({ ...measured, source: "selfReported", practiceSpecRevision: 2 }).lessons[id].assessment, "repeat");
  let progress = restore(measured);
  const revisionTwo = { ...measured, updatedAt: "2026-09-04T12:10:00Z", practiceSpecRevision: 2 };
  progress = withLessonRecord(progress, id, revisionTwo, "current-attempt");
  progress = parseProgress(JSON.stringify(progress), "guitar", [id]);
  assert.equal(progress.measuredAttempts?.length, 2);
  assert.equal(progress.measuredAttempts?.[0].record.score, 100);
  assert.equal(progress.measuredAttempts?.[0].record.assessment, "repeat");
  assert.equal(progress.measuredAttempts?.[1].record.practiceSpecRevision, 2);
  progress = withLessonRecord(progress, id, { ...revisionTwo, source: "selfReported", score: null, assessment: "repeat" }, "reflection");
  assert.equal(progress.measuredAttempts?.length, 2, "self-reported reflection cannot erase or duplicate microphone history");
  const beforeDuplicateSave = progress;
  progress = withLessonRecord(progress, id, { ...revisionTwo, updatedAt: "2026-09-04T12:30:00Z" }, "current-attempt");
  assert.equal(progress, beforeDuplicateSave, "saving the same run again cannot duplicate history or overwrite a later reflection");
});
