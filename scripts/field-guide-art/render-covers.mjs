#!/usr/bin/env node
// Renders every Field Guide cover to public/field-guides/covers/<slug>.webp.
//
//   node --experimental-strip-types scripts/field-guide-art/render-covers.mjs [slug...]
//
// Needs Playwright's Chromium (not a project dependency: `npx playwright`
// or a global install; set PLAYWRIGHT_MODULE to its path if it is elsewhere)
// and sharp, which Next already installs. The photographs are the ones already
// published in public/ (see PHOTO_CROPS in photo-covers.mjs). The fonts are
// the OFL-licensed Anton and Comic Neue, vendored beside this script.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FIELD_GUIDES } from "../../lib/field-guides.ts";
import { coverSvg, photoDataUrl } from "./photo-covers.mjs";

const COVER_SIZE = { width: 900, height: 1200 };

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUT = join(ROOT, "public/field-guides/covers");

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean);
  const require = createRequire(import.meta.url);
  for (const name of candidates) {
    try {
      return require(name);
    } catch {}
  }
  throw new Error("Playwright not found. Install it (npx playwright install chromium) or set PLAYWRIGHT_MODULE.");
}

async function fontFaces() {
  const faces = [
    ["Anton", "Anton-Regular.woff2"],
    ["Comic Neue", "ComicNeue-Bold.woff2"],
  ];
  const css = [];
  for (const [family, file] of faces) {
    const data = await readFile(join(HERE, "fonts", file));
    css.push(`@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");}`);
  }
  return css.join("\n");
}

const only = new Set(process.argv.slice(2));
const guides = FIELD_GUIDES.filter((g) => !only.size || only.has(g.slug));

await mkdir(OUT, { recursive: true });
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: COVER_SIZE, deviceScaleFactor: 1 });
const fonts = await fontFaces();

for (const guide of guides) {
  await page.setContent(`<!doctype html><html><head><style>${fonts} html,body{margin:0;background:#000}</style></head><body>${coverSvg(guide, await photoDataUrl(ROOT, guide.slug))}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ clip: { x: 0, y: 0, ...COVER_SIZE } });
  const file = join(OUT, `${guide.slug}.webp`);
  await writeFile(file, await sharp(png).webp({ quality: 86 }).toBuffer());
  console.log(`cover ${String(guide.issue).padStart(2, "0")} ${guide.slug}`);
}

await browser.close();
