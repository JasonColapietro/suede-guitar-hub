import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { BACKGROUND_COLOR, SITE_URL, THEME_COLOR } from "../lib/site.ts";

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function publicFile(path: string): URL {
  return new URL(`../public${path}`, import.meta.url);
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

test("publishes a web app manifest and theme colour in the brand indigo", async () => {
  const { default: manifest } = await import("../app/manifest.ts");
  const result = manifest();
  assert.equal(result.short_name, "GuitarHub");
  assert.equal(result.theme_color, THEME_COLOR);
  assert.equal(result.background_color, BACKGROUND_COLOR);
  assert.equal(THEME_COLOR, "#251152", "theme colour must stay --color-indigo-deep");
  assert.match(read("app/globals.css"), new RegExp(`--color-indigo-deep:\\s*${THEME_COLOR}`));
  assert.ok(result.icons && result.icons.length > 0);
  for (const icon of result.icons) {
    assert.ok(existsSync(publicFile(icon.src)), `manifest icon ${icon.src} must exist in public/`);
  }
  assert.match(read("app/layout.tsx"), /themeColor:\s*THEME_COLOR/);
});

test("the footer links the FAQ", () => {
  assert.match(read("components/SiteFooter.tsx"), /href: "\/faq"/, "/faq must have an internal link");
});
