import test from "node:test";
import assert from "node:assert/strict";
import { reduceLogState, type LogState } from "../lib/log-state.ts";
import { importLog, serializeLog, type LogEntry } from "../lib/log.ts";

function entry(id: string, note = "Clean changes"): LogEntry {
  return { id, date: "2026-10-07", focus: "Chord changes", metric: "tempo", value: 80, note };
}

test("a delayed file import preserves sessions added and edited during the read", async () => {
  const original = entry("held");
  let state: LogState = { entries: [original], importReceipt: null };
  let finishRead!: (text: string) => void;
  const pendingRead = new Promise<string>(resolve => { finishRead = resolve; });
  const importing = (async () => {
    const parsed = importLog(await pendingRead);
    assert.equal(parsed.ok, true);
    if (parsed.ok) state = reduceLogState(state, { type: "import", imported: parsed.value });
  })();
  const edited = entry("held", "Corrected after starting import");
  const added = entry("added", "New session while file loads");
  state = reduceLogState(state, { type: "replace", entries: [edited, added] });
  finishRead(serializeLog([entry("imported", "Imported session")], "2026-10-07"));
  await importing;
  assert.ok(state.entries.some(row => row.id === edited.id && row.note === edited.note));
  assert.ok(state.entries.some(row => row.id === added.id));
  assert.equal(state.entries.length, 3);
  assert.equal(state.importReceipt?.message, "Added 1 session.");
});

test("queued imports merge against one another and keep accurate duplicate counts", () => {
  let state: LogState = { entries: [], importReceipt: null };
  const imported = { entries: [entry("a")], truncated: 0 };
  state = reduceLogState(state, { type: "import", imported });
  state = reduceLogState(state, { type: "import", imported });
  assert.equal(state.entries.length, 1);
  assert.equal(state.importReceipt?.message, "Added 0 sessions, and skipped 1 already in this browser.");
  state = reduceLogState(state, { type: "replace", entries: [] });
  assert.equal(state.importReceipt, null);
});

test("clearing before an import completes does not resurrect unrelated old sessions", () => {
  let state: LogState = { entries: [entry("old")], importReceipt: null };
  state = reduceLogState(state, { type: "replace", entries: [] });
  state = reduceLogState(state, { type: "import", imported: { entries: [entry("new")], truncated: 2 } });
  assert.deepEqual(state.entries.map(row => row.id), ["new"]);
  assert.match(state.importReceipt!.message, /2 oldest were not read/);
});
