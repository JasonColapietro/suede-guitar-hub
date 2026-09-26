#!/usr/bin/env node
// Prints every Field Guide PDF from a running build of the site.
//
//   npm run build && npx next start -p 3400
//   node --experimental-strip-types scripts/field-guide-art/build-pdfs.mjs http://localhost:3400 [slug...]
//
// Each PDF is the web guide as printed by Chromium, with the cover as a
// full-bleed first page and the site chrome (nav, footer, calls to action)
// hidden. Render the covers first (render-covers.mjs): the cover page reads
// the WebP straight from public/.

import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FIELD_GUIDES, fieldGuideCover, fieldGuidePdf } from "../../lib/field-guides.ts";
import { SITE_URL } from "../../lib/site.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");

const [base, ...slugs] = process.argv.slice(2);
if (!base) {
  console.error("usage: build-pdfs.mjs <base-url> [slug...]");
  process.exit(1);
}
const only = new Set(slugs);

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const name of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
    try {
      return require(name);
    } catch {}
  }
  throw new Error("Playwright not found. Install it (npx playwright install chromium) or set PLAYWRIGHT_MODULE.");
}

const PRINT_CSS = `
  @page { size: Letter; margin: 0.6in 0.55in 0.7in; }
  @page :first { margin: 0; }
  header.sticky, footer, nav[aria-label="Breadcrumb"], [data-print="hide"], [data-field-guide-download] { display: none !important; }
  * { animation: none !important; transition: none !important; }
  [style*="opacity"], .reveal, [data-reveal] { opacity: 1 !important; transform: none !important; }
  html, body, main, article { background: #ffffff !important; }
  h2, h3 { break-after: avoid; }
  p, li, blockquote, figure { break-inside: avoid; }
  .fg-cover { width: 8.5in; height: 11in; break-after: page; overflow: hidden; background: #000; }
  .fg-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .fg-colophon { margin: 2.5rem auto 0; max-width: 42rem; padding: 1.25rem 1.5rem 0; border-top: 1px solid rgba(28,18,51,.15); font-size: 12px; color: rgba(28,18,51,.7); }
`;

await mkdir(join(ROOT, "public/field-guides"), { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });

for (const guide of FIELD_GUIDES.filter((g) => !only.size || only.has(g.slug))) {
  const url = new URL(guide.href, base).toString();
  const response = await page.goto(url, { waitUntil: "networkidle" });
  if (!response || !response.ok()) throw new Error(`${url} returned ${response?.status()}`);
  const cover = await readFile(join(ROOT, "public", fieldGuideCover(guide)));
  const issue = String(guide.issue).padStart(2, "0");
  await page.addStyleTag({ content: PRINT_CSS });
  await page.evaluate(
    ({ coverSrc, colophon, origin, site }) => {
      // Links in the PDF must reach the live site, not the build it was printed from.
      for (const a of document.querySelectorAll("a[href]")) {
        const url = new URL(a.getAttribute("href"), location.href);
        if (url.origin === origin) a.setAttribute("href", site + url.pathname + url.search + url.hash);
      }
      const wrap = document.createElement("div");
      wrap.className = "fg-cover";
      const img = document.createElement("img");
      img.src = coverSrc;
      img.alt = "";
      wrap.appendChild(img);
      document.body.prepend(wrap);
      const note = document.createElement("p");
      note.className = "fg-colophon";
      note.textContent = colophon;
      (document.querySelector("article") || document.body).appendChild(note);
    },
    {
      coverSrc: `data:image/webp;base64,${cover.toString("base64")}`,
      origin: new URL(base).origin,
      site: SITE_URL,
      colophon: `GuitarHub Field Guide No. ${issue}. The latest version of this guide, with its tools and links, lives at guitarhub.org${guide.href}.`,
    },
  );
  await page.evaluate(() => Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))));
  await page.emulateMedia({ media: "print" });
  const out = join(ROOT, "public", fieldGuidePdf(guide));
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
  console.log(`pdf ${issue} ${guide.slug}`);
}

await browser.close();
