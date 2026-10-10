import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
register("./component-render-hooks.mjs", import.meta.url);
const { TabPlayer } = await import("../components/interactive/TabPlayer.tsx");

test("rhythm player exposes native pressed mode buttons and starts without audio", () => {
  const markup = renderToStaticMarkup(createElement(TabPlayer, {
    timeline: { mode: "rhythm", bpm: 80, targets: [{ id: "one", beat: 0, cue: "Down" }] },
  }));
  assert.match(markup, /role="group" aria-label="Player mode"/);
  assert.match(markup, /aria-pressed="true"[^>]*>Listen/);
  assert.match(markup, /aria-pressed="false"[^>]*>Tap along/);
  assert.doesNotMatch(markup, /role="tab(?:list)?"|aria-selected=/);
  assert.match(markup, /Play it for me/);
  assert.doesNotMatch(markup, /Cancel audio start|>Stop</);
});

test("tab player presets are labelled by purpose and open on the 100% rung", () => {
  const markup = renderToStaticMarkup(createElement(TabPlayer, {
    timeline: { mode: "pitchSequence", bpm: 96, targets: [{ id: "one", beat: 0, midi: 57, guitarString: 5, fret: 12 }] },
    presets: [{ label: "Learn", bpm: 72 }, { label: "Build", bpm: 79 }, { label: "Push", bpm: 87 }, { label: "Goal", bpm: 96 }, { label: "Stretch", bpm: 106 }],
  }));
  for (const label of ["Learn · 72 BPM (75%)", "Build · 79 BPM (82%)", "Push · 87 BPM (91%)", "Goal · 96 BPM (100%)", "Stretch · 106 BPM (110%)"]) {
    assert.ok(markup.includes(label), label);
  }
  assert.match(markup, /<option value="100" selected="">Goal · 96 BPM \(100%\)<\/option>/);
  assert.doesNotMatch(markup, /50% · 48 BPM/);
});
