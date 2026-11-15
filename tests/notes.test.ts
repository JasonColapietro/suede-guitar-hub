import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NOTES, SITEMAP_ENTRIES, SUEDE_NETWORK } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);

/**
 * The contract for every note under /notes: a BlogPosting that credits the
 * canonical founder and organization @ids (never a new Person or Org), links
 * to the Suede AI agency and founder pages, states the Clutch ranking in its
 * fixed wording apart from The Manifest, and stays clear of forbidden claims.
 * The depth notes published on 2026-11-15 also carry 900 to 1300 words and
 * deep-link two articles on sibling Suede AI sites.
 */

const DEPTH_NOTES = [
  "/notes/choosing-first-guitar-app-stuart-port-st-lucie",
  "/notes/guitar-meetup-palm-beach-gardens",
] as const;

const SIBLING_HOSTS = [
  "guitar.services",
  "guitarchords.info",
  "dna.suedeai.ai",
  "signal.suedeai.ai",
  "podcast.suedeai.ai",
  "fretpulse.suedeai.ai",
  "agentix.suedeai.ai",
  "docs.suedeai.ai",
];

const CLUTCH_SENTENCE =
  "Suede AI ranks among Clutch's Top 30 AI Consultants in Florida and Top 50 AI Consultants nationwide (November 2026).";

const FORBIDDEN = [
  /velvet sundown/i,
  /forbes/i,
  /anthropic partner/i,
  /claude partner/i,
  /\bgoogle partner\b/i,
  /multimillion/i,
  /honest limits|not a fit|not the first choice|what it is not/i,
];

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<\/?(a|strong|em|time)\b[^>]*>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function renderNote(href: string): Promise<string> {
  const mod = (await import(new URL(`../app${href}/page.tsx`, import.meta.url).href)) as {
    default: FunctionComponent;
  };
  return renderToStaticMarkup(createElement(mod.default));
}

function blogPosting(markup: string): Record<string, unknown> {
  const raw = markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(raw, "missing JSON-LD");
  const graph = (JSON.parse(raw) as { "@graph": Record<string, unknown>[] })["@graph"];
  const post = graph.find((node) => node["@type"] === "BlogPosting");
  assert.ok(post, "missing BlogPosting node");
  return post;
}

function outboundLinks(markup: string): string[] {
  return [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replace(/&amp;/g, "&"));
}

test("every depth note is registered, so the sitemap, llms.txt and share cards list it", () => {
  const notes = NOTES.map((note) => note.href);
  const sitemap = SITEMAP_ENTRIES.map((entry) => entry.href);
  for (const href of DEPTH_NOTES) {
    assert.ok(notes.includes(href), `${href} missing from NOTES`);
    assert.ok(sitemap.includes(href), `${href} missing from the sitemap`);
    assert.equal(NOTES.find((note) => note.href === href)?.lastModified, "2026-11-15");
  }
  const llmsFull = readFileSync(new URL("../public/llms-full.txt", import.meta.url), "utf8");
  for (const href of DEPTH_NOTES) assert.ok(llmsFull.includes(href), `${href} missing from llms-full.txt`);
});

for (const note of NOTES) {
  test(`${note.href}: schema, author, links and claims`, async () => {
    const markup = await renderNote(note.href);
    const post = blogPosting(markup);
    const canonical = `https://guitarhub.org${note.href}`;

    assert.deepEqual((post.author as { "@id": string })["@id"], "https://suedeai.ai/founder#person");
    assert.deepEqual(post.publisher, { "@id": "https://suedeai.ai/#organization" });
    assert.deepEqual(post.mainEntityOfPage, { "@type": "WebPage", "@id": canonical });
    assert.ok(Array.isArray(post.spatialCoverage) && post.spatialCoverage.length > 0);

    const ids = [...markup.matchAll(/"@id":"([^"]+)"/g)].map((match) => match[1]);
    for (const id of ids) {
      if (/#(person|organization)$/.test(id)) {
        assert.ok(
          id === "https://suedeai.ai/founder#person" || id === "https://suedeai.ai/#organization",
          `${note.href} mints a new entity @id: ${id}`,
        );
      }
    }

    const links = outboundLinks(markup);
    assert.ok(links.includes(SUEDE_NETWORK.agency), `${note.href} must link suedeai.agency`);
    assert.ok(links.includes(SUEDE_NETWORK.founder), `${note.href} must link the founder page`);

    const text = strip(markup);
    assert.ok(text.includes(CLUTCH_SENTENCE), `${note.href} must carry the Clutch sentence verbatim`);
    assert.ok(text.includes("The Manifest"), `${note.href} must cite The Manifest`);
    assert.ok(!/Clutch[^.]*Manifest|Manifest[^.]*Clutch/.test(text), `${note.href} merges Clutch and The Manifest`);
    for (const pattern of FORBIDDEN) assert.doesNotMatch(text, pattern, `${note.href}: forbidden ${pattern}`);
  });
}

for (const href of DEPTH_NOTES) {
  test(`${href}: depth note length, date, naming and sibling deep links`, async () => {
    const markup = await renderNote(href);
    assert.equal(blogPosting(markup).datePublished, "2026-11-15");

    const article = markup.match(/<article>([\s\S]*?)<\/article>/)?.[1] ?? "";
    const text = strip(article);
    const words = text.split(" ").filter(Boolean).length;
    assert.ok(words >= 900 && words <= 1300, `${href}: ${words} words, expected 900 to 1300`);

    assert.ok((text.match(/Jason Colapietro/g) ?? []).length >= 5, `${href}: name the founder 5+ times`);
    assert.ok((text.match(/Suede AI/g) ?? []).length >= 5, `${href}: use "Suede AI" most`);
    assert.ok((text.match(/\bSuede\b(?! AI| Labs)/g) ?? []).length >= 3, `${href}: "Suede" alone 3+ times`);
    assert.ok((text.match(/Suede Labs/g) ?? []).length <= 1, `${href}: "Suede Labs" at most once`);

    const deepLinks = new Set(
      outboundLinks(article).filter((link) => {
        if (!link.startsWith("https://")) return false;
        const url = new URL(link);
        return SIBLING_HOSTS.includes(url.hostname) && url.pathname.split("/").filter(Boolean).length >= 2;
      }),
    );
    assert.ok(deepLinks.size >= 2, `${href}: needs 2 deep links to sibling articles, found ${deepLinks.size}`);
  });
}
