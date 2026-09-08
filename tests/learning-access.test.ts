import test from "node:test";
import assert from "node:assert/strict";
import { accessibleLessonIds, accountHistoryKey, canOpenModule, guestLearningAccess, isLessonReady, type LearningAccess } from "../lib/learning/access.ts";
import { allLessons, availableLessons, curricula } from "../lib/learning/curriculum.ts";

const accountId = "b52d7c76-cacb-4af7-891c-d056ba8f48aa";
const owned: LearningAccess = { enabled: true, accountId, tracks: ["guitar"], status: "verified" };

test("only verified server access opens the owned track; the exact sampler remains available", () => {
  for (const track of ["guitar", "voice"] as const) {
    const sampler = availableLessons(track).filter(entry => isLessonReady(track, entry.lesson.id)).map(entry => entry.lesson.id);
    assert.deepEqual(accessibleLessonIds(track, guestLearningAccess), sampler);
    for (const status of ["disabled", "signedOut", "unavailable"] as const) {
      assert.deepEqual(accessibleLessonIds(track, { ...owned, tracks: [track], status }), sampler);
    }
  }
  assert.deepEqual(accessibleLessonIds("guitar", owned), allLessons("guitar").filter(entry => isLessonReady("guitar", entry.lesson.id)).map(entry => entry.lesson.id));
  assert.equal(accessibleLessonIds("guitar", owned).length, 99);
  assert.deepEqual(accessibleLessonIds("voice", owned), []);
  assert.equal(canOpenModule("guitar", "invented-module", owned), false);
  const paidModule = curricula.guitar.levels[0].modules[1].id;
  assert.equal(canOpenModule("guitar", paidModule, { ...owned, enabled: false }), false);
  assert.equal(canOpenModule("guitar", paidModule, { ...owned, accountId: null }), false);
});

test("an entitlement never turns a curriculum outline into a completable lesson", () => {
  assert.equal(isLessonReady("guitar", "g-l1-m1-02"), true);
  assert.equal(isLessonReady("voice", "v-l1-m1-01"), false);
  assert.equal(isLessonReady("guitar", "missing"), false);
  assert.deepEqual(accessibleLessonIds("voice", { ...owned, tracks: ["voice"] }), []);
});

test("history remains isolated on sign-in, sign-out and account switch without rewriting guest keys", () => {
  const originalKey = "guitarhub.learning.v1.guitar";
  const otherAccount = "93eb561e-0f5c-4e3b-a93f-d89c6d05e3b1";
  const stored = new Map([[originalKey, "guest progress"]]);
  stored.set(accountHistoryKey(originalKey, accountId), "first account progress");
  assert.equal(stored.get(accountHistoryKey(originalKey, null)), "guest progress");
  assert.equal(stored.get(accountHistoryKey(originalKey, otherAccount)), undefined);
  assert.equal(stored.get(accountHistoryKey(originalKey, accountId.toUpperCase())), "first account progress");
  assert.throws(() => accountHistoryKey(originalKey, "../other-user"), /invalid_uuid/);
});
