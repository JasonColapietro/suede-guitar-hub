import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  COMPETITORS,
  GUITARHUB_CELLS,
  PRICE_ROWS,
  ROW_ORDER,
  VERIFIED_LABEL,
  alternativesHref,
  comparisonPage,
  isPriceRow,
  vsHref,
} from "../lib/comparisons.ts";
import { COMPARISONS, COMPARISONS_VERIFIED, HUBS, LIFETIME } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);

/**
 * The /compare pages make claims about other companies, so they carry rules
 * the rest of the site does not: every competitor has sources, competitor
 * pricing always reads "varies" with a link to the competitor's own pricing
 * page (owner direction, 2026-11-05), and the copy keeps the house writing
 * rules. GuitarHub's own price comes from LIFETIME and stays exact.
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

/**
 * A competitor price figure: a dollar amount, a per-month or per-year rate, a
 * free trial, or an "as of" price label. GuitarHub's own price is stripped
 * before this runs, so any match is a competitor price that leaked back in.
 */
const COMPETITOR_PRICE = [
  /\$\s?\d/,
  /\b\d+(\.\d+)?\s*(USD|dollars?)\b/i,
  /\bper (month|year)\b|\/\s?(mo|month|yr|year)\b/i,
  /\bfree trial\b|\b\d+-day (free )?trial\b/i,
  /\bas of November 2026\b/i,
  /\bcheaper than\b|\bpasses .* in month\b|\bover two years\b/i,
];

/** Source titles are citations, kept as the competitor publishes them ("Fender Play Free Trial FAQs"). */
const SOURCE_LABELS = [...new Set(COMPETITORS.flatMap((rival) => rival.sources.map((source) => source.label)))];

/** Removes every spelling of GuitarHub's own price, which stays exact on these pages, and the cited source titles. */
function withoutGuitarHubPrice(value: string): string {
  return SOURCE_LABELS.reduce((text, label) => text.replaceAll(label, " "), value)
    .replaceAll(LIFETIME.cta, " ")
    .replaceAll(LIFETIME.oneTime, " ")
    .replaceAll(`${LIFETIME.display} USD`, " ")
    .replaceAll(LIFETIME.display, " ");
}

function assertNoCompetitorPrice(value: string, where: string): void {
  const stripped = withoutGuitarHubPrice(value);
  for (const pattern of COMPETITOR_PRICE) {
    const hit = stripped.match(pattern);
    assert.equal(hit, null, `${where} carries a competitor price (${pattern}): "${hit ? stripped.slice(Math.max(0, (hit.index ?? 0) - 60), (hit.index ?? 0) + 60) : ""}"`);
  }
}

test("every competitor is sourced, and its pricing reads varies with a link to its own pricing page", () => {
  for (const rival of COMPETITORS) {
    assert.ok(rival.sources.length >= 2, `${rival.name} needs at least two sources`);
    for (const source of rival.sources) assert.match(source.url, /^https:\/\//);
    assert.ok(
      rival.sources.some((source) => source.url === rival.pricingSource.url),
      `${rival.name}: the pricing link must also be listed in its sources`,
    );
    for (const row of ROW_ORDER) {
      if (isPriceRow(row)) {
        assert.equal((rival.cells as Record<string, string>)[row], undefined, `${rival.name} must not type a ${row} cell`);
      } else {
        assert.ok(rival.cells[row], `${rival.name} is missing the ${row} row`);
      }
    }
    assertNoCompetitorPrice(JSON.stringify(rival), `${rival.name}'s data`);
  }
  assert.deepEqual([...PRICE_ROWS], ["price", "free"]);
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
    assertNoCompetitorPrice(`${page.title} ${page.description} ${page.entry.blurb}`, `${entry.href} metadata`);
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

    assertNoCompetitorPrice(body, `${href} visible copy`);
    assertNoCompetitorPrice(JSON.stringify(ld), `${href} JSON-LD`);
    assert.ok(body.includes(VERIFIED_LABEL), `${href} must show the date its facts were checked`);

    if (href === "/compare") {
      for (const rival of COMPETITORS) {
        assert.ok(markup.includes(`href="${rival.pricingSource.url}"`), `/compare must link ${rival.name}'s pricing`);
      }
    } else {
      const page = comparisonPage(href);
      assert.match(body, /Sources/);
      for (const source of page.competitor.sources) {
        assert.ok(markup.includes(`href="${source.url}"`), `${href} must cite ${source.url}`);
      }
      assert.match(body, /Pricing varies/, `${href} must say competitor pricing varies`);
      assert.ok(
        markup.includes(`href="${page.competitor.pricingSource.url}"`),
        `${href} must link ${page.competitor.name}'s pricing page`,
      );
      assert.ok(body.includes(LIFETIME.oneTime), `${href} must keep GuitarHub's own price`);
    }
  }
});

test("llms.txt and llms-full.txt carry no competitor price", async () => {
  const route = (await import(new URL("../app/llms.txt/route.ts", import.meta.url).href)) as { GET: () => Response | Promise<Response> };
  const llms = await (await route.GET()).text();
  const start = llms.indexOf("## How GuitarHub compares");
  const end = llms.indexOf("## About the project");
  assert.ok(start >= 0 && end > start, "llms.txt must keep its comparison section");
  const section = llms.slice(start, end);
  assertNoCompetitorPrice(section, "llms.txt comparison section");
  for (const rival of COMPETITORS) assert.ok(section.includes(`${rival.name}: Pricing varies (${rival.pricingSource.url})`));

  const full = read("public/llms-full.txt");
  const compare = full.slice(full.indexOf("Source: https://guitarhub.org/compare\n"));
  assert.ok(compare.length > 0 && compare.includes("Pricing varies"), "llms-full.txt must carry the regenerated comparison pages");
  for (const href of COMPARISONS.map((entry) => entry.href)) {
    const at = full.indexOf(`Source: https://guitarhub.org${href}\n`);
    assert.ok(at >= 0, `llms-full.txt is missing ${href}`);
    const next = full.indexOf("\nSource: https://", at + 1);
    assertNoCompetitorPrice(full.slice(at, next === -1 ? undefined : next), `llms-full.txt ${href}`);
  }
});

test("the hub is linked from the footer, the about page and the FAQ", () => {
  assert.match(read("components/SiteFooter.tsx"), /href: "\/compare"/);
  assert.match(read("app/about/page.tsx"), /href="\/compare"/);
  assert.match(read("app/faq/page.tsx"), /href="\/compare"/);
});
