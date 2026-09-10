import assert from "node:assert/strict";
import test from "node:test";

import nextConfig, { LEGACY_SOCIAL_ORIGIN, LEGACY_SOCIAL_REDIRECTS } from "../next.config.ts";

const LIVE_ROUTES = ["/", "/learn", "/learn/guitar", "/guides", "/practice", "/breakthrough", "/method", "/about"];

test("the stale Suede Social URLs Google indexed under guitarhub.org redirect permanently to their live twins", async () => {
  const redirects = await nextConfig.redirects?.();
  assert.ok(redirects, "next.config must declare redirects()");
  assert.deepEqual(redirects, [...LEGACY_SOCIAL_REDIRECTS]);
  for (const redirect of redirects) {
    assert.equal(redirect.permanent, true, `${redirect.source} must be a 308, not a temporary redirect`);
    assert.ok(redirect.destination.startsWith(`${LEGACY_SOCIAL_ORIGIN}/`), `${redirect.source} must land on social.suedeai.ai`);
  }
  const sources = redirects.map((redirect) => redirect.source);
  assert.deepEqual(sources, ["/discover", "/articles", "/article/:slug*"]);
});

test("no live GuitarHub route is shadowed by a legacy redirect", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const staticSources = redirects.map((redirect) => redirect.source.replace(/\/:slug\*$/, ""));
  for (const route of LIVE_ROUTES) {
    for (const source of staticSources) {
      assert.notEqual(route, source, `${route} is a live page and must not redirect`);
      assert.ok(!route.startsWith(`${source}/`), `${route} sits under a redirected prefix ${source}`);
    }
  }
});
