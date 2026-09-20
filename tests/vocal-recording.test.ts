import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bindVocalRecordingLifecycle, recordingElapsedSeconds, VOCAL_TAKE_LIMIT_SECONDS, vocalTakeKey, vocalTakeOwnerScope } from "../lib/learning/vocal-recording.ts";

test("local vocal recording duration is monotonic, nonnegative, and capped at two minutes", () => {
  assert.equal(VOCAL_TAKE_LIMIT_SECONDS, 120);
  assert.equal(recordingElapsedSeconds(1_000, 500), 0);
  assert.equal(recordingElapsedSeconds(1_000, 31_250), 30.25);
  assert.equal(recordingElapsedSeconds(1_000, 999_999), 120);
  assert.equal(recordingElapsedSeconds(Number.NaN, 10), 0);
});

test("a hidden tab and pagehide interrupt recording, and cleanup removes both listeners", () => {
  class Page extends EventTarget { hidden = false; }
  const page = new Page(), surface = new EventTarget();
  let interruptions = 0;
  const cleanup = bindVocalRecordingLifecycle(
    () => interruptions++,
    page as unknown as Pick<Document, "hidden" | "addEventListener" | "removeEventListener">,
    surface as unknown as Pick<Window, "addEventListener" | "removeEventListener">,
  );
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(interruptions, 0);
  page.hidden = true;
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(interruptions, 1);
  surface.dispatchEvent(new Event("pagehide"));
  assert.equal(interruptions, 2);
  cleanup();
  page.dispatchEvent(new Event("visibilitychange"));
  surface.dispatchEvent(new Event("pagehide"));
  assert.equal(interruptions, 2);
});

test("browser takes are isolated between guest and signed-in account scopes", () => {
  const first = "a1111111-1111-4111-8111-111111111111";
  const second = "b2222222-2222-4222-8222-222222222222";
  assert.deepEqual(vocalTakeKey(vocalTakeOwnerScope(null), "v-l1-m1-01"), ["guest", "v-l1-m1-01"]);
  assert.deepEqual(vocalTakeKey(vocalTakeOwnerScope(first), "v-l1-m1-01"), [`account:${first}`, "v-l1-m1-01"]);
  assert.notDeepEqual(vocalTakeKey(vocalTakeOwnerScope(first), "v-l1-m1-01"), vocalTakeKey(vocalTakeOwnerScope(second), "v-l1-m1-01"));
});

test("browser takes use a compound IndexedDB key and have no network transport", () => {
  const source = readFileSync(new URL("../lib/learning/vocal-recording.ts", import.meta.url), "utf8");
  assert.match(source, /indexedDB\.open\(databaseName, 2\)/);
  assert.match(source, /createObjectStore\(storeName, \{ keyPath: \["ownerScope", "lessonId"\] \}\)/);
  assert.match(source, /store\.put\(value\)/);
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage/);
});
