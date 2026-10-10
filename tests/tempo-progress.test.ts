import assert from "node:assert/strict";
import test from "node:test";

import {
  TEMPO_STORAGE_KEY,
  buildTempoLadder,
  rebuildTempoState,
  restoreTempoState,
  setTempoRungDone,
  tempoErrorField,
  tempoLadderInput,
  type StoredTempoState,
  type TempoInput,
  type TempoLadder,
} from "../lib/tempo.ts";
import { createStoredValue } from "../lib/shared-storage.ts";

function ladderFor(input: TempoInput): TempoLadder {
  const result = buildTempoLadder(input);
  if (!result.ok) assert.fail(result.error.message);
  return result.value;
}

function disk() {
  const bytes = new Map<string, string>();
  return {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => void bytes.set(key, value),
    removeItem: (key: string) => void bytes.delete(key),
  };
}

const input: TempoInput = { currentBpm: 80, targetBpm: 120, sessions: 12 };

test("rebuilding with unchanged numbers keeps every checked session", () => {
  const ladder = ladderFor(input);
  const checked = ladder.rungs.slice(0, 4).map(rung => rung.id);
  const { state, dropped } = rebuildTempoState({ input, completedRungIds: checked }, ladderFor(input));
  assert.deepEqual(state.completedRungIds, checked);
  assert.deepEqual(dropped, []);
  assert.deepEqual(state.input, input);
});

test("rebuilding to new numbers keeps rungs that still exist and reports only the rest", () => {
  const before = ladderFor(input);
  const after = ladderFor({ ...input, targetBpm: 116 });
  const checked = before.rungs.map(rung => rung.id);
  const { state, dropped } = rebuildTempoState({ input, completedRungIds: checked }, after);
  const afterIds = new Set(after.rungs.map(rung => rung.id));
  assert.ok(state.completedRungIds.every(id => afterIds.has(id)));
  assert.ok(state.completedRungIds.includes(before.rungs[0].id), "the unchanged baseline keeps its tick");
  assert.ok(dropped.length > 0);
  assert.equal(state.completedRungIds.length + dropped.length, checked.length);
});

test("a first build has nothing to drop", () => {
  const { state, dropped } = rebuildTempoState(null, ladderFor(input));
  assert.deepEqual(state.completedRungIds, []);
  assert.deepEqual(dropped, []);
});

test("checking a rung applies to the latest stored ladder and never onto a different one", () => {
  const ladder = ladderFor(input);
  const [first, second] = ladder.rungs;
  const latest: StoredTempoState = { input, completedRungIds: [second.id] };

  // Another tab already checked `second`; this tab checks `first`. Both stay.
  const both = setTempoRungDone(latest, ladder, first.id, true);
  assert.deepEqual(new Set(both?.completedRungIds), new Set([first.id, second.id]));

  // Stating the end state means a stale "toggle" cannot uncheck what is checked.
  assert.deepEqual(setTempoRungDone(both, ladder, first.id, true)?.completedRungIds, both?.completedRungIds);
  assert.deepEqual(setTempoRungDone(both, ladder, first.id, false)?.completedRungIds, [second.id]);

  // The stored ladder was rebuilt elsewhere: the tick is not written onto it.
  const rebuilt: StoredTempoState = { input: { ...input, targetBpm: 116 }, completedRungIds: [] };
  assert.equal(setTempoRungDone(rebuilt, ladder, first.id, true), rebuilt);
  assert.equal(setTempoRungDone(null, ladder, first.id, true), null);
});

test("two tabs checking different rungs keep both through shared storage", () => {
  const shared = disk();
  const tabA = createStoredValue({ key: TEMPO_STORAGE_KEY, restore: restoreTempoState, storage: () => shared });
  const tabB = createStoredValue({ key: TEMPO_STORAGE_KEY, restore: restoreTempoState, storage: () => shared });
  const ladder = ladderFor(input);
  tabA.write({ input: tempoLadderInput(ladder), completedRungIds: [] });
  const loaded: StoredTempoState = { input, completedRungIds: [] };

  tabA.update(loaded, latest => setTempoRungDone(latest, ladder, ladder.rungs[0].id, true));
  tabB.update(loaded, latest => setTempoRungDone(latest, ladder, ladder.rungs[1].id, true));

  const stored = tabA.read();
  assert.ok(stored.available);
  assert.deepEqual(
    new Set(stored.value?.completedRungIds),
    new Set([ladder.rungs[0].id, ladder.rungs[1].id]),
  );
});

test("every refusal names the field it is about", () => {
  assert.equal(tempoErrorField("current-out-of-range"), "current");
  assert.equal(tempoErrorField("current-not-a-number"), "current");
  assert.equal(tempoErrorField("target-not-above-current"), "target");
  assert.equal(tempoErrorField("gap-too-wide"), "target");
  assert.equal(tempoErrorField("sessions-too-few"), "sessions");
});
