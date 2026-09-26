import test from "node:test";
import assert from "node:assert/strict";
import { bestLessonStars, daysThisWeek, parsePracticeLog, starsForResult, starsForTapScore, streak, withPractice } from "../lib/learning/rewards.ts";

test("stars describe real results only", () => {
  assert.equal(starsForResult({ score: null, passed: null, bpm: 80 }, 80), 0);
  assert.equal(starsForResult({ score: 55, passed: false, bpm: 80 }, 80), 0);
  assert.equal(starsForResult({ score: 70, passed: false, bpm: 80 }, 80), 1);
  assert.equal(starsForResult({ score: 90, passed: true, bpm: 70 }, 80), 2, "a pass below goal tempo is two stars");
  assert.equal(starsForResult({ score: 90, passed: true, bpm: 80 }, 80), 3);
  assert.equal(starsForResult({ score: 90, passed: true, bpm: 60 }), 3, "no goal tempo: any pass is three stars");
  assert.deepEqual([59, 60, 80, 95].map(starsForTapScore), [0, 1, 2, 3]);
  const attempts = [{ lessonId: "a", record: { score: 70, assessment: "repeat", bpm: 60 } }, { lessonId: "a", record: { score: 85, assessment: "ready", bpm: 60, completionMinimumBPM: 80 } }, { lessonId: "b", record: { score: 99, assessment: "ready", bpm: 99 } }];
  assert.equal(bestLessonStars(attempts, "a"), 2);
  assert.equal(bestLessonStars(attempts, "c"), 0);
});

test("streak survives until the day ends and the week counts distinct days", () => {
  let log = parsePracticeLog(null);
  const day = (d: number) => new Date(2026, 8, d, 21);
  for (const d of [20, 21, 22, 24]) log = withPractice(log, day(d), 300);
  log = withPractice(log, day(24), 120);
  assert.equal(log.days["2026-09-24"], 420);
  assert.equal(streak(log, day(24)), 1);
  assert.equal(streak(log, day(25)), 1, "yesterday still counts before today's practice");
  assert.equal(streak(log, day(26)), 0);
  assert.equal(streak(withPractice(log, day(23), 60), day(24)), 5);
  // 2026-09-21 is a Monday; the 20th belongs to the previous week.
  assert.equal(daysThisWeek(log, day(25)), 3);
  assert.equal(parsePracticeLog('{"days":{"bad":1,"2026-09-01":-4,"2026-09-02":60},"weeklyGoal":9}').weeklyGoal, 4);
  assert.deepEqual(parsePracticeLog('{"days":{"bad":1,"2026-09-02":60}}').days, { "2026-09-02": 60 });
});
