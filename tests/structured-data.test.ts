import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

import { GUITAR_COURSE_ID, SUEDE_ORG_ID, guitarCourseJsonLd, isoMinutes, jsonLdText } from "../lib/course-schema.ts";
import { curricula, allLessons } from "../lib/learning/curriculum.ts";
import { APP_STORE, LIFETIME, TOOLS } from "../lib/site.ts";

const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

function pageFiles(dir = new URL("../app/", import.meta.url), prefix = "app/"): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const url = new URL(name, dir);
    if (statSync(url).isDirectory()) found.push(...pageFiles(new URL(`${name}/`, dir), `${prefix}${name}/`));
    else if (/\.tsx?$/.test(name)) found.push(`${prefix}${name}`);
  }
  return found;
}

// ── Course ──────────────────────────────────────────────────────────────────

test("ISO 8601 durations are written from whole minutes", () => {
  assert.equal(isoMinutes(45), "PT45M");
  assert.equal(isoMinutes(120), "PT2H");
  assert.equal(isoMinutes(861), "PT14H21M");
  assert.throws(() => isoMinutes(0));
  assert.throws(() => isoMinutes(1.5));
});

test("the guitar Course is built from the curriculum the page renders", () => {
  const course = guitarCourseJsonLd();
  const lessons = allLessons("guitar");
  const minutes = lessons.reduce((sum, { lesson }) => sum + lesson.minutes, 0);

  assert.equal(course["@type"], "Course");
  assert.equal(course["@id"], GUITAR_COURSE_ID);
  assert.equal(course.url, "https://guitarhub.org/learn/guitar");
  assert.equal(course.inLanguage, "en-US");
  assert.equal(course.educationalLevel, "Beginner");
  assert.ok(course.name.length > 0);
  assert.ok(course.description.startsWith(`${lessons.length} guided guitar lessons`));

  // Google's required Course info properties.
  assert.deepEqual(course.provider, { "@type": "Organization", "@id": SUEDE_ORG_ID, name: "Suede AI", url: "https://suedeai.ai" });
  assert.equal(course.hasCourseInstance.length, 1);
  assert.equal(course.hasCourseInstance[0].courseMode, "Online");
  assert.equal(course.hasCourseInstance[0].courseWorkload, isoMinutes(minutes));

  // One syllabus section per level, in path order, each with its own minutes.
  assert.equal(course.syllabusSections.length, curricula.guitar.levels.length);
  curricula.guitar.levels.forEach((level, index) => {
    const section = course.syllabusSections[index];
    assert.equal(section.description, level.subtitle);
    assert.ok(section.name.endsWith(level.name));
    if (level.stage) assert.ok(section.name.startsWith(`Stage ${level.stage}: `));
    const levelMinutes = level.modules.flatMap((module) => module.lessons).reduce((sum, lesson) => sum + lesson.minutes, 0);
    assert.equal(section.timeRequired, isoMinutes(levelMinutes));
  });

  // The offer points at the App Store listing: the first module is free there,
  // and the rest is one lifetime purchase of 79.00 USD on the US storefront.
  assert.deepEqual(course.offers, [{ "@type": "Offer", category: "Partially Free", price: "79.00", priceCurrency: "USD", url: APP_STORE.ios, availability: "https://schema.org/InStock" }]);
  assert.equal(course.offers[0].price, LIFETIME.schemaPrice);
  const text = JSON.stringify(course);
  for (const invented of ["aggregateRating", "review", "totalHistoricalEnrollment", "instructor", "educationalCredentialAwarded"]) {
    assert.ok(!text.includes(`"${invented}"`), `the Course must not assert ${invented}`);
  }
});

test("the guitar path page publishes the Course and escapes it for a script tag", () => {
  const source = read("app/learn/[track]/page.tsx");
  assert.match(source, /guitarCourseJsonLd\(\)/);
  assert.match(source, /jsonLdText\(course\)/);
  assert.equal(jsonLdText({ a: "</script><x>" }), '{"a":"\\u003c/script>\\u003cx>"}');
});

// ── Sitewide graph ──────────────────────────────────────────────────────────

test("the sitewide Person node describes the founder of a guitar site", () => {
  const layout = read("app/layout.tsx");
  const person = layout.slice(layout.indexOf('"@type": "Person"'));
  for (const topic of ["Guitar practice", "Guitar pedagogy", "Music theory", "Deliberate practice"]) {
    assert.ok(person.includes(`"${topic}"`), `knowsAbout must include ${topic}`);
  }
  for (const removed of ["Search engine optimization", "Generative engine optimization", "Answer engine optimization", "Fractional Forward-Deployed Engineer"]) {
    assert.ok(!layout.includes(removed), `${removed} does not belong in this site's graph`);
  }
});

test("the sitewide MobileApplication describes what the App Store listing offers", () => {
  const layout = read("app/layout.tsx");
  const app = layout.slice(layout.indexOf('"@type": "MobileApplication"'), layout.indexOf('"@type": "Person"'));
  assert.match(app, /voice lessons/);
  assert.match(app, /chromatic tuner, metronome, vocal range finder, daily guitar practice routine/);
  assert.doesNotMatch(app, /Guided beginner guitar lessons/);
});

// ── Page nodes ──────────────────────────────────────────────────────────────

test("every Article names its page as a WebPage node and carries its own @id", () => {
  const offenders: string[] = [];
  for (const file of pageFiles()) {
    const source = read(file);
    if (/mainEntityOfPage:\s*(CANONICAL|`|")/.test(source)) offenders.push(`${file}: mainEntityOfPage is a bare string`);
    const articles = source.split('"@type": "Article"').length - 1;
    const articleIds = (source.match(/"@id": `\$\{(?:CANONICAL|SITE_URL\}\$\{guide\.href)\}#article`/g) ?? []).length;
    if (articles > articleIds) offenders.push(`${file}: an Article node has no @id`);
  }
  assert.deepEqual(offenders, []);
  // The two guides the audit named.
  for (const file of ["app/guitar-practice-plateau/page.tsx", "app/why-cant-i-play-guitar-fast/page.tsx"]) {
    assert.match(read(file), /"@id": `\$\{CANONICAL\}#article`/);
  }
});

test("pages declare the site's language as en-US", () => {
  for (const file of pageFiles()) {
    assert.doesNotMatch(read(file), /inLanguage: "en"[,\s]/, `${file} must use en-US`);
  }
  assert.match(read("app/glossary/page.tsx"), /inLanguage: "en-US"/);
});

test("the /tools list references each tool's node instead of redefining it", () => {
  const source = read("app/tools/page.tsx");
  const graph = source.slice(source.indexOf("const JSON_LD"));
  assert.doesNotMatch(graph, /"@type": "SoftwareApplication"/);
  assert.match(graph, /item: \{ "@id": `\$\{SITE_URL\}\$\{tool\.href\}#tool` \}/);

  // Each referenced @id is minted by the tool's own page.
  for (const tool of TOOLS) {
    const page = read(`app${tool.href}/page.tsx`);
    assert.ok(/#tool[`"]/.test(page), `${tool.href} must define the SoftwareApplication its list entry points at`);
  }
});
