import test from "node:test";
import assert from "node:assert/strict";
import { accessibleLessonIds, accountHistoryKey, canOpenModule, guestLearningAccess, hasVerifiedTrackAccess, isLessonReady, type LearningAccess } from "../lib/learning/access.ts";
import { allLessons, availableLessons } from "../lib/learning/curriculum.ts";

const accountId = "b52d7c76-cacb-4af7-891c-d056ba8f48aa";
const owned: LearningAccess = { enabled: true, accountId, tracks: ["guitar"], status: "verified" };

test("every lesson, including legacy free levels and samplers, requires a verified purchase", () => {
  for (const track of ["guitar", "voice"] as const) {
    const denied: LearningAccess[] = [guestLearningAccess,
      ...(["disabled", "signedOut", "unavailable"] as const).map(status => ({ ...owned, tracks: [track], status })),
      { ...owned, tracks: [] }, { ...owned, tracks: [track], enabled: false },
      { ...owned, tracks: [track], accountId: null },
      { ...owned, tracks: [track === "guitar" ? "voice" : "guitar"] },
    ];
    for (const access of denied) {
      assert.deepEqual(accessibleLessonIds(track, access), []);
      for (const { module } of allLessons(track)) assert.equal(canOpenModule(track, module.id, access), false);
    }
    const purchaser: LearningAccess = { ...owned, tracks: [track] };
    assert.deepEqual(accessibleLessonIds(track, purchaser), allLessons(track).filter(({ lesson }) => isLessonReady(track, lesson.id)).map(({ lesson }) => lesson.id));
    for (const { module } of availableLessons(track)) assert.equal(canOpenModule(track, module.id, purchaser), true);
    assert.equal(canOpenModule(track, "invented-module", purchaser), false);
  }
});

test("readiness follows authored content rather than entitlement", () => {
  assert.equal(isLessonReady("guitar", "g-l1-m1-02"), true);
  assert.equal(isLessonReady("voice", "v-l1-m1-01"), true);
  assert.equal(isLessonReady("guitar", "g-l7-m1-01"), true);
  assert.equal(isLessonReady("guitar", "missing"), false);
  assert.equal(accessibleLessonIds("voice", { ...owned, tracks: ["voice"] }).length, 102);
});

test("the full practice library requires an exact verified track grant", () => {
  assert.equal(hasVerifiedTrackAccess("guitar", owned), true);
  assert.equal(hasVerifiedTrackAccess("voice", owned), false);
  assert.equal(hasVerifiedTrackAccess("voice", { ...owned, tracks: ["voice"] }), true);
  assert.equal(hasVerifiedTrackAccess("voice", { ...owned, tracks: ["voice"], status: "unavailable" }), false);
  assert.equal(hasVerifiedTrackAccess("voice", { ...owned, tracks: ["voice"], accountId: null }), false);
  assert.equal(hasVerifiedTrackAccess("voice", guestLearningAccess), false);
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
