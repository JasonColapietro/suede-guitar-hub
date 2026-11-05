import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  COMPETITORS,
  GUITARHUB_CELLS,
  ROW_ORDER,
  alternativesHref,
  comparisonPage,
  vsHref,
} from "../lib/comparisons.ts";
import { COMPARISONS, COMPARISONS_VERIFIED, HUBS, LIFETIME } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);

/**
 * The /compare pages make claims about other companies, so they carry rules
 * the rest of the site does not: every competitor has sources, every price
 * sits beside its "as of" month, and the copy keeps the house writing rules.
 */

const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

async function render(href: string): Promise<string> {
  const mod = (await import(new URL(`../app${href}/page.tsx`, import.meta.url).href)) as { default: FunctionComponent };
  return renderToStaticMarkup(createElement(mod.default));
}

const BANNED = [
  /—/,
  /\bmoreover\b/i,
  /\bdelve/i,
  /game-changer/i,
  /\bunlock/i,
  /\belevate/i,
  /\bseamless/i,
  /\blandscape\b/i,
  /\btapestry\b/i,
  /it'?s important to note/i,
  /honest (limits|caveats)|not the first choice|not a fit|what it is not|what we will not promise/i,
];

test("the registry holds one head-to-head and one alternatives page per competitor, each with a page", () => {
  const expected = COMPETITORS.flatMap(({ slug }) => [vsHref(slug), alternativesHref(slug)]).sort();
  assert.deepEqual(COMPARISONS.map((entry) => entry.href).sort(), expected);
  assert.ok(HUBS.some((entry) => entry.href === "/compare"), "the hub must be registered");
  for (const href of ["/compare", ...expected]) {
    assert.ok(existsSync(new URL(`../app${href}/page.tsx`, import.meta.url)), `${href} needs a page.tsx`);
  }
  for (const entry of COMPARISONS) assert.equal(entry.lastModified, COMPARISONS_VERIFIED);
});

test("every competitor is sourced, and every price carries its as-of month", () => {
  for (const rival of COMPETITORS) {
    assert.ok(rival.sources.length >= 2, `${rival.name} needs at least two sources`);
    for (const source of rival.sources) assert.match(source.url, /^https:\/\//);
    assert.match(rival.pricing, /^As of November 2026/, `${rival.name}: the price sentence must open with its date`);
    for (const row of ROW_ORDER) assert.ok(rival.cells[row], `${rival.name} is missing the ${row} row`);
  }
  for (const row of ROW_ORDER) assert.ok(GUITARHUB_CELLS[row]);
  assert.match(GUITARHUB_CELLS.price, new RegExp(`\\$${LIFETIME.price}`), "GuitarHub's price comes from LIFETIME");
});

test("search titles and descriptions are unique and within limits", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const entry of COMPARISONS) {
    const page = comparisonPage(entry.href);
    assert.ok(page.title.length <= 60 && /GuitarHub/.test(page.title), page.title);
    assert.ok(page.description.length <= 155, `${entry.href}: description is ${page.description.length} characters`);
    assert.match(page.description, /November 2026/);
    assert.equal(page.canonical, `https://guitarhub.org${entry.href}`);
    titles.add(page.title);
    descriptions.add(page.description);
  }
  assert.equal(titles.size, COMPARISONS.length);
  assert.equal(descriptions.size, COMPARISONS.length);
});

test("each page answers first, shows its table, sources and FAQ, and keeps the writing rules", async () => {
  for (const href of ["/compare", ...COMPARISONS.map((entry) => entry.href)]) {
    const markup = await render(href);
    const body = text(markup);
    for (const pattern of BANNED) assert.doesNotMatch(body, pattern, `${href} breaks the writing rules: ${pattern}`);
    assert.match(body, /The short answer:/, `${href} must open with a direct answer`);
    assert.match(markup, /<table\b/, `${href} must carry a comparison table`);
    assert.match(markup, /aria-label="Breadcrumb"/, `${href} must show its breadcrumb trail`);

    const ld = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((match) => JSON.parse(match[1]))
      .flatMap((doc) => doc["@graph"] ?? [doc]);
    const types = ld.map((node) => node["@type"]);
    assert.ok(types.includes("FAQPage"), `${href} needs FAQPage JSON-LD`);
    assert.ok(types.includes("BreadcrumbList"), `${href} needs BreadcrumbList JSON-LD`);
    const faq = ld.find((node) => node["@type"] === "FAQPage");
    assert.ok(faq.mainEntity.length >= 3);
    for (const question of faq.mainEntity) {
      assert.ok(body.includes(question.name), `${href}: "${question.name}" is not visible on the page`);
      assert.ok(body.includes(question.acceptedAnswer.text), `${href}: an FAQ answer is not visible on the page`);
    }

    if (href !== "/compare") {
      const page = comparisonPage(href);
      assert.match(body, /Sources/);
      for (const source of page.competitor.sources) {
        assert.ok(markup.includes(`href="${source.url}"`), `${href} must cite ${source.url}`);
      }
      assert.match(body, /November 2026/);
    }
  }
});

test("the hub is linked from the footer, the about page and the FAQ", () => {
  assert.match(read("components/SiteFooter.tsx"), /href: "\/compare"/);
  assert.match(read("app/about/page.tsx"), /href="\/compare"/);
  assert.match(read("app/faq/page.tsx"), /href="\/compare"/);
});
