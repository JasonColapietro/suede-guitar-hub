import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import contract from "../contracts/practice-tools.json" with { type: "json" };
import { TOOLS } from "../lib/site.ts";
register("./component-render-hooks.mjs", import.meta.url);
const { Metronome } = await import("../components/practice/Metronome.tsx");
const { TuningGuide } = await import("../components/learning/TuningGuide.tsx");
const { default: PracticePage, metadata } = await import("../app/practice/page.tsx");
const { default: SiteNav } = await import("../components/SiteNav.tsx");

test("actual metronome markup exposes native range, steps, four beats and no automatic playback", () => {
  const markup = renderToStaticMarkup(createElement(Metronome));
  assert.match(markup, new RegExp(`min="${contract.metronome.minimumBPM}"`));
  assert.match(markup, new RegExp(`max="${contract.metronome.maximumBPM}"`));
  assert.match(markup, new RegExp(`step="${contract.metronome.sliderStepBPM}"`));
  assert.match(markup, new RegExp(`value="${contract.metronome.defaultBPM}"`));
  assert.match(markup, new RegExp(`Slower by ${contract.metronome.buttonStepBPM} beats per minute`));
  assert.equal((markup.match(/data-accent="(?:true|false)"/g) ?? []).length, contract.metronome.beatsPerBar);
  assert.match(markup, /Start metronome/); assert.match(markup, /No microphone is needed/);
  assert.doesNotMatch(markup, /data-active="true"/);
});
test("standalone tuner has all six standard targets and references without lesson checkboxes", () => {
  const markup = renderToStaticMarkup(createElement(TuningGuide));
  assert.match(markup, /Guitar tuner/);
  for (const target of contract.tuning.targets) assert.match(markup, new RegExp(`String ${target.string}: ${target.note}`));
  assert.match(markup, /Hear E2 reference/); assert.match(markup, /Start tuner/);
  assert.match(markup, /Use my own tuner/); assert.match(markup, /A4 = 440 Hz/);
  assert.doesNotMatch(markup, /Confirm tuning check|type="checkbox"/);
  const lesson = renderToStaticMarkup(createElement(TuningGuide, { onReadyChange: () => {} }));
  assert.match(lesson, /First, tune your guitar/); assert.match(lesson, /Confirm tuning check/);
  assert.equal((lesson.match(/type="checkbox"/g) ?? []).length, 7);
});
test("actual practice page is discoverable, accessible as a document, and honest about microphone and history", () => {
  const markup = renderToStaticMarkup(createElement(PracticePage));
  assert.match(markup, /id="practice-main"/); assert.match(markup, /Skip to practice tools/);
  assert.match(markup, /id="tuner"/); assert.match(markup, /id="metronome-title"/);
  assert.match(markup, /not uploaded or saved/); assert.match(markup, /do not record lesson completion/);
  assert.match(markup, /href="\/learn\/guitar\/routine"/);
  assert.equal(metadata.alternates?.canonical, "https://guitarhub.org/practice");
  assert.ok(TOOLS.some(tool => tool.href === "/practice"));
  assert.match(renderToStaticMarkup(createElement(SiteNav)), /href="\/practice"[^>]*>Practice/);
});
test("the standalone route overrides only microphone permission while general site pages retain denial", async () => {
  const { default: config } = await import("../next.config.ts");
  const rules = await config.headers!();
  const general = rules.find(rule => rule.source === "/:path*")!;
  const practice = rules.find(rule => rule.source === "/practice");
  assert.ok(practice); assert.ok(rules.indexOf(practice) > rules.indexOf(general));
  assert.equal(general.headers.find(header => header.key === "Permissions-Policy")?.value, "camera=(), geolocation=(), microphone=()");
  assert.equal(practice.headers.find(header => header.key === "Permissions-Policy")?.value, "camera=(), geolocation=(), microphone=(self)");
});
