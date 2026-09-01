import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { RESOURCES, STRUMLY } from "../lib/site.ts";

const FIELD_GUIDES = [
  "/resources/print-the-quiet",
  "/resources/how-to-practice-clean-guitar-tone",
  "/resources/jeff-buckley-hallelujah-guitar-tone",
  "/resources/recording-guitar-room-sound",
] as const;

function pageSource(href: string): string {
  const file = new URL(`../app${href}/page.tsx`, import.meta.url);
  assert.equal(existsSync(file), true, `${href} must render a page`);
  return readFileSync(file, "utf8");
}

test("registers every Print the Quiet field guide for sitemap and footer discovery", () => {
  const registered = new Set(RESOURCES.map((entry) => entry.href));

  for (const href of FIELD_GUIDES) {
    assert.ok(registered.has(href), `${href} must be registered as a resource`);
  }
});

test("publishes unique canonicals, article metadata and visible source provenance", () => {
  for (const href of FIELD_GUIDES) {
    const source = pageSource(href);

    assert.match(source, new RegExp(`\\$\\{SITE_URL\\}${href}`));
    assert.match(source, /alternates: \{ canonical: CANONICAL \}/);
    assert.match(source, /authors: \[\{ name: "Jason Colapietro"/);
    assert.match(source, /images: \[OG_IMAGE\]/);
    assert.match(source, /application\/ld\+json/);
    assert.match(
      source,
      /STRUMLY\.printTheQuiet/,
      `${href} must disclose and link its source series`,
    );
  }
});

test("keeps the adaptations human-first and free of em dashes", () => {
  for (const href of FIELD_GUIDES) {
    const source = pageSource(href);

    assert.doesNotMatch(
      source,
      /—/,
      `${href} should use punctuation that survives the house copy pass`,
    );
    assert.doesNotMatch(
      source,
      /keywords\s*:/,
      `${href} should not ship a keyword-stuffing metadata field`,
    );
  }
});

test("points source links at the verified public Strumly series", () => {
  assert.equal(
    STRUMLY.printTheQuiet,
    "https://strumly.suedeai.ai/book/print-the-quiet",
  );

  for (const href of Object.values(STRUMLY.printTheQuietEssays)) {
    assert.ok(
      href.startsWith(`${STRUMLY.printTheQuiet}/ptq-`),
      `${href} must remain inside the verified public series`,
    );
  }
});
