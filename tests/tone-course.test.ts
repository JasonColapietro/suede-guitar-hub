import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TONE_COURSE_MINUTES, TONE_LESSONS, TONE_MODULES, getToneLesson, toneLessonHref } from "../lib/tone/course.ts";
import { completedCount, nextToneLesson, parseToneProgress, withLessonRead, withQuizResult, withoutLesson } from "../lib/tone/progress.ts";
import { PEDAL_PRESETS } from "../lib/tools/pedal-lab.ts";
import { LEARN, TOOLS } from "../lib/site.ts";
register("./component-render-hooks.mjs", import.meta.url);

const EXPECTED_MODULES = ["pickups", "amps", "pedals", "signal-chain", "power", "recording", "recipes"];

test("the course runs pickups to recipes, with unique, well-formed lesson ids", () => {
  assert.deepEqual(TONE_MODULES.map(part => part.id), EXPECTED_MODULES);
  const ids = TONE_LESSONS.map(lesson => lesson.id);
  assert.equal(new Set(ids).size, ids.length, "lesson ids must be unique across the course");
  for (const part of TONE_MODULES) {
    assert.ok(part.lessons.length >= 3, `${part.id} needs at least three lessons`);
    assert.ok(part.title.length > 0 && part.blurb.length > 0, `${part.id} needs a title and blurb`);
    for (const lesson of part.lessons) assert.equal(lesson.module, part.id, `${lesson.id} is filed under the wrong module`);
  }
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${id} is not a clean URL slug`);
  assert.equal(TONE_COURSE_MINUTES, TONE_LESSONS.reduce((sum, lesson) => sum + lesson.minutes, 0));
  assert.equal(getToneLesson(ids[0])?.id, ids[0]);
  assert.equal(getToneLesson("not-a-lesson"), undefined);
  assert.equal(toneLessonHref("x"), "/tone/x");
  assert.ok(LEARN.some(entry => entry.href === "/tone"), "the course hub must be in the route registry");
});

test("every lesson is complete: sections, takeaways, an exercise and an answerable check", () => {
  const toolHrefs = new Set(TOOLS.map(tool => tool.href));
  for (const lesson of TONE_LESSONS) {
    const where = `${lesson.id}:`;
    assert.ok(lesson.title.trim().length > 0, `${where} title`);
    assert.ok(lesson.summary.length > 20 && lesson.summary.length <= 160, `${where} summary must be 21–160 characters, got ${lesson.summary.length}`);
    assert.ok(Number.isInteger(lesson.minutes) && lesson.minutes >= 3 && lesson.minutes <= 40, `${where} minutes must be a plausible whole number`);
    assert.ok(lesson.sections.length >= 2 && lesson.sections.length <= 6, `${where} needs 2–6 sections`);
    assert.equal(new Set(lesson.sections.map(section => section.heading)).size, lesson.sections.length, `${where} section headings must be unique (they key the page)`);
    for (const section of lesson.sections) {
      assert.ok(section.paragraphs.length >= 1, `${where} "${section.heading}" is empty`);
      assert.equal(new Set(section.paragraphs).size, section.paragraphs.length, `${where} "${section.heading}" repeats a paragraph`);
      for (const paragraph of section.paragraphs) assert.doesNotMatch(paragraph, /<[a-z/][^>]*>|\*\*|__/i, `${where} paragraphs are plain text, not markup`);
    }
    assert.ok(lesson.keyPoints.length >= 3 && lesson.keyPoints.length <= 5, `${where} needs 3–5 key points`);
    assert.ok(lesson.exercise.steps.length >= 2, `${where} exercise needs steps`);
    if (lesson.exercise.tool) assert.ok(toolHrefs.has(lesson.exercise.tool.split("?")[0]), `${where} exercise links to ${lesson.exercise.tool}, which is not a registered tool`);
    assert.ok(lesson.quiz.length >= 2 && lesson.quiz.length <= 4, `${where} needs 2–4 check questions`);
    for (const question of lesson.quiz) {
      assert.ok(question.options.length >= 2 && question.options.length <= 4, `${where} "${question.q}" needs 2–4 options`);
      assert.equal(new Set(question.options).size, question.options.length, `${where} "${question.q}" repeats an option`);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, `${where} "${question.q}" points at an answer that does not exist`);
      assert.ok(question.why.length > 10, `${where} "${question.q}" needs a reason`);
    }
  }
});

test("the prose names no products, brands or artists", () => {
  // The copy rule in lib/tone/types.ts. A short list of the names most likely
  // to slip into guitar writing; it is a tripwire, not a complete register.
  const NAMES = /\b(Fender|Marshall|Vox|Gibson|Mesa|Boogie|Peavey|Friedman|Bogner|Soldano|Ibanez|Boss|Electro-Harmonix|EHX|Strymon|MXR|Dunlop|Klon|Tube Screamer|Big Muff|Fuzz Face|Tonebender|Kemper|Line 6|Helix|Fractal|Axe-Fx|Neural DSP|Quad Cortex|Shure|SM57|Sennheiser|Royer|Celestion|Jensen|Eminence|Seymour Duncan|DiMarzio|EMG|Stratocaster|Telecaster|Les Paul|Voodoo Lab|Truetone|Hendrix|Clapton|Van Halen|Gilmour|Mayer|Frusciante)\b/;
  for (const lesson of TONE_LESSONS) {
    const text = [lesson.title, lesson.summary, ...lesson.sections.flatMap(section => [section.heading, ...section.paragraphs]), ...lesson.keyPoints, lesson.exercise.title, ...lesson.exercise.steps, ...lesson.quiz.flatMap(question => [question.q, ...question.options, question.why]), ...(lesson.recipe ? [lesson.recipe.guitar, lesson.recipe.pickup, lesson.recipe.amp, lesson.recipe.hands, ...lesson.recipe.settings, ...lesson.recipe.pedals] : [])].join("\n");
    const found = text.match(NAMES);
    assert.equal(found, null, `${lesson.id} names "${found?.[0]}"`);
  }
});

test("every tone recipe loads a real pedal lab preset, one recipe per preset", () => {
  const recipes = TONE_LESSONS.filter(lesson => lesson.module === "recipes");
  assert.ok(recipes.length > 0);
  const presetIds = new Set(PEDAL_PRESETS.map(preset => preset.id));
  const used = new Set<string>();
  for (const lesson of recipes) {
    assert.ok(lesson.recipe, `${lesson.id} is a recipe lesson with no recipe card`);
    const preset = lesson.recipe.preset;
    assert.ok(preset && presetIds.has(preset), `${lesson.id} points at pedal lab preset "${preset}", which does not exist`);
    assert.ok(!used.has(preset), `${preset} is used by two recipes`);
    used.add(preset);
    assert.ok(lesson.recipe.settings.length > 0 && lesson.recipe.hands.length > 0, `${lesson.id} needs settings and a note on the hands`);
  }
  for (const lesson of TONE_LESSONS) if (lesson.module !== "recipes") assert.equal(lesson.recipe, undefined, `${lesson.id} carries a recipe outside the recipes module`);
});

test("tone progress keeps quiz passes, never downgrades them, and survives bad storage", () => {
  const ids = TONE_LESSONS.map(lesson => lesson.id), [a, b] = ids;
  let progress = withQuizResult({}, a, 2, 3, "t1");
  assert.deepEqual(progress, {}, "a check with a wrong answer records nothing");
  progress = withLessonRead(progress, a, "t2");
  assert.equal(progress[a].how, "read");
  progress = withQuizResult(progress, a, 3, 3, "t3");
  assert.deepEqual(progress[a], { how: "quiz", score: 3, total: 3, updatedAt: "t3" }, "a pass upgrades a read mark");
  assert.equal(withLessonRead(progress, a, "t4"), progress, "marking read never replaces a pass");
  assert.equal(withQuizResult(progress, a, 3, 3, "t5"), progress, "a second pass keeps the first record");
  assert.equal(withQuizResult(progress, b, Number.NaN, 3, "t6"), progress);
  assert.equal(completedCount(progress, ids), 1);
  assert.equal(nextToneLesson(progress, ids), b);
  assert.equal(nextToneLesson(Object.fromEntries(ids.map(id => [id, progress[a]])), ids), null);
  assert.deepEqual(withoutLesson(progress, a), {});
  const stored = JSON.stringify({ ...progress, unknown: progress[a], [b]: { how: "cheated", updatedAt: "x" } });
  assert.deepEqual(parseToneProgress(stored, ids), progress);
  assert.deepEqual(parseToneProgress("{not json", ids), {});
  assert.deepEqual(parseToneProgress("[1,2]", ids), {});
  assert.deepEqual(parseToneProgress(JSON.stringify({ [a]: { how: "quiz", score: 9, total: 3, updatedAt: "x" } }), ids)[a].score, 3, "a score is clamped to its total");
});

test("the hub and a lesson render the course, the check and the recipe link on the server", async () => {
  const { default: ToneCourse, metadata } = await import("../app/tone/page.tsx");
  const hub = renderToStaticMarkup(createElement(ToneCourse));
  for (const part of TONE_MODULES) assert.match(hub, new RegExp(`id="${part.id}"`));
  for (const lesson of TONE_LESSONS) assert.ok(hub.includes(`href="/tone/${lesson.id}"`), `the hub must link to ${lesson.id}`);
  assert.match(hub, /"@type":"Course"/);
  assert.equal(metadata.alternates?.canonical, "https://guitarhub.org/tone");

  const page = await import("../app/tone/[lessonId]/page.tsx");
  assert.deepEqual(page.generateStaticParams().map(params => params.lessonId), TONE_LESSONS.map(lesson => lesson.id));
  const first = TONE_LESSONS[0];
  const markup = renderToStaticMarkup(await page.default({ params: Promise.resolve({ lessonId: first.id }) }));
  assert.ok(markup.includes(first.sections[0].heading.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;")), "the first section heading must render");
  assert.match(markup, /Check what stuck/);
  assert.match(markup, /Answer all \d to check/);
  assert.equal((markup.match(/type="radio"/g) ?? []).length, first.quiz.reduce((sum, question) => sum + question.options.length, 0));
  const meta = await page.generateMetadata({ params: Promise.resolve({ lessonId: first.id }) });
  assert.equal(meta.alternates?.canonical, `https://guitarhub.org/tone/${first.id}`);

  const recipe = TONE_LESSONS.find(lesson => lesson.recipe?.preset)!;
  const recipeMarkup = renderToStaticMarkup(await page.default({ params: Promise.resolve({ lessonId: recipe.id }) }));
  assert.ok(recipeMarkup.includes(`href="/tools/pedal-lab?preset=${recipe.recipe!.preset}"`), "a recipe must link to its pedal lab preset");
});

test("the listening pro tools, and only they, may ask for the microphone", async () => {
  const { default: config, MICROPHONE_TOOLS } = await import("../next.config.ts");
  const rules = await config.headers!();
  const general = rules.find(rule => rule.source === "/:path*")!;
  for (const source of MICROPHONE_TOOLS) {
    assert.ok(TOOLS.some(tool => tool.href === source), `${source} is not a registered tool`);
    const rule = rules.find(candidate => candidate.source === source);
    assert.ok(rule && rules.indexOf(rule) > rules.indexOf(general), `${source} must override the sitewide denial`);
    assert.equal(rule.headers.find(header => header.key === "Permissions-Policy")?.value, "camera=(), geolocation=(), microphone=(self)");
  }
  assert.equal(rules.some(rule => rule.source === "/tools" || rule.source === "/tools/:path*"), false, "the tools hub and non-listening tools keep the denial");
  const csp = general.headers.find(header => header.key === "Content-Security-Policy")?.value ?? "";
  assert.match(csp, /media-src 'self' blob:/, "the slow-downer plays local files from blob: URLs");
  assert.doesNotMatch(csp, /connect-src[^;]*blob:|media-src[^;]*https?:/, "no remote media source is allowed");
});
