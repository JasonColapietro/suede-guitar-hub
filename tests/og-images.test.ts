import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { DRILLS } from "../lib/advanced/drills.ts";
import { OG_ROUTES, cardFor, drillCard } from "../lib/og-cards.ts";
import { OG_IMAGE } from "../lib/site.ts";

/** The `app/` directory that renders a route. `/learn/guitar` is the dynamic track segment. */
function routeDir(href: string): string {
  return href === "/learn/guitar" ? "app/learn/[track]" : `app${href}`;
}

function read(relative: string): string {
  const file = new URL(`../${relative}`, import.meta.url);
  assert.equal(existsSync(file), true, `${relative} must exist`);
  return readFileSync(file, "utf8");
}

test("every covered route ships its own Open Graph and X card files", () => {
  for (const href of [...OG_ROUTES, "/advanced/[drillId]"]) {
    const dir = routeDir(href);
    read(`${dir}/opengraph-image.tsx`);
    assert.match(
      read(`${dir}/twitter-image.tsx`),
      /from "\.\/opengraph-image"/,
      `${dir}/twitter-image.tsx should reuse the Open Graph card`,
    );
  }
});

test("a page with its own card leaves `images` unset so Next attaches it", () => {
  // Next only attaches a colocated opengraph-image / twitter-image when the
  // page's `openGraph` / `twitter` block has no `images` key, so a stray
  // `images: [OG_IMAGE]` would silently put the home card back.
  for (const href of [...OG_ROUTES, "/advanced/[drillId]"]) {
    const source = read(`${routeDir(href)}/page.tsx`);
    assert.doesNotMatch(source, /\bimages:\s*\[/, `${href} must not set openGraph/twitter images`);
    assert.doesNotMatch(source, /OG_IMAGE/, `${href} must not reference the home card`);
    assert.doesNotMatch(
      source,
      /guitarhub\.org\/opengraph-image|\$\{SITE_URL\}\/opengraph-image/,
      `${href} structured data must name the page's own card`,
    );
  }
});

test("every card has its own, specific alt text", () => {
  const alts = [
    ...OG_ROUTES.map((href) => cardFor(href).alt),
    ...DRILLS.map((drill) => drillCard(drill).alt),
  ];
  assert.equal(new Set(alts).size, alts.length, "alt text must differ per route");
  for (const alt of alts) {
    assert.notEqual(alt, OG_IMAGE.alt);
    assert.match(alt, /card from GuitarHub\./);
  }
});

test("cards read their titles from the route registry and drill data", () => {
  assert.equal(cardFor("/tempo").title, "Tempo ladder builder");
  const drill = DRILLS[0];
  assert.equal(drillCard(drill).title, drill.title);
  assert.equal(drillCard(drill).subtitle, drill.summary);
  assert.throws(() => cardFor("/not-a-route"), /register the route/);
});

test("share cards keep the house copy rule", () => {
  const banned = /honest (limits|caveats)|not the first choice|not a fit|what it is not|what it does not do|what we will not promise|no revenue promises/i;
  for (const href of OG_ROUTES) {
    const { eyebrow, title, subtitle, alt } = cardFor(href);
    for (const text of [eyebrow, title, subtitle ?? "", alt]) {
      assert.doesNotMatch(text, banned, `${href} card copy: ${text}`);
    }
  }
});
