import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FREE_MODULES, FREE_MODULE_STORAGE_KEY, freeModuleLessonIds } from "../lib/learning/free-module.ts";
import { adoptServerFreeModule, chooseFreeModule, claimFreeModuleMilestone, currentFreeModuleChoice, forgetFreeModuleVisit, freeModuleSyncApplies, putAccountFreeModule, readFreeModuleChoice, resolveFreeModuleId, syncFreeModuleWithAccount } from "../lib/learning/free-module-store.ts";
import { guestLearningAccess, type LearningAccess } from "../lib/learning/access.ts";
import { PLACEMENT_RESULTS } from "../lib/placement.ts";
import { lessonHref } from "../lib/learning/track.ts";

register("./component-render-hooks.mjs", import.meta.url);
const FreeModuleLesson = (await import("../components/learning/FreeModuleLesson.tsx")).FreeModuleLesson as (props: { moduleId: string; locked: React.ReactNode; children?: React.ReactNode }) => React.ReactNode;
const { FreeModuleEnd } = await import("../components/learning/FreeModuleEnd.tsx");
const { LearningAccessProvider } = await import("../components/learning/LearningAccessProvider.tsx");
const Provider = LearningAccessProvider as (props: { access: LearningAccess; children?: React.ReactNode }) => React.ReactNode;

test.beforeEach(() => forgetFreeModuleVisit());

function memoryStorage() {
  const bytes = new Map<string, string>();
  return { bytes, getItem: (key: string) => bytes.get(key) ?? null, setItem: (key: string, value: string) => { bytes.set(key, value); } };
}
function throwingStorage() {
  return { getItem(): string | null { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); } };
}

test("the first placement fixes the free module; a later placement does not change it", () => {
  const storage = memoryStorage();
  assert.deepEqual(chooseFreeModule(storage, "beginner"), { moduleId: "g-l2-m1", placement: "beginner" });
  assert.deepEqual(chooseFreeModule(storage, "advanced"), { moduleId: "g-l2-m1", placement: "beginner" });
  assert.deepEqual(readFreeModuleChoice(storage), { moduleId: "g-l2-m1", placement: "beginner" });
});

test("with storage blocked the placement still names a module for this visit", () => {
  assert.equal(chooseFreeModule(null, "intermediate").moduleId, "g-l4-m1");
  assert.equal(chooseFreeModule(throwingStorage(), "intermediate").moduleId, "g-l4-m1");
  assert.equal(readFreeModuleChoice(throwingStorage()), null);
  // The visit keeps the choice in memory, so the lesson the result links to opens.
  assert.equal(currentFreeModuleChoice(throwingStorage())?.moduleId, "g-l4-m1");
});

test("the server's choice replaces a different local one", () => {
  const storage = memoryStorage(); chooseFreeModule(storage, "beginner");
  adoptServerFreeModule(storage, "g-l4-m1");
  assert.equal(readFreeModuleChoice(storage)?.moduleId, "g-l4-m1");
  assert.deepEqual(readFreeModuleChoice(storage), { moduleId: "g-l4-m1", placement: "intermediate" });
  adoptServerFreeModule(storage, "g-l1-m1"); // not a free module
  assert.equal(readFreeModuleChoice(storage)?.moduleId, "g-l4-m1");
  // Blocked storage: the server's choice still wins for the visit.
  adoptServerFreeModule(null, "g-l5-m4");
  assert.equal(currentFreeModuleChoice(null)?.moduleId, "g-l5-m4");
});

test("a stored module paired with a placement that does not own it is no choice", () => {
  const storage = memoryStorage();
  storage.setItem(FREE_MODULE_STORAGE_KEY, JSON.stringify({ moduleId: "g-l5-m4", placement: "beginner" }));
  assert.equal(readFreeModuleChoice(storage), null);
  assert.deepEqual(chooseFreeModule(storage, "beginner"), { moduleId: "g-l2-m1", placement: "beginner" });
});

test("each free-module milestone is claimed once per browser", () => {
  const storage = memoryStorage();
  assert.equal(claimFreeModuleMilestone(storage, "g-l2-m1", "started"), true);
  assert.equal(claimFreeModuleMilestone(storage, "g-l2-m1", "started"), false);
  assert.equal(claimFreeModuleMilestone(storage, "g-l2-m1", "completed"), true);
  // A flag stored by an earlier page session in this browser counts.
  const earlier = memoryStorage(); earlier.setItem(`${FREE_MODULE_STORAGE_KEY}.completed.g-l4-m1`, "1");
  assert.equal(claimFreeModuleMilestone(earlier, "g-l4-m1", "completed"), false);
  assert.equal(claimFreeModuleMilestone(throwingStorage(), "g-l5-m4", "started"), true);
  assert.equal(claimFreeModuleMilestone(throwingStorage(), "g-l5-m4", "started"), false, "once per visit without storage");
});

test("each placement result leads to the first lesson of its free module", () => {
  for (const placement of ["beginner", "intermediate", "advanced"] as const)
    assert.equal(PLACEMENT_RESULTS[placement].freeStep.href, lessonHref("guitar", freeModuleLessonIds(FREE_MODULES[placement])[0]));
});

test("the free-module lesson shows the lesson only to the visitor whose module it is", () => {
  const lesson = () => createElement(FreeModuleLesson, { moduleId: "g-l2-m1", locked: createElement("p", null, "LOCKED") }, createElement("p", null, "LESSON"));
  // The server render has no browser storage: a guest sees the gate until the client reads the choice.
  assert.equal(renderToStaticMarkup(createElement(Provider, { access: guestLearningAccess }, lesson())), "<p>LOCKED</p>");
  assert.equal(renderToStaticMarkup(createElement(Provider, { access: { ...guestLearningAccess, freeModuleId: "g-l2-m1" } }, lesson())), "<p>LESSON</p>");
  assert.equal(renderToStaticMarkup(createElement(Provider, { access: { ...guestLearningAccess, freeModuleId: "g-l4-m1" } }, lesson())), "<p>LOCKED</p>");
});

test("the module end shows nothing before the module is complete", () => {
  const end = createElement(FreeModuleEnd, { moduleId: "g-l2-m1", checkoutAvailable: true });
  assert.equal(renderToStaticMarkup(createElement(Provider, { access: { ...guestLearningAccess, freeModuleId: "g-l2-m1" } }, end)), "");
});

test("the account's free module wins over a local one; with neither there is none", () => {
  assert.equal(resolveFreeModuleId("g-l4-m1", "g-l2-m1"), "g-l4-m1");
  assert.equal(resolveFreeModuleId(null, "g-l2-m1"), "g-l2-m1");
  assert.equal(resolveFreeModuleId(null, null), null);
});

test("only signed-in, verified accounts without a guitar purchase are synced", () => {
  const verified: LearningAccess = { ...guestLearningAccess, enabled: true, status: "verified", accountId: "acct-1", tracks: [] };
  assert.equal(freeModuleSyncApplies(verified), true);
  assert.equal(freeModuleSyncApplies(guestLearningAccess), false, "guest");
  assert.equal(freeModuleSyncApplies({ ...verified, accountId: null }), false, "signed out");
  assert.equal(freeModuleSyncApplies({ ...verified, status: "unavailable" }), false);
  assert.equal(freeModuleSyncApplies({ ...verified, enabled: false }), false);
  assert.equal(freeModuleSyncApplies({ ...verified, tracks: ["guitar"] }), false, "purchaser");
});

test("putAccountFreeModule returns the module the account holds, or null", async () => {
  const reply = (ok: boolean, body: unknown) => async () => ({ ok, json: async () => body });
  assert.equal(await putAccountFreeModule(reply(true, { freeModuleId: "g-l4-m1" }), "g-l2-m1"), "g-l4-m1");
  assert.equal(await putAccountFreeModule(reply(false, { freeModuleId: "g-l4-m1" }), "g-l2-m1"), null, "non-ok");
  assert.equal(await putAccountFreeModule(reply(true, { other: 1 }), "g-l2-m1"), null);
  assert.equal(await putAccountFreeModule(reply(true, null), "g-l2-m1"), null);
  assert.equal(await putAccountFreeModule(async () => { throw new Error("offline"); }, "g-l2-m1"), null);
  const sent: unknown[] = [];
  await putAccountFreeModule(async (url, init) => { sent.push([url, init.method, init.body]); return { ok: true, json: async () => ({}) }; }, "g-l2-m1");
  assert.deepEqual(sent, [["/api/learning/free-module", "PUT", '{"moduleId":"g-l2-m1"}']]);
});

test("account sync: adopt, store and refresh, or leave alone", async () => {
  let refreshes = 0, requests = 0;
  const base = (storage: ReturnType<typeof memoryStorage> | null, serverModuleId: string | null, body: unknown, cancelled = () => false) => ({
    storage, serverModuleId, refresh: () => { refreshes++; }, cancelled,
    fetchFn: async () => { requests++; return { ok: body !== undefined, json: async () => body }; },
  });
  const storage = memoryStorage(); chooseFreeModule(storage, "beginner");
  assert.equal(await syncFreeModuleWithAccount(base(storage, "g-l4-m1", undefined)), "adopted");
  assert.deepEqual([readFreeModuleChoice(storage)?.moduleId, requests, refreshes], ["g-l4-m1", 0, 0]);
  const fresh = memoryStorage(); chooseFreeModule(fresh, "advanced");
  assert.equal(await syncFreeModuleWithAccount(base(fresh, null, { freeModuleId: "g-l4-m1" })), "stored");
  assert.deepEqual([readFreeModuleChoice(fresh)?.moduleId, requests, refreshes], ["g-l4-m1", 1, 1]);
  assert.equal(await syncFreeModuleWithAccount(base(memoryStorage(), null, { freeModuleId: "g-l4-m1" })), "unchanged", "no local choice");
  assert.equal(requests, 1);
  const refused = memoryStorage(); chooseFreeModule(refused, "beginner");
  assert.equal(await syncFreeModuleWithAccount(base(refused, null, undefined)), "unchanged", "non-ok response");
  assert.deepEqual([readFreeModuleChoice(refused)?.moduleId, refreshes], ["g-l2-m1", 1]);
  const gone = memoryStorage(); chooseFreeModule(gone, "beginner");
  assert.equal(await syncFreeModuleWithAccount(base(gone, null, { freeModuleId: "g-l4-m1" }, () => true)), "unchanged", "unmounted before the reply");
  assert.deepEqual([readFreeModuleChoice(gone)?.moduleId, refreshes], ["g-l2-m1", 1]);
  // Blocked storage: the visit's choice is still stored on the account.
  chooseFreeModule(null, "intermediate");
  assert.equal(await syncFreeModuleWithAccount(base(null, null, { freeModuleId: "g-l4-m1" })), "stored");
});
