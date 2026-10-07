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
