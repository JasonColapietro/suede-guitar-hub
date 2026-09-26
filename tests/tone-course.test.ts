import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { SITEMAP_ENTRIES, TONE, TOOLS } from "../lib/site.ts";
import { TONE_LESSONS, toneHref } from "../lib/tone/course.ts";
import { FIELD_GUIDES, fieldGuide } from "../lib/tone/field-guides.ts";
import { CONVENTIONAL_ORDER, RECIPES, defaultBoard, orderNotes, recipeBoard, type PedalSlot } from "../lib/tone/pedals.ts";
import { BANDS, LEVELS, nextBand, score, EMPTY_STATS } from "../lib/tone/ear.ts";
import { normalizeLoop, trainerSpeed, formatTime, peaks } from "../lib/tone/looper.ts";
import { PATTERNS, TUNINGS, cells, degree, inPattern, noteName, quizCell } from "../lib/tone/fretboard.ts";
import { driveCurve } from "../lib/tone/rig.ts";

test("every tone lesson is registered, pre-rendered and paired with a real guide", () => {
  const page = readFileSync(new URL("../app/tone/[slug]/page.tsx", import.meta.url), "utf8");
  const params = page.match(/generateStaticParams\(\)[\s\S]*?\n}/)?.[0] ?? "";
  const hrefs = new Set(SITEMAP_ENTRIES.map(entry => entry.href));
  assert.equal(TONE.length, TONE_LESSONS.length);
  for (const lesson of TONE_LESSONS) {
    assert.ok(params.includes(`"${lesson.slug}"`), `${lesson.slug} must be pre-rendered`);
    assert.ok(hrefs.has(toneHref(lesson.slug)), `${lesson.slug} must be in the sitemap`);
    assert.ok(fieldGuide(lesson.guide), `${lesson.slug} pairs with a guide that exists`);
    if (lesson.tryIt.href.startsWith("/") && !lesson.tryIt.href.startsWith("/tone")) {
      const path = lesson.tryIt.href.split(/[?#]/)[0];
      assert.ok(hrefs.has(path), `${lesson.slug} links to ${path}, which must be a registered page`);
    }
  }
  assert.deepEqual(TONE_LESSONS.map(l => l.number), TONE_LESSONS.map((_, i) => i + 1), "lessons are numbered in order");
});

test("tone copy follows the house style", () => {
  const text = JSON.stringify(TONE_LESSONS) + JSON.stringify(FIELD_GUIDES);
  assert.doesNotMatch(text, /—/, "no em dashes");
  assert.doesNotMatch(text, /\d+ ?%/, "no invented percentages");
});

test("every free guide PDF exists on disk", () => {
  for (const guide of FIELD_GUIDES) {
    const file = new URL(`../public${guide.file}`, import.meta.url);
    assert.ok(existsSync(file), `${guide.file} must be built by scripts/build-field-guides.mjs`);
    assert.equal(readFileSync(file).subarray(0, 5).toString(), "%PDF-");
  }
});

test("the new tools are registered and have a page", () => {
  for (const href of ["/pedal-lab", "/eq-ear-trainer", "/slow-down", "/fretboard"]) {
    assert.ok(TOOLS.some(tool => tool.href === href), `${href} is a registered tool`);
    assert.ok(existsSync(new URL(`../app${href}/page.tsx`, import.meta.url)), `${href} renders`);
  }
});

test("pedal order notes describe real problems and approve the convention", () => {
  const on = (kinds: string[]): PedalSlot[] => kinds.map(kind => ({ kind: kind as PedalSlot["kind"], on: true, values: {} }));
  assert.match(orderNotes(on([...CONVENTIONAL_ORDER])).join(" "), /conventional order/);
  assert.match(orderNotes(on(["reverb", "drive"])).join(" "), /Reverb is feeding a gain pedal/);
  assert.match(orderNotes(on(["delay", "fuzz"])).join(" "), /repeats are being distorted/);
  assert.match(orderNotes(on(["drive", "fuzz"])).join(" "), /Fuzz is after overdrive/);
  assert.deepEqual(orderNotes(defaultBoard()), [], "bypassed pedals say nothing");
  for (const recipe of RECIPES) {
    const board = recipeBoard(recipe);
    assert.equal(board.filter(slot => slot.on).length, recipe.pedals.length, `${recipe.id} switches on its pedals`);
  }
});

test("ear trainer never repeats a band and keeps an honest streak", () => {
  for (const level of LEVELS) {
    for (const hz of level.bands) assert.ok(BANDS.some(band => band.hz === hz));
    let previous: number | null = null;
    for (let i = 0; i < 50; i++) { const next = nextBand(level, previous); assert.notEqual(next, previous); previous = next; }
  }
  let stats = EMPTY_STATS;
  for (const right of [true, true, false, true]) stats = score(stats, right);
  assert.deepEqual(stats, { answered: 4, correct: 3, streak: 1, best: 2 });
});

test("looper keeps loops forward and inside the song, and the trainer climbs to its target", () => {
  assert.deepEqual(normalizeLoop(8, 4, 10), { a: 4, b: 8 });
  assert.deepEqual(normalizeLoop(9.9, 9.95, 10), { a: 9.75, b: 10 });
  assert.equal(normalizeLoop(1, 2, 0), null);
  const trainer = { from: 60, to: 80, step: 5, every: 2 };
  assert.deepEqual([0, 1, 2, 3, 4, 8, 50].map(n => trainerSpeed(trainer, n)), [60, 60, 65, 65, 70, 80, 80]);
  assert.equal(formatTime(75.25), "1:15.3");
  assert.deepEqual(Array.from(peaks(new Float32Array([0, .5, -.25, 1]), 2)), [0, .5, -.25, 1]);
});

test("fretboard theory is right", () => {
  const standard = TUNINGS[0];
  assert.deepEqual(standard.strings.map(noteName), ["E", "A", "D", "G", "B", "E"]);
  const minorPent = PATTERNS.find(p => p.id === "minor-pent")!;
  // A minor pentatonic at the 5th fret on the low E string is A; the 8th is C.
  assert.ok(inPattern(40 + 5, 9, minorPent) && inPattern(40 + 8, 9, minorPent) && !inPattern(40 + 6, 9, minorPent));
  assert.equal(degree(40 + 8, 9), "♭3");
  assert.equal(cells(standard, 12)[0].length, 13);
  const cell = quizCell(standard, 12, () => .999);
  assert.equal(cell.string, 5); assert.equal(cell.fret, 12);
});

test("drive curves stay inside the audio range", () => {
  for (const hard of [false, true]) for (const amount of [0, .5, 1]) {
    const curve = driveCurve(amount, hard, 257);
    assert.ok(curve.every(v => v >= -1 && v <= 1.0001), `curve ${amount} ${hard} is bounded`);
    assert.ok(curve[0] < 0 && curve[256] > 0);
  }
});
