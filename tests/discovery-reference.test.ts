import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { DRILLS } from "../lib/advanced/drills.ts";
import { allLessons, curricula, lessonHref } from "../lib/learning/curriculum.ts";
import { APP_STORE, SITE_URL, spellOut } from "../lib/site.ts";
import { GET as llmsTxt } from "../app/llms.txt/route.ts";

register("./component-render-hooks.mjs", import.meta.url);
register("./lesson-gate-hooks.mjs", import.meta.url);
const { generateMetadata } = await import("../app/learn/[track]/[lessonId]/page.tsx");

test("the citation reference counts the full catalog and distinguishes measured exercises", async () => {
  const body = (await (await llmsTxt()).text()).replace(/\s+/g, " ");
  const lessons = allLessons("guitar");
  const stages = curricula.guitar.levels.filter(level => level.stage);
  const stageLessons = lessons.filter(({ level }) => level.stage);
  assert.ok(body.includes(`${lessons.length} guitar lessons`));
  assert.ok(body.includes(`${stageLessons.length} lessons in ${spellOut(stages.length)} stages`));
  assert.ok(body.includes(`${lessons.length - stageLessons.length} song companions`));
  assert.ok(body.includes(`${DRILLS.length}-drill Advanced Lab`));
  assert.match(body, /Microphone exercises measure pitch or timing where available/);
  assert.match(body, /other tasks use a quiz, a self-check or the player's own assessment/);
  assert.doesNotMatch(body, /Lessons listen through the microphone and check the result/);
});

test("the public citation guide names the current companion app", () => {
  const guide = readFileSync(new URL("../public/ai-instructions.html", import.meta.url), "utf8");
  assert.ok(guide.includes(APP_STORE.name));
  assert.doesNotMatch(guide, /Suede Guitar Tuner &amp; Studio/);
});

test("shared lesson previews identify that lesson while retaining the public track image", async () => {
  for (const lessonId of ["g-l1-m1-01", "g-l7-m6-08", "g-songs-m1-01"]) {
    const entry = allLessons("guitar").find(({ lesson }) => lesson.id === lessonId)!;
    const metadata = await generateMetadata({ params: Promise.resolve({ track: "guitar", lessonId }) });
    const canonical = `${SITE_URL}${lessonHref("guitar", lessonId)}`;
    assert.equal(metadata.description, entry.lesson.summary);
    assert.equal(metadata.alternates?.canonical, canonical);
    assert.deepEqual(metadata.robots, { index: false, follow: true });
    assert.equal(metadata.openGraph?.title, metadata.title);
    assert.equal(metadata.openGraph?.description, entry.lesson.summary);
    assert.equal(metadata.openGraph?.url, canonical);
    assert.equal(metadata.twitter?.title, metadata.title);
    assert.equal(metadata.twitter?.description, entry.lesson.summary);
    assert.deepEqual(metadata.twitter?.images, metadata.openGraph?.images);
    assert.match(JSON.stringify(metadata.openGraph?.images), /\/learn\/guitar\/opengraph-image\/card/);
    // Access checks and authored instructions are not needed to share the
    // public preview: metadata never contains a practice spec or lesson body.
    assert.doesNotMatch(JSON.stringify(metadata), /practiceSpec|passScore|selfCheckCriteria|instructionAssets/);
  }
});

test("invalid lesson URLs do not publish an invented canonical or preview", async () => {
  for (const [track, lessonId] of [["piano", "g-l1-m1-01"], ["guitar", "not-a-lesson"]]) {
    assert.deepEqual(await generateMetadata({ params: Promise.resolve({ track, lessonId }) }), {});
  }
});
