import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as llmsTxt } from "../app/llms.txt/route.ts";
import { HUBS, LEARN, SITE_URL } from "../lib/site.ts";

// The 2026-10-18 estate audit found llms.txt named the Advanced Lab, the A-to-D
// routine and the glossary without giving their URLs, and listed none of the
// index pages (/learn, /start, /advanced, /tools, /guides, /glossary) that a
// reader or an answer engine would start from.
test("llms.txt lists every learning path and index page by URL", async () => {
  const body = await (await llmsTxt()).text();
  assert.match(body, /^## Where to start$/m);
  for (const entry of [...LEARN, ...HUBS]) {
    assert.ok(body.includes(`${SITE_URL}${entry.href}\n`), `${entry.href} is missing from llms.txt`);
  }
});
