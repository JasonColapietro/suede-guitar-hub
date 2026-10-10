import assert from "node:assert/strict";
import test from "node:test";

import {
  SESSION_STORAGE_KEY,
  buildSessionPlan,
  rebuildSessionState,
  restoreSessionState,
  setSessionBlockDone,
  type SessionInput,
  type SessionPlan,
  type StoredSessionState,
} from "../lib/session.ts";
import { createStoredValue } from "../lib/shared-storage.ts";

function planFor(input: SessionInput): SessionPlan {
  const result = buildSessionPlan(input);
  if (!result.ok) assert.fail(result.error.message);
  return result.value;
}

const input: SessionInput = { minutes: 45, focus: "tempo-ceiling" };

test("rebuilding with the same length and focus keeps every checked block", () => {
  const plan = planFor(input);
  const checked = plan.blocks.slice(0, 2).map(block => block.id);
  const { state, dropped } = rebuildSessionState({ input, completedBlockIds: checked }, planFor(input));
  assert.deepEqual(state.completedBlockIds, checked);
  assert.deepEqual(dropped, []);
});

test("rebuilding to a new length reports the blocks whose ticks would be cleared", () => {
  const before = planFor(input);
  const after = planFor({ ...input, minutes: 30 });
  const checked = before.blocks.map(block => block.id);
  const { state, dropped } = rebuildSessionState({ input, completedBlockIds: checked }, after);
  const afterIds = new Set(after.blocks.map(block => block.id));
  assert.ok(state.completedBlockIds.every(id => afterIds.has(id)));
  assert.equal(state.completedBlockIds.length + dropped.length, checked.length);
  assert.ok(dropped.length > 0);
  assert.deepEqual(state.input, { minutes: 30, focus: "tempo-ceiling" });
});

test("checking a block applies to the latest stored plan and never onto a replaced one", () => {
  const plan = planFor(input);
  const [first, second] = plan.blocks;
  const latest: StoredSessionState = { input, completedBlockIds: [second.id] };
  const both = setSessionBlockDone(latest, plan, first.id, true);
  assert.deepEqual(new Set(both?.completedBlockIds), new Set([first.id, second.id]));
  assert.deepEqual(setSessionBlockDone(both, plan, second.id, false)?.completedBlockIds, [first.id]);

  const replaced: StoredSessionState = { input: { minutes: 30, focus: "upkeep" }, completedBlockIds: [] };
  assert.equal(setSessionBlockDone(replaced, plan, first.id, true), replaced);
  assert.equal(setSessionBlockDone(null, plan, first.id, true), null);
});

test("two tabs checking different blocks keep both through shared storage", () => {
  const bytes = new Map<string, string>();
  const shared = {
    getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => void bytes.set(key, value),
    removeItem: (key: string) => void bytes.delete(key),
  };
  const tabA = createStoredValue({ key: SESSION_STORAGE_KEY, restore: restoreSessionState, storage: () => shared });
  const tabB = createStoredValue({ key: SESSION_STORAGE_KEY, restore: restoreSessionState, storage: () => shared });
  const plan = planFor(input);
  const loaded: StoredSessionState = { input, completedBlockIds: [] };
  tabA.write(loaded);
  tabA.update(loaded, latest => setSessionBlockDone(latest, plan, plan.blocks[0].id, true));
  tabB.update(loaded, latest => setSessionBlockDone(latest, plan, plan.blocks[1].id, true));
  const stored = tabB.read();
  assert.ok(stored.available);
  assert.deepEqual(new Set(stored.value?.completedBlockIds), new Set([plan.blocks[0].id, plan.blocks[1].id]));
});
