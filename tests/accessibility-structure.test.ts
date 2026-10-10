/**
 * Structural accessibility guards for the shared shell: one skip link, a
 * focusable main target on every page, the compact disclosure header, and the
 * ARIA fixes on the practice and drill pages. Server-render and source checks
 * only; the browser-level checks (axe, focus obscuring, overflow) are run
 * against a production build.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("./component-render-hooks.mjs", import.meta.url);
const { default: SiteNav } = await import("../components/SiteNav.tsx");
const { Metronome } = await import("../components/practice/Metronome.tsx");
const { TabPlayer } = await import("../components/interactive/TabPlayer.tsx");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const SOURCES = [...sourceFiles("app"), ...sourceFiles("components")].map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

test("the root layout renders exactly one skip link, first in the body, to #main-content", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const body = layout.slice(layout.indexOf("<body>"));
  assert.match(body, /^<body>\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)?<a href="#main-content" className="skip-link">/);
  const skipLinks = SOURCES.filter(({ text }) => /href="#[\w-]+"[^>]*>\s*Skip to/.test(text) || /className=\{[\w.]*skip\}/.test(text));
  assert.deepEqual(skipLinks.map(({ path }) => path), ["app/layout.tsx"]);
});

test("every <main> is the skip-link target and can take focus", () => {
  const mains = SOURCES.flatMap(({ path, text }) =>
    [...text.matchAll(/<main\b[^>]*>/g)].map((match) => ({ path, tag: match[0] })),
  );
  assert.ok(mains.length >= 10, "expected the page shells to render <main>");
  for (const { path, tag } of mains) {
    assert.match(tag, /id="main-content"/, `${path}: ${tag}`);
    assert.match(tag, /tabIndex=\{-1\}/, `${path}: ${tag}`);
  }
});

test("the header collapses its links behind a labelled disclosure in reading order", () => {
  const markup = renderToStaticMarkup(createElement(SiteNav));
  const button = markup.match(/<button[^>]*aria-expanded="false"[^>]*>/)?.[0];
  assert.ok(button, "the Menu button starts collapsed");
  const controls = button.match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controls);
  assert.match(markup, new RegExp(`<nav id="${controls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" aria-label="Primary"`));
  assert.match(markup, />Menu</);
  const order = ["GUITARHUB", "aria-expanded", 'aria-label="Primary"', "Find your level"].map((needle) =>
    markup.indexOf(needle),
  );
  assert.deepEqual([...order].sort((a, b) => a - b), order, "brand, Menu, links, then the action");
  for (const label of ["Lessons", "Advanced", "Practice", "Tools", "Guides"]) {
    assert.match(markup, new RegExp(`class="[^"]*min-h-11[^"]*"[^>]*>${label}</a>`));
  }
});

test("the metronome beat lights are hidden from assistive technology", () => {
  const markup = renderToStaticMarkup(createElement(Metronome));
  assert.doesNotMatch(markup, /Metronome stopped|aria-label="Beat /);
  assert.match(markup, /<div class="beats" aria-hidden="true">/);
  assert.match(markup, /role="status"/);
});

test("the tab player heading level follows its page", () => {
  const timeline = { mode: "rhythm" as const, bpm: 80, targets: [{ id: "one", beat: 0, cue: "Down" }] };
  assert.match(renderToStaticMarkup(createElement(TabPlayer, { timeline, title: "Hear it" })), /<h3>Hear it<\/h3>/);
  assert.match(
    renderToStaticMarkup(createElement(TabPlayer, { timeline, title: "Hear it", headingLevel: 2 })),
    /<h2>Hear it<\/h2>/,
  );
  assert.match(readFileSync("components/advanced/DrillSession.tsx", "utf8"), /headingLevel=\{2\}/);
});

test("the drill speed slider speaks tempo and percentage", () => {
  const coach = readFileSync("components/practice/PracticeCoach.tsx", "utf8");
  assert.match(coach, /aria-label="Practice speed" aria-valuetext=\{`\$\{Math\.round\(spec\.bpm \* speed \/ 100\)\} BPM, \$\{speed\} percent`\}/);
});

test("no shared label renders under 12px", () => {
  const offenders = SOURCES.filter(({ text }) => /text-\[(?:10|11)(?:\.\d+)?px\]/.test(text)).map(({ path }) => path);
  assert.deepEqual(offenders, []);
});
