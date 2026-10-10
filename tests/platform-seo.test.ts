import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { SITE_URL } from "../lib/site.ts";

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function pageSources(): { route: string; source: string }[] {
  const found: { route: string; source: string }[] = [];
  function walk(dir: URL, route: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir), `${route}/${entry.name}`);
      else if (entry.name === "page.tsx") {
        found.push({ route: route === "" ? "/" : route, source: readFileSync(new URL(entry.name, dir), "utf8") });
      }
    }
  }
  walk(new URL("../app/", import.meta.url), "");
  return found;
}

const isNoindex = (source: string) => /index:\s*false/.test(source);

test("the root layout does not hand its canonical to pages that set none", () => {
  const layout = read("app/layout.tsx");
  const start = layout.indexOf("export const metadata");
  const metadata = layout.slice(start, layout.indexOf("\n};", start));
  assert.doesNotMatch(metadata, /alternates\s*:/, "a layout canonical is inherited by the 404 and noindexed pages");

  // With no layout fallback, every indexable page must declare its own.
  for (const { route, source } of pageSources()) {
    if (isNoindex(source)) continue;
    assert.match(source, /canonical/, `${route} is indexable and must declare a self canonical`);
  }
  assert.match(read("app/page.tsx"), /alternates:\s*\{\s*canonical:\s*SITE_URL\s*\}/);
});

test("the 404 page carries its own title, one noindex and no canonical", () => {
  const source = read("app/not-found.tsx");
  const metadata = source.slice(source.indexOf("export const metadata"), source.indexOf("export default"));
  assert.match(source, /const TITLE = "Page not found \| GuitarHub";/);
  assert.match(metadata, /title:\s*TITLE/);
  // null clears the layout's `index, follow` and googlebot tags; Next adds the
  // single `noindex` to every 404 response itself.
  assert.match(metadata, /robots:\s*null/);
  assert.doesNotMatch(metadata, /alternates|canonical|url:/);
});
