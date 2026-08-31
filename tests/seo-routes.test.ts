import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  GUIDES,
  HOME,
  TOOLS,
  SITE_URL as REGISTRY_SITE_URL,
} from "../lib/site.ts";

const SITE_URL = "https://guitarhub.org";

test("publishes indexable robots metadata with the canonical sitemap", async () => {
  assert.equal(
    existsSync(new URL("../app/robots.ts", import.meta.url)),
    true,
    "app/robots.ts must exist",
  );

  const { default: robots } = await import("../app/robots.ts");
  const result = robots();

  assert.equal(result.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.equal(result.host, SITE_URL);

  // Asserted by intent rather than exact shape. The previous deep-equal pinned
  // the rules array to a single wildcard entry, so adding a named agent — the
  // thing this file exists to allow — failed the test for doing its job.
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

  const wildcard = rules.find((rule) => rule.userAgent === "*");
  assert.ok(wildcard, "the wildcard rule must survive");
  assert.equal(wildcard.allow, "/");
  assert.deepEqual(wildcard.disallow, ["/api/"]);

  // Every rule must keep /api/ private; a named agent that skipped the
  // disallow would quietly expose the API to exactly the crawlers we invite.
  for (const rule of rules) {
    assert.equal(rule.allow, "/", `${rule.userAgent} must allow /`);
    assert.deepEqual(
      rule.disallow,
      ["/api/"],
      `${rule.userAgent} must still disallow /api/`,
    );
  }

  // The answer engines that actually drive citation, named explicitly.
  const named = new Set(rules.map((rule) => rule.userAgent));
  for (const agent of [
    "Googlebot",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "OAI-SearchBot",
    "Applebot",
  ]) {
    assert.ok(named.has(agent), `robots.ts must name ${agent}`);
  }
});

test("publishes every canonical indexable page in the sitemap", async () => {
  assert.equal(
    existsSync(new URL("../app/sitemap.ts", import.meta.url)),
    true,
    "app/sitemap.ts must exist",
  );

  // The canonical origin is pinned as a literal above rather than imported, so
  // that an accidental edit to the registry is caught here instead of being
  // silently agreed with by every assertion below.
  assert.equal(REGISTRY_SITE_URL, SITE_URL, "lib/site.ts must hold the canonical origin");

  const { default: sitemap } = await import("../app/sitemap.ts");
  const entries = sitemap();
  const urls = entries.map((entry) => String(entry.url));

  // Checked against the route registry rather than a hand-typed list. The
  // previous version pinned exactly two URLs, which was true when the site was
  // two pages; every page added after that failed a test named for publishing
  // them. Deriving the expectation from `lib/site.ts` means a page added to the
  // registry keeps this green, while a sitemap entry with no page behind it
  // still fails — see the disk check below.
  for (const entry of [HOME, ...TOOLS, ...GUIDES]) {
    assert.ok(
      urls.includes(entry.href === "/" ? SITE_URL : `${SITE_URL}${entry.href}`),
      `${entry.href} is in the route registry but missing from the sitemap`,
    );
  }

  // The failure this file exists to prevent, named in app/sitemap.ts's own
  // header comment: a sitemap that advertises a 404. Every URL emitted has to
  // have a page.tsx behind it.
  for (const url of urls) {
    const path = url.slice(SITE_URL.length);
    const page = path === "" ? "../app/page.tsx" : `../app${path}/page.tsx`;
    assert.equal(
      existsSync(new URL(page, import.meta.url)),
      true,
      `${url} is in the sitemap but app${path}/page.tsx does not exist`,
    );
  }

  assert.equal(
    new Set(urls).size,
    urls.length,
    "no page may be listed in the sitemap twice",
  );

  for (const url of urls) {
    assert.ok(url.startsWith(SITE_URL), `${url} must be absolute on ${SITE_URL}`);
    assert.ok(
      url === SITE_URL || !url.endsWith("/"),
      `${url} must not carry a trailing slash`,
    );
  }

  // The home page is the site's most important URL, so it leads the file.
  assert.equal(urls[0], SITE_URL, "the home page must be the first entry");

  for (const entry of entries) {
    assert.ok(
      entry.lastModified instanceof Date &&
        !Number.isNaN(entry.lastModified.getTime()),
      `${entry.url} must carry a real lastModified date`,
    );
    assert.ok(
      typeof entry.priority === "number" && entry.priority > 0 && entry.priority <= 1,
      `${entry.url} must carry a priority inside (0, 1]`,
    );
    assert.ok(entry.changeFrequency, `${entry.url} must carry a changeFrequency`);
  }
});

test("gives every registered tool a full tools-hub card and routing row", () => {
  const source = readFileSync(
    new URL("../app/tools/page.tsx", import.meta.url),
    "utf8",
  );
  const details = source.match(
    /const TOOL_DETAILS:[\s\S]*?\n};/,
  )?.[0];
  const routing = source.match(
    /const ROUTING:[\s\S]*?\n];/,
  )?.[0];

  assert.ok(details, "app/tools/page.tsx must define TOOL_DETAILS");
  assert.ok(routing, "app/tools/page.tsx must define ROUTING");

  for (const tool of TOOLS) {
    const escapedHref = tool.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    assert.match(
      details,
      new RegExp(`"${escapedHref}"\\s*:`),
      `${tool.href} needs the full what-it-does and who-it-helps card copy`,
    );
    assert.match(
      routing,
      new RegExp(`href:\\s*"${escapedHref}"`),
      `${tool.href} needs a place in the method-stage routing table`,
    );
  }
});
