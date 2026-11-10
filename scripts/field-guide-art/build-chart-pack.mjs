#!/usr/bin/env node
// Prints the chord and pentatonic chart pack from a running build of the site.
//
//   npm run build && npx next start -p 3400
//   node scripts/field-guide-art/build-chart-pack.mjs http://localhost:3400
//
// The pack is /plan/chart-pack (app/plan/chart-pack/page.tsx) as printed by
// Chromium, the way build-pdfs.mjs prints the Field Guides. Every plan email
// links the result, public/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf.

import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUT = join(ROOT, "public/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf");

const [base] = process.argv.slice(2);
if (!base) {
  console.error("usage: build-chart-pack.mjs <base-url>");
  process.exit(1);
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const name of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
    try {
      return require(name);
    } catch {}
  }
  throw new Error("Playwright not found. Install it (npx playwright install chromium) or set PLAYWRIGHT_MODULE.");
}

// The root layout's skip link and site-reference footer are page chrome, not chart.
const PRINT_CSS = `
  @page { size: Letter; margin: 0.5in 0.55in 0.6in; }
  .skip-link, nav[aria-label="Site reference"] { display: none !important; }
  html, body { background: #ffffff !important; }
  * { animation: none !important; transition: none !important; }
`;

await mkdir(dirname(OUT), { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
const url = new URL("/plan/chart-pack", base).toString();
const response = await page.goto(url, { waitUntil: "networkidle" });
if (!response || !response.ok()) throw new Error(`${url} returned ${response?.status()}`);
await page.addStyleTag({ content: PRINT_CSS });
await page.emulateMedia({ media: "print" });
await page.pdf({ path: OUT, printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`pdf ${OUT}`);
