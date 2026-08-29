import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

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

  const { default: sitemap } = await import("../app/sitemap.ts");
  assert.deepEqual(
    sitemap().map((entry) => entry.url),
    [SITE_URL, `${SITE_URL}/breakthrough`],
  );
});
