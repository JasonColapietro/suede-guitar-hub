import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";

import {
  CROSS_DOMAIN_PROPOSAL,
  QUERY_OWNERSHIP,
  type OwnedPage,
} from "../lib/query-ownership.ts";
import { LEARN, SITEMAP_ENTRIES, SITE_URL } from "../lib/site.ts";
import nextConfig from "../next.config.ts";

register("./component-render-hooks.mjs", import.meta.url);

/**
 * Every page named in the register, rendered once. The register is the list of
 * pages that were competing, so rendering exactly that list is what ties the
 * decisions to output rather than to source text that might not reach the page.
 */
const HREFS = [
  ...new Set(QUERY_OWNERSHIP.flatMap((cluster) => cluster.pages.map((page) => page.href))),
];

const rendered = new Map<string, { markup: string; metadata: Metadata }>();
for (const href of HREFS) {
  const page = await import(`../app${href}/page.tsx`);
  rendered.set(href, {
    markup: renderToStaticMarkup(createElement(page.default)),
    metadata: page.metadata as Metadata,
  });
}

/** The rendered markup, with tags removed, so a sentence split across elements
 * by JSX whitespace is still one sentence to match against. */
function text(href: string): string {
  const entry = rendered.get(href);
  assert.ok(entry, `${href} must render`);
  return entry.markup
    .replace(/<[^>]*>/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function description(href: string): string {
  const entry = rendered.get(href);
  assert.ok(entry, `${href} must render`);
  const value = entry.metadata?.description;
  assert.equal(typeof value, "string", `${href} must export a metadata description`);
  return String(value);
}

function title(href: string): string {
  const entry = rendered.get(href);
  assert.ok(entry, `${href} must render`);
  const value = entry.metadata?.title;
  assert.equal(typeof value, "string", `${href} must export a plain metadata title`);
  return String(value);
}

test("every page in the register still exists, renders and is published", () => {
  const published = new Set(SITEMAP_ENTRIES.map((entry) => entry.href));

  for (const href of HREFS) {
    assert.ok(text(href).length > 1000, `${href} must render real content`);
    assert.ok(
      published.has(href),
      `${href} carries a recorded decision but is not in the route registry, so it is ` +
        `either orphaned or missing from the sitemap`,
    );
  }
});

test("every differentiated page prints the scope line recorded for it", () => {
  for (const cluster of QUERY_OWNERSHIP) {
    if (cluster.decision !== "differentiate") continue;

    for (const page of cluster.pages) {
      const body = text(page.href);
      assert.ok(
        body.includes(page.scopeLine),
        `${page.href} must tell a reader which question it answers. The register records ` +
          `"${page.scopeLine}" and the rendered page does not contain it.`,
      );
    }
  }
});

test("every differentiated page links to the sibling it handed the other half to", () => {
  for (const cluster of QUERY_OWNERSHIP) {
    if (cluster.decision !== "differentiate") continue;

    for (const page of cluster.pages) {
      const markup = rendered.get(page.href)!.markup;

      // Asserted against the page's own source as well as its output, because
      // `components/Article.tsx` ends every guide with a hard-coded link to
      // /breakthrough. A rendered-markup check alone therefore passes for the
      // 30-day cluster no matter what the page says, which was measured rather
      // than assumed: deleting the authored link left this test green.
      const source = readFileSync(new URL(`../app${page.href}/page.tsx`, import.meta.url), "utf8");

      for (const sibling of cluster.pages) {
        if (sibling.href === page.href) continue;
        assert.match(
          source,
          new RegExp(`href="${sibling.href}"`),
          `${page.href} sends a reader to ${sibling.href} for the other question, so it has ` +
            `to link there in its own copy`,
        );
        assert.match(
          markup,
          new RegExp(`href="${sibling.href}"`),
          `${page.href} must render its link to ${sibling.href}`,
        );
      }
    }
  }
});

test("a differentiated pair carries titles and descriptions that are not interchangeable", () => {
  for (const cluster of QUERY_OWNERSHIP) {
    for (const page of cluster.pages) {
      assert.ok(
        description(page.href).includes(page.descriptionMark),
        `${page.href} must carry "${page.descriptionMark}" in its description`,
      );

      for (const sibling of cluster.pages) {
        if (sibling.href === page.href) continue;

        assert.notEqual(
          title(page.href),
          title(sibling.href),
          `${page.href} and ${sibling.href} must not share a title`,
        );
        assert.notEqual(
          description(page.href),
          description(sibling.href),
          `${page.href} and ${sibling.href} must not share a description`,
        );
        assert.ok(
          !description(sibling.href).includes(page.descriptionMark),
          `"${page.descriptionMark}" is what separates ${page.href} from ${sibling.href}, so ` +
            `${sibling.href} must not also claim it`,
        );
      }
    }
  }
});

test("a page that handed a question over no longer answers it", () => {
  const handed = QUERY_OWNERSHIP.flatMap((cluster) =>
    cluster.pages.flatMap((page: OwnedPage) =>
      (page.handedOver ?? []).map((phrase) => ({ href: page.href, phrase })),
    ),
  );

  // The register would pass this test vacuously if nothing were recorded as
  // handed over, and a differentiation where no page gave anything up is the
  // keyword shuffle this file exists to catch.
  assert.ok(handed.length >= 3, "at least three pages must have given something up");

  for (const { href, phrase } of handed) {
    assert.ok(
      !text(href).includes(phrase),
      `${href} is recorded as having handed "${phrase}" to its sibling and still prints it`,
    );
  }
});

test("a consolidated URL keeps answering through a permanent redirect", async () => {
  const consolidations = QUERY_OWNERSHIP.filter((cluster) => cluster.decision === "consolidate");
  const redirects = (await nextConfig.redirects?.()) ?? [];

  for (const cluster of consolidations) {
    assert.ok(cluster.retired, `${cluster.id} consolidates, so it must name the retired URL`);
    const retired = cluster.retired!;

    // A consolidation that leaves the page in the registry publishes a sitemap
    // entry that redirects, which is worse than the competition it was fixing.
    assert.ok(
      !SITEMAP_ENTRIES.some((entry) => entry.href === retired),
      `${retired} redirects, so it must not be in the route registry`,
    );

    const redirect = redirects.find((entry) => entry.source === retired);
    assert.ok(redirect, `${retired} must carry a redirect in next.config.ts`);
    assert.equal(redirect!.permanent, true, `${retired} must be a 308`);
    assert.equal(
      redirect!.destination,
      cluster.pages[0].href,
      `${retired} must land on the page that won the query`,
    );
  }
});

test("the cross-domain proposal is recorded, argued, and not enacted", () => {
  assert.equal(CROSS_DOMAIN_PROPOSAL.decidedBy, null, "nobody has settled this yet");
  assert.ok(CROSS_DOMAIN_PROPOSAL.options.length >= 3, "a proposal with one option is a decision");
  for (const option of CROSS_DOMAIN_PROPOSAL.options) {
    assert.ok(option.upside.length > 40, `${option.name} needs a real upside`);
    assert.ok(option.downside.length > 40, `${option.name} needs a real downside`);
  }
  assert.match(
    CROSS_DOMAIN_PROPOSAL.recommendation,
    /option/,
    "the recommendation must name which option it recommends",
  );

  // The proposal discusses moving the voice curriculum. Until a human settles
  // it, the voice track stays exactly where it is: registered, published and
  // reachable. This is the assertion that stops the proposal being read as
  // permission.
  const voice = LEARN.find((entry) => entry.href === "/learn/voice");
  assert.ok(voice, "/learn/voice must stay in the route registry");
  assert.ok(
    SITEMAP_ENTRIES.some((entry) => entry.href === "/learn/voice"),
    "/learn/voice must stay in the sitemap",
  );
  assert.equal(`${SITE_URL}/learn/voice`, "https://guitarhub.org/learn/voice");
});
