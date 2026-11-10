import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FIELD_GUIDES, fieldGuideCover, fieldGuidePdf } from "../lib/field-guides.ts";
import { GUIDES, RESOURCES } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { FieldGuideDownload, FieldGuideShelf } = await import("../components/FieldGuides.tsx");

const publicFile = (path: string) => new URL(`../public${path}`, import.meta.url);

test("every field guide points at a registered guide page", () => {
  const registered = new Set([...GUIDES, ...RESOURCES].map((entry) => entry.href));
  for (const guide of FIELD_GUIDES) {
    assert.ok(registered.has(guide.href), `${guide.slug} points at ${guide.href}, which the registry does not know`);
  }
});

test("issue numbers, slugs and hrefs are unique", () => {
  for (const key of ["issue", "slug", "href"] as const) {
    const values = FIELD_GUIDES.map((guide) => guide[key]);
    assert.equal(new Set(values).size, values.length, `duplicate field guide ${key}`);
  }
});

test("every field guide ships its cover and its PDF", () => {
  for (const guide of FIELD_GUIDES) {
    const cover = publicFile(fieldGuideCover(guide));
    const pdf = publicFile(fieldGuidePdf(guide));
    assert.ok(existsSync(cover), `missing cover ${fieldGuideCover(guide)}; run scripts/field-guide-art/render-covers.mjs`);
    assert.ok(existsSync(pdf), `missing PDF ${fieldGuidePdf(guide)}; run scripts/field-guide-art/build-pdfs.mjs`);
    assert.equal(readFileSync(pdf).subarray(0, 5).toString(), "%PDF-", `${fieldGuidePdf(guide)} is not a PDF`);
    assert.ok(statSync(pdf).size < 3_000_000, `${fieldGuidePdf(guide)} is over 3 MB`);
  }
});

test("every guide page offers its own PDF", () => {
  for (const guide of FIELD_GUIDES) {
    const source = readFileSync(new URL(`../app${guide.href}/page.tsx`, import.meta.url), "utf8");
    assert.ok(source.includes(`guideHref="${guide.href}"`), `${guide.href} must pass guideHref="${guide.href}" to Article`);
  }
});

test("the guide-page download card asks for an email before the PDF", () => {
  for (const guide of FIELD_GUIDES) {
    const markup = renderToStaticMarkup(createElement(FieldGuideDownload, { href: guide.href }));
    assert.ok(markup.includes("data-field-guide-download"), `${guide.href} renders its download card`);
    assert.doesNotMatch(markup, /\.pdf"/, `${guide.href} links its PDF only after the email`);
  }
});

test("every shelf cover opens the email form for its own guide", () => {
  const markup = renderToStaticMarkup(createElement(FieldGuideShelf, {}));
  assert.equal((markup.match(/data-guide-gate=/g) ?? []).length, FIELD_GUIDES.length);
  for (const guide of FIELD_GUIDES) assert.ok(markup.includes(`data-guide-gate="${guide.slug}"`), `${guide.slug} has its own gate`);
});

test("the chart pack email 1 links is a real PDF under 3 MB", () => {
  const pdf = publicFile("/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf");
  assert.ok(existsSync(pdf), "missing chart pack; run scripts/field-guide-art/build-chart-pack.mjs");
  assert.equal(readFileSync(pdf).subarray(0, 5).toString(), "%PDF-");
  assert.ok(statSync(pdf).size < 3_000_000);
});
