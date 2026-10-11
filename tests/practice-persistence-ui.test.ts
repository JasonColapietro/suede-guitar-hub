import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as storage from "../lib/shared-storage.ts";
import { LOG_STORAGE_KEY, storedLogPayload, type LogEntry } from "../lib/log.ts";
import { READINESS_STORAGE_KEY, addSong } from "../lib/readiness.ts";
import { SESSION_STORAGE_KEY, buildSessionPlan } from "../lib/session.ts";
import { TEMPO_STORAGE_KEY, buildTempoLadder } from "../lib/tempo.ts";
import { BREAKTHROUGH_STORAGE_KEY, createBreakthroughPlan } from "../lib/breakthrough.ts";

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Element;
  return [node, ...elements(node.props.children)];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join("");
  if (value && typeof value === "object" && "props" in value) return text((value as Element).props.children);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

// Run the actual component handlers and effects against a shared store. This
// catches confirmation UI regressions that the pure mutation tests cannot see.
function harness(component: string, key: string, initial: unknown) {
  const bytes = new Map([[key, JSON.stringify(initial)]]);
  let writable = true;
  const disk = {
    getItem: (name: string) => bytes.get(name) ?? null,
    setItem: (name: string, value: string) => { if (!writable) throw new Error("QuotaExceededError"); bytes.set(name, value); },
    removeItem: (name: string) => { if (!writable) throw new Error("SecurityError"); bytes.delete(name); },
  };
  const target = new EventTarget();
  const focused: string[] = [];
  const values: unknown[] = [];
  const dependencies: (unknown[] | undefined)[] = [];
  let cursor = 0;
  let changed = false;
  let effects: (() => unknown)[] = [];
  const source = ts.transpileModule(readFileSync(new URL(`../components/${component}.tsx`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { default?: () => Element } = {};
  const require = createRequire(import.meta.url);
  runInNewContext(source, {
    exports,
    document: { getElementById: (id: string) => ({ focus() { focused.push(id); } }) },
    require: (name: string) => {
      if (name === "react") return {
        useState: (initial: unknown) => {
          const index = cursor++;
          if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
          return [values[index], (value: unknown) => {
            const next = typeof value === "function" ? value(values[index]) : value;
            if (!Object.is(next, values[index])) { values[index] = next; changed = true; }
          }];
        },
        useRef: (initial: unknown) => { const index = cursor++; return values[index] ??= { current: initial }; },
        useMemo: (compute: () => unknown) => compute(),
        useEffect: (effect: () => unknown, deps?: unknown[]) => {
          const index = cursor++;
          const before = dependencies[index];
          if (!before || !deps || deps.some((value, item) => !Object.is(value, before[item]))) effects.push(effect);
          dependencies[index] = deps;
        },
      };
      if (name === "@/lib/shared-storage") return {
        ...storage,
        createStoredValue: (options: storage.StoredValueOptions<unknown>) => storage.createStoredValue({ ...options, storage: () => disk }),
        subscribeToStoredKey: (name: string, callback: () => void) => storage.subscribeToStoredKey(name, callback, target as never),
      };
      if (name === "@/components/PracticeStorageNotice") return { default: "StorageNotice" };
      if (name === "next/link") return { default: "a" };
      if (name.startsWith("@/lib/")) return require(`../lib/${name.slice(6)}.ts`);
      return require(name);
    },
  });
  function render() {
    let tree!: Element;
    for (let count = 0; count < 20; count++) {
      cursor = 0; changed = false; effects = [];
      tree = exports.default!();
      for (const effect of effects) effect();
      if (!changed) return tree;
    }
    throw new Error("Component did not settle");
  }
  function button(pattern: RegExp) {
    const match = elements(render()).find(node => node.type === "button" && pattern.test(text(node.props.children)));
    assert.ok(match, `Missing button ${pattern} in ${text(render())}`);
    return match.props.onClick as () => void;
  }
  return {
    render, button, bytes, focused, writable: (next: boolean) => { writable = next; },
    replace: (value: unknown, notify = true) => {
      bytes.set(key, JSON.stringify(value));
      if (notify) {
        const event = new Event("storage");
        Object.defineProperty(event, "key", { value: key });
        target.dispatchEvent(event);
      }
    },
    saved: () => JSON.parse(bytes.get(key) ?? "null"),
  };
}

const entry = (id: string): LogEntry => ({ id, date: "2026-10-10", focus: "Chord changes", metric: "tempo", value: 80, note: id });

test("log clear confirmation keeps its original count and preserves a session synced afterward", () => {
  const original = entry("original"), later = entry("later");
  const h = harness("PracticeLog", LOG_STORAGE_KEY, storedLogPayload([original]));
  h.button(/Clear this browser.s log/)();
  h.replace(storedLogPayload([original, later]));
  h.button(/Delete 1 session for good/)();
  assert.deepEqual(h.saved().entries, [later]);
  assert.match(text(h.render()), /Kept 1 session logged in another tab/);
});

test("readiness clear confirmation preserves a song synced afterward", () => {
  const one = addSong([], "Wonderwall");
  const both = addSong(one, "Blackbird");
  const h = harness("Readiness", READINESS_STORAGE_KEY, { songs: one });
  h.button(/Clear this browser.s songs/)();
  h.replace({ songs: both });
  h.button(/Delete 1 song for good/)();
  assert.equal(h.saved().songs.length, 1);
  assert.equal(h.saved().songs[0].name, "Blackbird");
});

test("session clear cannot delete new progress saved before the storage event arrives", () => {
  const input = { minutes: 20, focus: "tempo-ceiling" as const };
  const plan = buildSessionPlan(input); assert.ok(plan.ok);
  const state = { input, completedBlockIds: [] as string[] };
  const h = harness("SessionBuilder", SESSION_STORAGE_KEY, state);
  h.button(/Clear this browser.s session/)();
  const updated = { input, completedBlockIds: [plan.value.blocks[0].id] };
  h.replace(updated, false);
  h.button(/Delete the session for good/)();
  assert.deepEqual(h.saved(), updated);
  assert.match(text(h.render()), /updated work has been kept/);
  assert.equal(h.focused.at(-1), "session-plan");
});

test("tempo clear cannot delete new progress saved before the storage event arrives", () => {
  const input = { currentBpm: 80, targetBpm: 100, sessions: 10 };
  const plan = buildTempoLadder(input); assert.ok(plan.ok);
  const h = harness("TempoLadder", TEMPO_STORAGE_KEY, { input, completedRungIds: [] });
  h.button(/Clear this browser.s ladder/)();
  const updated = { input, completedRungIds: [plan.value.rungs[0].id] };
  h.replace(updated, false);
  h.button(/Delete the ladder for good/)();
  assert.deepEqual(h.saved(), updated);
  h.render();
  assert.equal(h.focused.at(-1), "tempo-result");
});

test("breakthrough clear cannot delete new progress saved before the storage event arrives", () => {
  const profile = { goal: "complete-song" as const, experience: "advanced-beginner" as const, daysPerWeek: 4, minutesPerSession: 30 };
  const plan = createBreakthroughPlan(profile);
  const h = harness("BreakthroughPlanner", BREAKTHROUGH_STORAGE_KEY, { profile, completedActionIds: [] });
  h.button(/Clear this browser.s plan/)();
  const updated = { profile, completedActionIds: [plan.weeks[0].actions[0].id] };
  h.replace(updated, false);
  h.button(/Delete the plan for good/)();
  assert.deepEqual(h.saved(), updated);
  h.render();
  assert.equal(h.focused.at(-1), "your-plan");
});

test("session keeps two checked blocks while saving is blocked and shows the unsaved notice", () => {
  const input = { minutes: 20, focus: "tempo-ceiling" as const };
  const h = harness("SessionBuilder", SESSION_STORAGE_KEY, { input, completedBlockIds: [] });
  h.writable(false);
  function check(index: number) {
    const checkbox = elements(h.render()).filter(node => node.type === "input" && node.props.type === "checkbox")[index];
    assert.ok(checkbox);
    (checkbox.props.onChange as (event: unknown) => void)({ target: { checked: true } });
  }
  check(0); check(1);
  const tree = elements(h.render());
  assert.equal(tree.filter(node => node.type === "input" && node.props.type === "checkbox" && node.props.checked).length, 2);
  assert.equal(tree.find(node => node.type === "StorageNotice")?.props.unavailable, true);
  assert.deepEqual(h.saved().completedBlockIds, []);
  h.writable(true); check(2);
  assert.equal(h.saved().completedBlockIds.length, 3);
  assert.equal(elements(h.render()).find(node => node.type === "StorageNotice")?.props.unavailable, false);
});
