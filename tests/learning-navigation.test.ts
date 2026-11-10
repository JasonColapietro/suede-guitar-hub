import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as placement from "../lib/placement.ts";
import * as freeModule from "../lib/learning/free-module.ts";
import * as freeModuleStore from "../lib/learning/free-module-store.ts";
import * as freeModuleAccess from "../lib/learning/access.ts";

type Element = { type: string; props: Record<string, unknown> & { children?: unknown } };

function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Element;
  return [node, ...elements(node.props.children)];
}

// Exercise the actual component handlers with isolated hooks and DOM targets.
// Browser visual QA covers layout; these tests cover focus and same-hash clicks.
function componentHarness(file: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const state: unknown[] = [];
  const refs: { current: unknown }[] = [];
  const effects: (() => unknown)[] = [];
  let cursor = 0;
  let refCursor = 0;
  const require = createRequire(import.meta.url);
  const exports: Record<string, (props?: unknown) => Element> = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, {
    exports,
    ...globals,
    require: (name: string) => name === "react" ? {
      useId: () => "test",
      useState: (initial: unknown) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value: unknown) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
      },
      useRef: (initial: unknown) => refs[refCursor++] ?? (refs[refCursor - 1] = { current: initial }),
      useEffect: (effect: () => unknown) => { effects.push(effect); },
      useMemo: (factory: () => unknown) => factory(),
      useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
      createContext: (initial: unknown) => ({ Provider: "context-provider", initial }),
      useContext: (context: { initial: unknown }) => context.initial,
    } : name === "next/link" ? { default: "a" } : name.endsWith(".module.css") ? { default: {} } : dependencies[name] ?? require(name),
  });
  return {
    effects,
    render(name = "default", props?: unknown) {
      cursor = 0; refCursor = 0;
      return elements(exports[name](props));
    },
  };
}

test("answering placement again clears every answer and returns focus to the first question", () => {
  const h = componentHarness("../components/LevelCheck.tsx", {
    "@/lib/placement": placement,
    "@/lib/site": { APP_STORE: {}, LIFETIME: {} },
    "@/lib/analytics/tracker": { track() {} },
    "@/lib/learning/free-module": { FREE_MODULES: { beginner: "g-l2-m1", intermediate: "g-l4-m1", advanced: "g-l5-m4" } },
    "@/lib/learning/free-module-store": { browserStorage: () => null, chooseFreeModule: () => ({ moduleId: "g-l2-m1", placement: "beginner" }), adoptServerFreeModule() {}, putAccountFreeModule: async () => null },
  });
  const props = { moduleNames: {} };
  let focused = 0;
  let tree = h.render("default", props);
  const first = tree.find(node => node.type === "input")!;
  if (first.props.ref) (first.props.ref as { current: unknown }).current = { focus: () => { focused++; } };
  for (const question of placement.PLACEMENT_QUESTIONS) {
    const input = tree.find(node => node.type === "input" && node.props.name === `test-${question.id}` && node.props.value === 0)!;
    (input.props.onChange as () => void)();
    tree = h.render("default", props);
  }
  assert.ok(tree.some(node => node.type === "h2"), "all five answers show a result");
  const reset = tree.find(node => node.type === "button" && node.props.children === "Answer again")!;
  (reset.props.onClick as () => void)();
  tree = h.render("default", props);
  assert.equal(tree.filter(node => node.type === "input" && node.props.checked).length, 0);
  assert.ok(!tree.some(node => node.type === "h2"), "reset removes the previous result");
  assert.equal(focused, 1, "focus must leave the removed result button and return to question 1");
});

test("a placement result fixes the free module and its primary button opens that module's first lesson", () => {
  const sent: unknown[] = [];
  const store = { browserStorage: () => null, chooseFreeModule: freeModuleStore.chooseFreeModule, adoptServerFreeModule: freeModuleStore.adoptServerFreeModule, putAccountFreeModule: async () => null };
  const h = componentHarness("../components/LevelCheck.tsx", {
    "@/lib/placement": placement,
    "@/lib/site": { APP_STORE: {}, LIFETIME: {} },
    "@/lib/analytics/tracker": { track: (event: unknown) => { sent.push(event); } },
    "@/lib/learning/free-module": freeModule,
    "@/lib/learning/free-module-store": store,
  });
  const props = { moduleNames: { "g-l4-m1": "Box One" } };
  let tree = h.render("default", props);
  // Intermediate: reliable chords and changes that keep time.
  for (const [id, score] of [["chords", 2], ["changes", 2], ["barre", 0], ["lead", 0], ["song", 1]] as const) {
    (tree.find(node => node.type === "input" && node.props.name === `test-${id}` && node.props.value === score)!.props.onChange as () => void)();
    tree = h.render("default", props);
  }
  // Storage is blocked here: the result still names the module for this visit.
  for (const effect of h.effects.splice(0)) effect();
  tree = h.render("default", props);
  const start = tree.find(node => node.type === "a" && node.props.href === placement.freeModuleStartHref("g-l4-m1"));
  assert.ok(start, "the primary button opens the free module's first lesson");
  assert.match(JSON.stringify(start.props.children), /Start your free module.*Box One/);
  assert.equal(JSON.stringify(sent), JSON.stringify([{ name: "placement_completed", placement: "intermediate" }]));
});

test("stage jump reopens the current hash and focuses its summary without intercepting modified clicks", () => {
  let scrolls = 0;
  let focused = 0;
  let prevented = 0;
  const location = { hash: "#stage-3" };
  const history: string[] = [];
  class Details {
    open = false;
    scrollIntoView() { scrolls++; }
    querySelector() { return { focus: () => { focused++; } }; }
  }
  const target = new Details();
  const h = componentHarness("../components/learning/LearningPath.tsx", {
    "@/lib/learning/catalog": {},
    "@/lib/learning/track": { trackNames: { guitar: "Guitar" } },
    "@/lib/learning/progress": { completedCount: () => 0, nextLessonId: () => undefined },
    "./useLearningProgress": { useLearningProgress: () => ({ progress: { lessons: {} } }) },
    "./LessonLibrary": { LessonLibrary: "library" },
    "@/lib/learning/access": { accessibleLessonIds: () => [], hasVerifiedTrackAccess: () => false },
    "./LearningAccessProvider": { useLearningAccess: () => ({ status: "guest" }) },
    "@/components/interactive/PracticeStats": {},
    "@/lib/learning/rewards": {},
  }, {
    HTMLDetailsElement: Details,
    document: { getElementById: (id: string) => id === "stage-3" ? target : null },
    window: {
      location,
      history: { pushState: (_state: unknown, _title: string, hash: string) => { history.push(hash); location.hash = hash; } },
      addEventListener() {}, removeEventListener() {},
    },
  });
  const tree = h.render("LearningPath", {
    outline: { track: "guitar", stageCount: 1, levels: [{ id: "third", stage: 3, name: "Open chords", modules: [], extras: [] }] },
    singCourseHref: "https://sing.suedeai.ai",
  });
  h.effects[0]();
  assert.equal(target.open, true, "loading a stage deep link opens its panel");
  target.open = false;
  const link = tree.find(node => node.type === "a" && node.props.href === "#stage-3")!;
  assert.equal(typeof link.props.onClick, "function", "same-hash clicks need a handler because they emit no hashchange");
  const click = link.props.onClick as (event: Record<string, unknown>) => void;
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    click({ button: 0, preventDefault: () => { prevented++; }, ...modifiers });
    assert.equal(target.open, false, "modified clicks leave this page alone");
  }
  assert.equal(prevented, 0, "modified clicks keep native browser behavior");
  assert.deepEqual(history, []);
  const previousScrolls = scrolls;
  const previousFocus = focused;
  click({ button: 0, preventDefault: () => { prevented++; } });
  assert.equal(prevented, 1, "the native fragment action must not override summary focus");
  assert.deepEqual(history, [], "reopening the current stage does not add duplicate history");
  assert.equal(target.open, true, "a collapsed current stage opens again");
  assert.equal(scrolls, previousScrolls + 1);
  assert.equal(focused, previousFocus + 1, "keyboard navigation continues at the chosen stage");
  target.open = false;
  location.hash = "#stage-1";
  click({ button: 0, preventDefault: () => { prevented++; } });
  assert.equal(prevented, 2);
  assert.deepEqual(history, ["#stage-3"], "changing stages creates one Back-navigable URL entry");
  assert.equal(location.hash, "#stage-3");
  assert.equal(target.open, true);
  assert.equal(focused, previousFocus + 2);
});

test("a signed-in account's free module replaces the one this placement would pick, and the result says so", async () => {
  const storage = new Map<string, string>();
  const local = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } };
  const puts: unknown[] = [];
  const fetchStub = async (_url: string, init: { body: string }) => { puts.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ freeModuleId: "g-l4-m1" }) }; };
  const h = componentHarness("../components/LevelCheck.tsx", {
    "@/lib/placement": placement,
    "@/lib/site": { APP_STORE: {}, LIFETIME: {} },
    "@/lib/analytics/tracker": { track() {} },
    "@/lib/learning/free-module": freeModule,
    "@/lib/learning/free-module-store": { ...freeModuleStore, browserStorage: () => local },
  }, { fetch: fetchStub });
  const props = { moduleNames: { "g-l2-m1": "Open Chords", "g-l4-m1": "Box One" } };
  let tree = h.render("default", props);
  // Beginner answers: the placement would pick g-l2-m1.
  for (const [id, score] of [["chords", 0], ["changes", 0], ["barre", 0], ["lead", 0], ["song", 0]] as const) {
    (tree.find(node => node.type === "input" && node.props.name === `test-${id}` && node.props.value === score)!.props.onChange as () => void)();
    tree = h.render("default", props);
  }
  for (const effect of h.effects.splice(0)) effect();
  assert.equal(storage.size, 1, "the placement's module is stored first, as on a new device");
  await new Promise(resolve => setTimeout(resolve, 0));
  tree = h.render("default", props);
  assert.deepEqual(puts, [{ moduleId: "g-l2-m1" }]);
  assert.ok(tree.some(node => node.type === "a" && node.props.href === placement.freeModuleStartHref("g-l4-m1")), "the button opens the account's module");
  assert.ok(!tree.some(node => node.type === "a" && node.props.href === placement.freeModuleStartHref("g-l2-m1")));
  assert.ok(tree.some(node => node.type === "p" && Array.isArray(node.props.children) && node.props.children.join("") === "Your account already has its free module, Box One. Start there."));
  assert.equal(freeModuleStore.readFreeModuleChoice(local)?.moduleId, "g-l4-m1", "the account's choice is now the local one");
});

const providerDependencies = (storage: unknown, router: { refresh(): void }) => ({
  "next/navigation": { useRouter: () => router },
  "@/lib/learning/access": freeModuleAccess,
  "@/lib/learning/free-module": freeModule,
  "@/lib/learning/free-module-store": { ...freeModuleStore, browserStorage: () => storage },
  "@/lib/learning-sync/client": { AccountSyncClient: class {}, accountSyncEligible: () => false },
  "@/lib/learning-sync/evidence": { syncLessonMap: {} },
});

test("the provider's free module is the account's, else this visit's, even when storage is blocked", () => {
  freeModuleStore.forgetFreeModuleVisit();
  const blocked = { getItem(): string | null { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); } };
  const h = componentHarness("../components/learning/LearningAccessProvider.tsx", providerDependencies(blocked, { refresh() {} }), { window: { addEventListener() {}, removeEventListener() {} } });
  const valueFor = (freeModuleId: string | null) => (h.render("LearningAccessProvider", { access: { ...freeModuleAccess.guestLearningAccess, freeModuleId }, children: null }).find(node => node.type === "context-provider" && "tracks" in (node.props.value as object))!.props.value as { freeModuleId: string | null });
  assert.equal(valueFor(null).freeModuleId, null, "nothing chosen yet");
  freeModuleStore.chooseFreeModule(blocked, "intermediate");
  assert.equal(valueFor(null).freeModuleId, "g-l4-m1", "the in-memory choice opens the module for this visit");
  assert.equal(valueFor("g-l5-m4").freeModuleId, "g-l5-m4", "the account's choice wins over the local one");
  freeModuleStore.forgetFreeModuleVisit();
});

test("FreeModuleAccountSync wires the server's choice, the PUT and the page refresh", async () => {
  freeModuleStore.forgetFreeModuleVisit();
  const run = async (serverModuleId: string | null, localModuleId: string | null, response: { ok: boolean; body?: unknown } | "throws") => {
    const bytes = new Map<string, string>();
    const storage = { getItem: (key: string) => bytes.get(key) ?? null, setItem: (key: string, value: string) => { bytes.set(key, value); } };
    if (localModuleId) freeModuleStore.chooseFreeModule(storage, (Object.keys(freeModule.FREE_MODULES) as freeModule.Placement[]).find(key => freeModule.FREE_MODULES[key] === localModuleId)!);
    const calls: string[] = [];
    const fetchStub = async (url: string, init: { method: string; body: string }) => { calls.push(`${init.method} ${url} ${init.body}`); if (response === "throws") throw new Error("offline"); return { ok: response.ok, json: async () => response.body }; };
    const h = componentHarness("../components/learning/LearningAccessProvider.tsx", providerDependencies(storage, { refresh: () => { calls.push("refresh"); } }), { fetch: fetchStub });
    h.render("FreeModuleAccountSync", { serverModuleId });
    for (const effect of h.effects.splice(0)) effect();
    await new Promise(resolve => setTimeout(resolve, 0));
    return { calls, local: freeModuleStore.readFreeModuleChoice(storage)?.moduleId ?? null };
  };
  assert.deepEqual(await run("g-l4-m1", "g-l2-m1", { ok: true }), { calls: [], local: "g-l4-m1" }, "the server's choice replaces the local one without a request");
  assert.deepEqual(await run(null, "g-l2-m1", { ok: true, body: { freeModuleId: "g-l2-m1" } }), { calls: ['PUT /api/learning/free-module {"moduleId":"g-l2-m1"}', "refresh"], local: "g-l2-m1" });
  assert.deepEqual(await run(null, "g-l2-m1", { ok: true, body: { freeModuleId: "g-l4-m1" } }), { calls: ['PUT /api/learning/free-module {"moduleId":"g-l2-m1"}', "refresh"], local: "g-l4-m1" }, "the stored module the server returns is adopted");
  assert.deepEqual(await run(null, null, { ok: true }), { calls: [], local: null }, "no local choice, nothing to store");
  assert.deepEqual(await run(null, "g-l2-m1", { ok: false }), { calls: ['PUT /api/learning/free-module {"moduleId":"g-l2-m1"}'], local: "g-l2-m1" }, "a non-ok response changes nothing and keeps the module open");
  assert.deepEqual(await run(null, "g-l2-m1", "throws"), { calls: ['PUT /api/learning/free-module {"moduleId":"g-l2-m1"}'], local: "g-l2-m1" });
  freeModuleStore.forgetFreeModuleVisit();
});
