import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { register } from "node:module";
import voice from "../lib/learning/data/voice.json" with { type: "json" };
import source from "../lib/learning/data/voice-learning-material.json" with { type: "json" };
import { startVocalReference } from "../lib/audio/vocal-reference.ts";
import { validateVocalMaterial, vocalMaterialForModule, vocalMaterialLibrary, vocalStudyTimeline, type VocalStudy } from "../lib/learning/vocal-material.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { VocalLibrary, VocalMaterial, VocalReadingContent } = await import("../components/learning/VocalMaterial.tsx");

test("the synchronized vocal library validates and resolves material for every voice module", () => {
  assert.doesNotThrow(() => validateVocalMaterial(source));
  assert.equal(source.studies.length, 70);
  assert.equal(source.readings.length, 26);
  const moduleIds = voice.levels.flatMap(level => level.modules.map(moduleMaterial => moduleMaterial.id));
  assert.equal(source.modules.length, moduleIds.length);
  for (const moduleId of moduleIds) {
    const material = vocalMaterialForModule(moduleId);
    assert.ok(material, moduleId);
    assert.ok(material.studies.length > 0 || material.readings.length > 0, moduleId);
  }
});

test("the lifetime library makes every bundled study and reading reachable", () => {
  const library = vocalMaterialLibrary();
  assert.equal(library.studies.length, 70);
  assert.equal(library.readings.length, 26);
  assert.deepEqual(new Set(library.studies.map(study => study.id)), new Set(source.studies.map(study => study.id)));
  assert.deepEqual(new Set(library.readings.map(reading => reading.id)), new Set(source.readings.map(reading => reading.id)));
  const mappedStudies = new Set(source.modules.flatMap(moduleMaterial => moduleMaterial.studyIDs));
  const mappedReadings = new Set(source.modules.flatMap(moduleMaterial => moduleMaterial.readingIDs));
  assert.equal(library.studies.filter(study => !mappedStudies.has(study.id)).length, 38);
  assert.equal(library.readings.filter(reading => !mappedReadings.has(reading.id)).length, 2);
  const markup = renderToStaticMarkup(createElement(VocalLibrary, { material: library }));
  assert.equal(markup.match(/<summary>/g)?.length, 96);
  assert.match(markup, /44 warmups/);
  assert.match(markup, /26 public-domain song and melody studies/);
  assert.match(markup, /26 included readings/);
});

test("a voice lesson renders its module studies, included reading, and optional local recorder", () => {
  const material = vocalMaterialForModule("v-l1-m1");
  assert.ok(material);
  const markup = renderToStaticMarkup(createElement(VocalMaterial, { lessonId: "v-l1-m1-01", material, accountId: null, libraryHref: "/learn/voice/materials" }));
  assert.match(markup, /Practice material/);
  assert.match(markup, new RegExp(material.studies[0].title));
  assert.match(markup, /What your voice actually is/);
  assert.match(markup, /Optional local voice recording/);
  assert.match(markup, /never uploaded or synced/);
  assert.match(markup, /does not complete the lesson/);
  assert.match(markup, /Browse all 70 studies and 26 readings/);
});

test("included reading Markdown becomes semantic escaped HTML without visible markers", () => {
  const body = "## Read this\n\nA **strong** idea with *care*.\n\n- First **step**\n- Second step\n\n<script>unsafe()</script>";
  const markup = renderToStaticMarkup(createElement(VocalReadingContent, { body }));
  assert.match(markup, /<h3>Read this<\/h3>/);
  assert.match(markup, /<strong>strong<\/strong>/);
  assert.match(markup, /<em>care<\/em>/);
  assert.match(markup, /<ul><li>First <strong>step<\/strong><\/li><li>Second step<\/li><\/ul>/);
  assert.match(markup, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /\*\*|<script>/);
});

const study: VocalStudy = {
  id: "test-study", title: "Test study", kind: "warmup", bpm: 60, beatsPerBar: 4, countInBeats: 2,
  description: "Test", tip: "Test", provenance: "Test", form: "phrase",
  notes: [
    { midi: 60, startBeat: 0, durBeats: 1, lyric: "one" },
    { midi: 64, startBeat: 2, durBeats: 1, lyric: "two", glideEndMidi: 65 },
  ],
};

test("vocal reference timeline clamps key and speed to the supported controls", () => {
  const timeline = vocalStudyTimeline(study, -50, 0.3);
  assert.deepEqual(timeline.map(note => note.midi), [36, 40]);
  assert.equal(timeline[0].startSeconds, 2);
  assert.equal(timeline[1].startSeconds, 4);
  assert.equal(timeline[1].glideEndMidi, 41);
  assert.equal(timeline[1].restBeforeBeats, 1);
  assert.equal(vocalStudyTimeline(study, 50, 0.75)[0].midi, 72);
});

class AudioValue {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class Oscillator {
  frequency = new AudioValue(); type: OscillatorType = "sine"; onended: (() => void) | null = null; stopped = 0; disconnected = false;
  connect() {} disconnect() { this.disconnected = true; } start() {} stop() { this.stopped++; }
}
class Gain { gain = new AudioValue(); connect() {} disconnect() {} }
class Context {
  state: AudioContextState = "running"; currentTime = 0; destination = {}; onstatechange: (() => void) | null = null;
  oscillators: Oscillator[] = []; gains: Gain[] = []; closed = 0;
  async resume() {} async close() { this.closed++; this.state = "closed"; }
  createOscillator() { const node = new Oscillator(); this.oscillators.push(node); return node; }
  createGain() { const node = new Gain(); this.gains.push(node); return node; }
}

test("synthesized vocal references share the audio arbiter and release every oscillator", async () => {
  const contexts: Context[] = [], timers = new Set<() => void>();
  const environment = {
    createContext: () => { const context = new Context(); contexts.push(context); return context as unknown as AudioContext; },
    schedule: (callback: () => void) => { timers.add(callback); return () => timers.delete(callback); },
  };
  let firstInterrupted = 0;
  const first = await startVocalReference(study, 0, 1, () => firstInterrupted++, new AbortController().signal, environment);
  assert.equal(contexts[0].oscillators.length, study.countInBeats + study.notes.length);
  const second = await startVocalReference(study, -12, 0.5, () => {}, new AbortController().signal, environment);
  assert.equal(firstInterrupted, 1);
  assert.equal(contexts[0].closed, 1);
  assert.ok(contexts[0].oscillators.every(node => node.stopped >= 1 && node.disconnected));
  first.stop();
  second.stop();
  assert.equal(contexts[1].closed, 1);
  assert.equal(timers.size, 0);
});
