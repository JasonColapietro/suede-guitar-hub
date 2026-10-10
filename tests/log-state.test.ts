import test from "node:test";
import assert from "node:assert/strict";
import { applyLogChange, sessionCount, type LogChange } from "../lib/log-state.ts";
import {
  LOG_STORAGE_KEY,
  importLog,
  restoreLogState,
  serializeLog,
  storedLogPayload,
  type LogEntry,
} from "../lib/log.ts";
import { createStoredValue } from "../lib/shared-storage.ts";

const TODAY = "2026-10-07";

function entry(id: string, note = "Clean changes"): LogEntry {
  return { id, date: TODAY, focus: "Chord changes", metric: "tempo", value: 80, note };
}

function draft(note: string, value = 80) {
  return { date: TODAY, focus: "Chord changes", metric: "tempo", value, note };
}

function apply(latest: readonly LogEntry[], change: LogChange): LogEntry[] {
  const result = applyLogChange(latest, change);
  assert.ok(result.ok, result.ok ? "" : result.error.message);
  return result.entries;
}

/** One shared localStorage, the way two tabs of the same origin see it. */
function sharedDisk() {
  const bytes = new Map<string, string>();
  return {
    bytes,
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => void bytes.set(key, value),
    removeItem: (key: string) => void bytes.delete(key),
  };
}

function logStoreOn(disk: ReturnType<typeof sharedDisk>) {
  return createStoredValue<LogEntry[]>({
    key: LOG_STORAGE_KEY,
    restore: restoreLogState,
    serialize: storedLogPayload,
    storage: () => disk,
  });
}

/** What PracticeLog's `commit` does: replay the change on what is stored now. */
function commit(
  store: ReturnType<typeof logStoreOn>,
  memory: LogEntry[],
  change: LogChange,
): LogEntry[] {
  const { value } = store.update(memory, (latest) => {
    const outcome = applyLogChange(latest ?? [], change);
    if (!outcome.ok) return latest;
    return outcome.entries.length > 0 ? outcome.entries : null;
  });
  return value ?? [];
}

test("a delayed file import preserves sessions added and edited during the read", async () => {
  let latest: LogEntry[] = [entry("held")];
  let finishRead!: (text: string) => void;
  const pendingRead = new Promise<string>(resolve => { finishRead = resolve; });
  let message = "";
  const importing = (async () => {
    const parsed = importLog(await pendingRead);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const result = applyLogChange(latest, { type: "import", imported: parsed.value });
    assert.ok(result.ok);
    if (result.ok) { latest = result.entries; message = result.message; }
  })();
  const edited = entry("held", "Corrected after starting import");
  const added = entry("added", "New session while file loads");
  latest = [edited, added];
  finishRead(serializeLog([entry("imported", "Imported session")], TODAY));
  await importing;
  assert.ok(latest.some(row => row.id === edited.id && row.note === edited.note));
  assert.ok(latest.some(row => row.id === added.id));
  assert.equal(latest.length, 3);
  assert.equal(message, "Added 1 session.");
});

test("queued imports merge against one another and keep accurate duplicate counts", () => {
  const imported = { entries: [entry("a")], truncated: 0 };
  const once = apply([], { type: "import", imported });
  const twice = applyLogChange(once, { type: "import", imported });
  assert.ok(twice.ok);
  if (!twice.ok) return;
  assert.equal(twice.entries.length, 1);
  assert.equal(twice.message, "Added 0 sessions, and skipped 1 already in this browser.");
});

test("clearing before an import completes does not resurrect unrelated old sessions", () => {
  const cleared = apply([entry("old")], { type: "clear", ids: ["old"] });
  const result = applyLogChange(cleared, { type: "import", imported: { entries: [entry("new")], truncated: 2 } });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.entries.map(row => row.id), ["new"]);
  assert.match(result.message, /2 oldest were not read/);
});

test("pluralizes session counts, including one", () => {
  assert.equal(sessionCount(0), "0 sessions");
  assert.equal(sessionCount(1), "1 session");
  assert.equal(sessionCount(2), "2 sessions");
});

test("two tabs adding sessions keep both, instead of the last writer winning", () => {
  const disk = sharedDisk();
  const tabA = logStoreOn(disk);
  const tabB = logStoreOn(disk);

  // Both tabs load the same empty log.
  let memoryA: LogEntry[] = [];
  let memoryB: LogEntry[] = [];

  memoryA = commit(tabA, memoryA, { type: "add", draft: draft("From tab A"), today: TODAY });
  // Tab B never saw A's session in memory. Its change is replayed on storage.
  memoryB = commit(tabB, memoryB, { type: "add", draft: draft("From tab B", 84), today: TODAY });

  const stored = tabA.read();
  assert.ok(stored.available);
  assert.deepEqual(
    stored.value?.map(row => row.note).sort(),
    ["From tab A", "From tab B"],
  );
  assert.equal(memoryB.length, 2, "tab B now shows both sessions");
  assert.equal(memoryA.length, 1, "tab A is stale until its storage listener re-reads");
});

test("an edit or delete in one tab does not drop a session the other tab added", () => {
  const disk = sharedDisk();
  const tabA = logStoreOn(disk);
  const tabB = logStoreOn(disk);
  const seeded = commit(tabA, [], { type: "add", draft: draft("Seeded"), today: TODAY });
  const seededId = seeded[0].id;

  commit(tabB, seeded, { type: "add", draft: draft("Added in B", 90), today: TODAY });
  commit(tabA, seeded, { type: "update", id: seededId, draft: draft("Edited in A"), today: TODAY });
  let notes = tabA.read();
  assert.ok(notes.available);
  assert.deepEqual(notes.value?.map(row => row.note).sort(), ["Added in B", "Edited in A"]);

  commit(tabA, seeded, { type: "remove", id: seededId });
  notes = tabB.read();
  assert.ok(notes.available);
  assert.deepEqual(notes.value?.map(row => row.note), ["Added in B"]);
});

test("clear removes only the sessions the player confirmed, keeping later ones from another tab", () => {
  const shown = [entry("a"), entry("b", "Second")];
  const latest = [...shown, entry("c", "Logged in another tab")];
  const result = applyLogChange(latest, { type: "clear", ids: shown.map(row => row.id) });
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.entries.map(row => row.id), ["c"]);
  assert.match(result.message, /Deleted 2 sessions\. Kept 1 session logged in another tab/);

  const all = applyLogChange(shown, { type: "clear", ids: ["a", "b"] });
  assert.ok(all.ok);
  if (all.ok) assert.equal(all.message, "Deleted 2 sessions. This browser's log is empty.");
});

test("emptying the log removes the key instead of writing an empty payload", () => {
  const disk = sharedDisk();
  const store = logStoreOn(disk);
  const one = commit(store, [], { type: "add", draft: draft("Only one"), today: TODAY });
  assert.ok(disk.bytes.has(LOG_STORAGE_KEY));
  commit(store, one, { type: "clear", ids: one.map(row => row.id) });
  assert.equal(disk.bytes.has(LOG_STORAGE_KEY), false);
});

test("submitting the same manual session twice is refused, as an import would skip it", () => {
  const first = apply([], { type: "add", draft: draft("Same line"), today: TODAY });
  const again = applyLogChange(first, { type: "add", draft: draft("  Same   line "), today: TODAY });
  assert.equal(again.ok, false);
  if (!again.ok) {
    assert.equal(again.error.code, "entry-duplicate");
    assert.equal(again.error.field, "note");
  }
  // A different number is a different sitting.
  assert.equal(applyLogChange(first, { type: "add", draft: draft("Same line", 82), today: TODAY }).ok, true);

  // Editing one session into an exact copy of another is refused too, but
  // saving an entry unchanged is not a duplicate of itself.
  const two = apply(first, { type: "add", draft: draft("Other line"), today: TODAY });
  const other = two.find(row => row.note === "Other line")!;
  const copy = applyLogChange(two, { type: "update", id: other.id, draft: draft("Same line"), today: TODAY });
  assert.equal(copy.ok, false);
  assert.equal(applyLogChange(two, { type: "update", id: other.id, draft: draft("Other line"), today: TODAY }).ok, true);
});

test("a refused change writes nothing, and unreadable storage falls back to memory", () => {
  const disk = sharedDisk();
  const store = logStoreOn(disk);
  const one = commit(store, [], { type: "add", draft: draft("Kept"), today: TODAY });
  const before = disk.getItem(LOG_STORAGE_KEY);
  let writes = 0;
  const counting = createStoredValue<LogEntry[]>({
    key: LOG_STORAGE_KEY, restore: restoreLogState, serialize: storedLogPayload,
    storage: () => ({ ...disk, setItem: (key: string, value: string) => { writes++; disk.setItem(key, value); } }),
  });
  commit(counting, one, { type: "add", draft: draft("Kept"), today: TODAY });
  assert.equal(writes, 0);
  assert.equal(disk.getItem(LOG_STORAGE_KEY), before);

  const blocked = createStoredValue<LogEntry[]>({
    key: LOG_STORAGE_KEY, restore: restoreLogState, serialize: storedLogPayload,
    storage: () => { throw new Error("SecurityError"); },
  });
  const inMemory = commit(blocked, one, { type: "add", draft: draft("Private window", 90), today: TODAY });
  assert.equal(inMemory.length, 2, "a private window keeps working from the in-memory log");
});
