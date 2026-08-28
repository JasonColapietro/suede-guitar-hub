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
  assert.deepEqual(robots(), {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  });
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
