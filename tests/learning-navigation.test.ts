import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as placement from "../lib/placement.ts";

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
  });
  let focused = 0;
  let tree = h.render();
  const first = tree.find(node => node.type === "input")!;
  if (first.props.ref) (first.props.ref as { current: unknown }).current = { focus: () => { focused++; } };
  for (const question of placement.PLACEMENT_QUESTIONS) {
    const input = tree.find(node => node.type === "input" && node.props.name === `test-${question.id}` && node.props.value === 0)!;
    (input.props.onChange as () => void)();
    tree = h.render();
  }
  assert.ok(tree.some(node => node.type === "h2"), "all five answers show a result");
  const reset = tree.find(node => node.type === "button" && node.props.children === "Answer again")!;
  (reset.props.onClick as () => void)();
  tree = h.render();
  assert.equal(tree.filter(node => node.type === "input" && node.props.checked).length, 0);
  assert.ok(!tree.some(node => node.type === "h2"), "reset removes the previous result");
  assert.equal(focused, 1, "focus must leave the removed result button and return to question 1");
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
