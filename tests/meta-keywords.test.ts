import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BRAND_KEYWORDS,
  MAX_KEYWORDS,
  MIN_KEYWORDS,
  ROUTE_KEYWORDS,
  keywordsFor,
  drillKeywords,
  lessonKeywords,
  trackKeywords,
} from "../lib/keywords.ts";
import { SITEMAP_ENTRIES } from "../lib/site.ts";
import { DRILLS, skillArea } from "../lib/advanced/drills.ts";
import { allLessons } from "../lib/learning/curriculum.ts";

const APP_DIR = fileURLToPath(new URL("../app", import.meta.url));

function metadataFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return metadataFiles(path);
    return name === "page.tsx" || name === "layout.tsx" ? [path] : [];
  });
}

function routeOf(file: string): string {
  const rel = relative(APP_DIR, file).replace(/\\/g, "/");
  const dir = rel.replace(/\/?(page|layout)\.tsx$/, "");
  return dir === "" ? "/" : `/${dir}`;
}

function assertKeywordList(label: string, list: readonly string[]) {
  assert.ok(
    list.length >= MIN_KEYWORDS && list.length <= MAX_KEYWORDS,
    `${label}: expected ${MIN_KEYWORDS}-${MAX_KEYWORDS} keywords, got ${list.length}`,
  );
  assert.equal(new Set(list).size, list.length, `${label}: duplicate keywords`);
  for (const term of list) {
    assert.equal(term, term.toLowerCase().trim(), `${label}: "${term}" must be lowercase and trimmed`);
    assert.ok(term.length > 0, `${label}: empty keyword`);
    assert.ok(!term.includes(","), `${label}: "${term}" must not contain a comma`);
    assert.ok(!term.includes("suede labs ai"), `${label}: the brand is "Suede AI"`);
  }
}

test("every page or layout that ships indexable metadata also ships keywords", () => {
  const missing: string[] = [];
  for (const file of metadataFiles(APP_DIR)) {
    const source = readFileSync(file, "utf8");
    const hasMetadata = /export (const metadata|async function generateMetadata)/.test(source);
    if (!hasMetadata) continue;
    // noindex pages (account, private voice pages) are not search surfaces.
    if (/robots:\s*\{\s*index:\s*false/.test(source)) continue;
    if (!/\bkeywords:\s/.test(source)) missing.push(relative(APP_DIR, file));
  }
  assert.deepEqual(missing, [], `metadata without keywords: ${missing.join(", ")}`);
});

test("static pages use the keyword list for their own route", () => {
  for (const file of metadataFiles(APP_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/keywords(?:For|Text)\("([^"]+)"\)/g)) {
      assert.equal(match[1], routeOf(file), `${relative(APP_DIR, file)} uses keywords for ${match[1]}`);
    }
  }
});

test("article JSON-LD carries keywords", () => {
  for (const file of metadataFiles(APP_DIR)) {
    const source = readFileSync(file, "utf8");
    const articleNodes = source.match(/"@type": "Article",\s*\n\s*(?:"@id"|headline)/g) ?? [];
    if (articleNodes.length === 0) continue;
    const withKeywords = source.match(/keywords: keywordsText\(/g) ?? [];
    assert.equal(
      withKeywords.length,
      articleNodes.length,
      `${relative(APP_DIR, file)}: every Article node needs keywords`,
    );
  }
});

test("every sitemap route has a complete keyword list", () => {
  for (const entry of SITEMAP_ENTRIES) {
    const list = (ROUTE_KEYWORDS as Record<string, readonly string[]>)[entry.href];
    assert.ok(list, `${entry.href} has no keywords in lib/keywords.ts`);
  }
  for (const route of Object.keys(ROUTE_KEYWORDS) as (keyof typeof ROUTE_KEYWORDS)[]) {
    const list = keywordsFor(route);
    assertKeywordList(route, list);
    for (const brand of BRAND_KEYWORDS) assert.ok(list.includes(brand), `${route}: missing brand term "${brand}"`);
  }
});

test("dynamic routes derive valid keywords from their entity", () => {
  assertKeywordList("/learn/guitar", trackKeywords("guitar"));
  assertKeywordList("/learn/voice", trackKeywords("voice"));
  for (const drill of DRILLS) {
    const list = drillKeywords(drill.title, skillArea(drill.area).name);
    assertKeywordList(`/advanced/${drill.id}`, list);
    assert.equal(list[0], drill.title.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim());
  }
  for (const { lesson, module } of allLessons("guitar")) {
    const list = lessonKeywords("guitar", lesson.title, module.name);
    assertKeywordList(`/learn/guitar/${lesson.id}`, list);
    assert.ok(list.includes(lesson.title.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ").trim()));
  }
});

test("only the intermediate routine guide targets the head term 'guitar practice routine'", () => {
  for (const [route, list] of Object.entries(ROUTE_KEYWORDS)) {
    if (route === "/guitar-practice-routine-intermediate") {
      assert.ok((list as readonly string[]).includes("guitar practice routine"));
    } else {
      assert.ok(!(list as readonly string[]).includes("guitar practice routine"), `${route} competes for "guitar practice routine"`);
    }
  }
});
