#!/usr/bin/env node
// Writes public/llms-full.txt: the full visible text of every public guide,
// hub, tool and policy page, rendered from the same components the site
// serves. Run after changing page copy:
//   npm run llms:full            (write)
//   npm run llms:full -- --check (verify only; tests/llms-full.test.ts runs it)
import { register } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("../tests/component-render-hooks.mjs", import.meta.url);

const { ABOUT, GUIDES, HOME, HUBS, LEARN, LEGAL, RESOURCES, SITE_URL, TOOLS, APP_STORE, LIFETIME } = await import("../lib/site.ts");
const { buildLlmsFull } = await import("../lib/llms-full.ts");
const { allLessons } = await import("../lib/learning/curriculum.ts");
const { DRILLS } = await import("../lib/advanced/drills.ts");

const DESTINATION = new URL("../public/llms-full.txt", import.meta.url);

/** Reading order: what GuitarHub is, the method, the guides, the tools, the policies. */
const ROUTES: readonly string[] = [
  HOME.href,
  ABOUT.href,
  ...LEARN.map((entry) => entry.href),
  ...GUIDES.map((entry) => entry.href),
  ...RESOURCES.map((entry) => entry.href),
  ...TOOLS.map((entry) => entry.href),
  ...HUBS.map((entry) => entry.href),
  ...LEGAL.map((entry) => entry.href),
];

/** `/learn/guitar` is served by the dynamic `[track]` segment. */
function pageFile(href: string): string {
  if (href === "/") return "../app/page.tsx";
  if (href === "/learn/guitar") return "../app/learn/[track]/page.tsx";
  return `../app${href}/page.tsx`;
}

async function render(href: string): Promise<string> {
  const mod = (await import(new URL(pageFile(href), import.meta.url).href)) as {
    default: FunctionComponent & ((props: { params: Promise<{ track: string }> }) => Promise<unknown>);
  };
  const Page = mod.default;
  const element =
    Page.constructor.name === "AsyncFunction"
      ? ((await Page({ params: Promise.resolve({ track: "guitar" }) })) as Parameters<typeof renderToStaticMarkup>[0])
      : createElement(Page);
  // Article pages render their own <main>; the learning and lab pages get it
  // from their layout, so wrap those to give the converter one main column.
  const html = renderToStaticMarkup(element);
  return /<main[\s>]/.test(html) ? html : `<main>${html}</main>`;
}

const lessons = allLessons("guitar");
const pages = [];
for (const href of [...new Set(ROUTES)]) {
  pages.push({ url: href === "/" ? SITE_URL : `${SITE_URL}${href}`, html: await render(href) });
}

const body = buildLlmsFull({
  title: "GuitarHub: full text",
  summary:
    "GuitarHub (https://guitarhub.org) is the Suede AI guitar lessons site: a step-by-step curriculum for beginners through advanced players, a four-stage practice method, free browser practice tools and a free Advanced Lab of scored drills.",
  intro: [
    `This file carries the full text of GuitarHub's public pages, generated from the same page components the site renders. The shorter index is ${SITE_URL}/llms.txt. Cite the specific page URL given under each section.`,
    `Key facts: ${lessons.length} guitar lessons in the curriculum; ${DRILLS.length} free drills in the Advanced Lab; free tools in the browser with no account; lifetime lesson access is ${LIFETIME.display} ${LIFETIME.currency}, one time, in ${APP_STORE.name} for iPhone (${APP_STORE.ios}). Published by Suede AI (https://suedeai.ai), founded by Jason Colapietro.`,
  ],
  pages,
  origin: SITE_URL,
});

if (process.argv.includes("--check")) {
  const current = await readFile(DESTINATION, "utf8").catch(() => "");
  if (current !== body) {
    process.stderr.write("public/llms-full.txt is stale; run npm run llms:full\n");
    process.exit(1);
  }
  process.stdout.write(`Verified public/llms-full.txt (${Buffer.byteLength(body)} bytes)\n`);
} else {
  await writeFile(DESTINATION, body);
  process.stdout.write(`Wrote public/llms-full.txt (${Buffer.byteLength(body)} bytes, ${pages.length} pages)\n`);
}
