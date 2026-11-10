import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FREE_MODULES, FREE_MODULE_STORAGE_KEY, freeModuleLessonIds } from "../lib/learning/free-module.ts";
import { adoptServerFreeModule, chooseFreeModule, claimFreeModuleMilestone, currentFreeModuleChoice, readFreeModuleChoice } from "../lib/learning/free-module-store.ts";
import { guestLearningAccess, type LearningAccess } from "../lib/learning/access.ts";
import { PLACEMENT_RESULTS } from "../lib/placement.ts";
import { lessonHref } from "../lib/learning/track.ts";

register("./component-render-hooks.mjs", import.meta.url);
const FreeModuleLesson = (await import("../components/learning/FreeModuleLesson.tsx")).FreeModuleLesson as (props: { moduleId: string; locked: React.ReactNode; children?: React.ReactNode }) => React.ReactNode;
const { FreeModuleEnd } = await import("../components/learning/FreeModuleEnd.tsx");
const { LearningAccessProvider } = await import("../components/learning/LearningAccessProvider.tsx");
const Provider = LearningAccessProvider as (props: { access: LearningAccess; children?: React.ReactNode }) => React.ReactNode;

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
