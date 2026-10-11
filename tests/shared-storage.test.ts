import test from "node:test";
import assert from "node:assert/strict";
import {
  carryProgress,
  createStoredValue,
  setMembership,
  subscribeToStoredKey,
} from "../lib/shared-storage.ts";

function disk() {
  const bytes = new Map<string, string>();
  return {
    bytes,
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => void bytes.set(key, value),
    removeItem: (key: string) => void bytes.delete(key),
  };
}

type Counter = { count: number };
const restoreCounter = (value: unknown): Counter | null =>
  value && typeof value === "object" && typeof (value as Counter).count === "number"
    ? { count: (value as Counter).count }
    : null;

test("update replays the change on the latest stored value, not the caller's copy", () => {
  const shared = disk();
  const tabA = createStoredValue({ key: "k", restore: restoreCounter, storage: () => shared });
  const tabB = createStoredValue({ key: "k", restore: restoreCounter, storage: () => shared });

  const staleCopy = { count: 0 };
  tabA.update(staleCopy, latest => ({ count: (latest?.count ?? 0) + 1 }));
  const result = tabB.update(staleCopy, latest => ({ count: (latest?.count ?? 0) + 1 }));

  assert.deepEqual(result.value, { count: 2 });
  assert.equal(result.persisted, true);
  assert.equal(shared.getItem("k"), JSON.stringify({ count: 2 }));
});

test("null removes the key and a corrupt payload is dropped on read", () => {
  const shared = disk();
  const store = createStoredValue({ key: "k", restore: restoreCounter, storage: () => shared });
  store.write({ count: 3 });
  store.update(null, () => null);
  assert.equal(shared.bytes.has("k"), false);

  shared.setItem("k", "{not json");
  assert.deepEqual(store.read(), { available: true, value: null, persisted: true });
  assert.equal(shared.bytes.has("k"), false);

  shared.setItem("k", JSON.stringify({ wrong: true }));
  assert.deepEqual(store.read(), { available: true, value: null, persisted: true });
  assert.equal(shared.bytes.has("k"), false);
});

test("unavailable storage is reported, and update falls back to the in-memory value", () => {
  const store = createStoredValue({
    key: "k",
    restore: restoreCounter,
    storage: () => { throw new Error("SecurityError"); },
  });
  assert.deepEqual(store.read(), { available: false });
  const result = store.update({ count: 5 }, latest => ({ count: (latest?.count ?? 0) + 1 }));
  assert.deepEqual(result, { value: { count: 6 }, persisted: false });
  assert.equal(store.write({ count: 1 }), false);
});

test("a readable store that refuses writes preserves successive edits until saving recovers", () => {
  const shared = disk();
  shared.setItem("k", JSON.stringify({ count: 1 }));
  let writable = false;
  const store = createStoredValue({
    key: "k", restore: restoreCounter,
    storage: () => ({ ...shared, setItem: (key: string, value: string) => {
      if (!writable) throw new Error("QuotaExceededError");
      shared.setItem(key, value);
    } }),
  });
  const increment = (latest: Counter | null) => ({ count: (latest?.count ?? 0) + 1 });
  const first = store.update(null, increment);
  const second = store.update(first.value, increment);
  assert.deepEqual(second, { value: { count: 3 }, persisted: false });
  assert.deepEqual(store.read(), { available: true, value: { count: 3 }, persisted: false });
  assert.equal(shared.getItem("k"), JSON.stringify({ count: 1 }));
  writable = true;
  const saved = store.update(second.value, increment);
  assert.deepEqual(saved, { value: { count: 4 }, persisted: true });
  assert.equal(shared.getItem("k"), JSON.stringify({ count: 4 }));
});

test("a failed removal stays cleared in memory and retries without resurrecting the old value", () => {
  const shared = disk();
  shared.setItem("k", JSON.stringify({ count: 5 }));
  let writable = false;
  const store = createStoredValue({
    key: "k", restore: restoreCounter,
    storage: () => ({ ...shared, removeItem: (key: string) => {
      if (!writable) throw new Error("SecurityError");
      shared.removeItem(key);
    } }),
  });
  assert.equal(store.write(null), false);
  assert.deepEqual(store.read(), { available: true, value: null, persisted: false });
  writable = true;
  assert.deepEqual(store.update(null, latest => latest), { value: null, persisted: true });
  assert.equal(shared.getItem("k"), null);
});

test("a new stored version from another tab supersedes a failed-write snapshot", () => {
  const shared = disk();
  shared.setItem("k", JSON.stringify({ count: 1 }));
  const store = createStoredValue({
    key: "k", restore: restoreCounter,
    storage: () => ({ ...shared, setItem: () => { throw new Error("QuotaExceededError"); } }),
  });
  store.update(null, () => ({ count: 2 }));
  shared.setItem("k", JSON.stringify({ count: 9 }));
  assert.deepEqual(store.update({ count: 2 }, latest => ({ count: latest!.count + 1 })), {
    value: { count: 10 }, persisted: false,
  });
});

test("returning the latest value unchanged writes nothing", () => {
  const shared = disk();
  let writes = 0;
  const store = createStoredValue({
    key: "k",
    restore: restoreCounter,
    storage: () => ({ ...shared, setItem: (key: string, value: string) => { writes++; shared.setItem(key, value); } }),
  });
  store.write({ count: 1 });
  writes = 0;
  store.update(null, latest => latest);
  assert.equal(writes, 0);
});

test("serialize shapes what is written while restore reads it back", () => {
  const shared = disk();
  const store = createStoredValue<number[]>({
    key: "k",
    restore: value => (value && typeof value === "object" && Array.isArray((value as { items: unknown }).items) ? (value as { items: number[] }).items : null),
    serialize: items => ({ version: 1, items }),
    storage: () => shared,
  });
  store.write([1, 2]);
  assert.equal(shared.getItem("k"), JSON.stringify({ version: 1, items: [1, 2] }));
  assert.deepEqual(store.read(), { available: true, value: [1, 2], persisted: true });
});

test("subscribeToStoredKey reacts to its key and to a full clear, and unsubscribes", () => {
  const target = new EventTarget();
  let calls = 0;
  const unsubscribe = subscribeToStoredKey("k", () => calls++, target as never);
  const fire = (key: string | null) => {
    const event = new Event("storage") as Event & { key: string | null };
    Object.defineProperty(event, "key", { value: key });
    target.dispatchEvent(event);
  };
  fire("k");
  fire("other");
  fire(null);
  assert.equal(calls, 2);
  unsubscribe();
  fire("k");
  assert.equal(calls, 2);
});

test("carryProgress keeps ids the rebuilt plan still has and reports the rest", () => {
  assert.deepEqual(carryProgress(["a", "b", "a", "c"], ["a", "c", "d"]), {
    kept: ["a", "c"],
    dropped: ["b"],
  });
  assert.deepEqual(carryProgress([], ["a"]), { kept: [], dropped: [] });
});

test("setMembership states the end state, so a stale toggle cannot flip it back", () => {
  assert.deepEqual(setMembership(["a"], "a", true), ["a"]);
  assert.deepEqual(setMembership(["a", "b"], "a", false), ["b"]);
  assert.deepEqual(setMembership([], "a", true), ["a"]);
});
