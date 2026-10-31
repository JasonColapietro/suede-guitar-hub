import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";

import { SITEMAP_ENTRIES } from "../lib/site.ts";
import { DRILLS } from "../lib/advanced/drills.ts";

register("./component-render-hooks.mjs", import.meta.url);

/**
 * The search-result contract for every published page: a title of 60
 * characters or fewer that names GuitarHub, a description of 155 characters or
 * fewer with no em dash, and exactly one H1. Rendered, not read from source, so
 * a heading built from JSX fragments is checked as a reader sees it. Drill pages
 * must use their keyword-first search title as the H1.
 */

type PageModule = {
  default: FunctionComponent & ((props: { params: Promise<Record<string, string>> }) => Promise<ReactElement>);
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<Record<string, string>> }) => Promise<Metadata>;
};

const strip = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function pageFile(href: string): string {
  if (href === "/") return "../app/page.tsx";
  if (href === "/learn/guitar") return "../app/learn/[track]/page.tsx";
  return `../app${href}/page.tsx`;
}

async function render(mod: PageModule, params: Record<string, string>): Promise<{ markup: string; metadata: Metadata }> {
  const Page = mod.default;
  const element =
    Page.constructor.name === "AsyncFunction"
      ? await Page({ params: Promise.resolve(params) })
      : createElement(Page);
  const metadata = mod.generateMetadata
    ? await mod.generateMetadata({ params: Promise.resolve(params) })
    : (mod.metadata ?? {});
  return { markup: renderToStaticMarkup(element), metadata };
}

/** The homepage takes its title and description from the root layout. */
function layoutMetadata(): { title: string; description: string } {
  const source = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const title = source.match(/^ {2}title: "([^"]+)",$/m)?.[1] ?? "";
  const description = source.match(/^ {2}description:\s*"([^"]+)",$/m)?.[1] ?? "";
  return { title, description };
}

function checkPage(label: string, title: string, description: string, markup: string): void {
  assert.ok(title.length > 0 && title.length <= 60, `${label}: title is ${title.length} characters: ${title}`);
  assert.match(title, /GuitarHub/, `${label}: title must name GuitarHub: ${title}`);
  assert.ok(
    description.length > 0 && description.length <= 155,
    `${label}: description is ${description.length} characters`,
  );
  assert.doesNotMatch(`${title} ${description}`, /—/, `${label}: no em dashes in search copy`);

  const h1s = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((match) => strip(match[1]));
  assert.equal(h1s.length, 1, `${label}: expected one H1, found ${h1s.length}`);
}

for (const entry of SITEMAP_ENTRIES) {
  test(`${entry.href}: title, description and H1 meet the search contract`, async () => {
    const mod = (await import(new URL(pageFile(entry.href), import.meta.url).href)) as PageModule;
    const { markup, metadata } = await render(mod, { track: "guitar" });
    const fallback = entry.href === "/" ? layoutMetadata() : { title: "", description: "" };
    checkPage(
      entry.href,
      typeof metadata.title === "string" ? metadata.title : fallback.title,
      typeof metadata.description === "string" ? metadata.description : fallback.description,
      markup,
    );
  });
}

test("every Advanced Lab drill uses its search title as the H1", async () => {
  const mod = (await import(new URL("../app/advanced/[drillId]/page.tsx", import.meta.url).href)) as PageModule;
  for (const drill of DRILLS) {
    const { markup, metadata } = await render(mod, { drillId: drill.id });
    checkPage(drill.id, String(metadata.title), String(metadata.description), markup);
    assert.ok(markup.includes(`<h1>${drill.seo.title.replace(/&/g, "&amp;")}</h1>`), `${drill.id}: H1 must be "${drill.seo.title}"`);
  }
});
