import assert from "node:assert/strict";
import test from "node:test";
import { createFieldGuideDownload } from "../lib/field-guide-downloads.ts";
import { FIELD_GUIDES, fieldGuidePdf, fieldGuideFilename } from "../lib/field-guides.ts";

const guide = FIELD_GUIDES[0];
const filename = fieldGuideFilename(guide);
const request = (init?: RequestInit) => new Request(`https://guitarhub.org${fieldGuidePdf(guide)}`, init);
function harness(options: { enabled?: boolean; account?: boolean; outage?: boolean } = {}) {
  let reads = 0;
  const download = createFieldGuideDownload({
    enabled: () => options.enabled !== false,
    resolveAccount: async () => { if (options.outage) throw new Error("provider secret"); return options.account ? { user: { id: "verified" } } : null; },
    readPdf: async () => { reads++; return new TextEncoder().encode("%PDF-fixture"); },
  });
  return { download, reads: () => reads };
}

test("signed-out requests redirect to sign-in with the exact download and never read PDF bytes", async () => {
  const h = harness();
  for (const init of [undefined, { method: "HEAD" }, { headers: { range: "bytes=0-99", "if-none-match": "old-public-etag" } }]) {
    const response = await h.download(request(init), filename);
    assert.equal(response.status, 303);
    const target = new URL(response.headers.get("location")!);
    assert.equal(target.pathname, "/account");
    assert.equal(target.searchParams.get("next"), fieldGuidePdf(guide));
    assert.equal(await response.text(), "");
    assert.match(response.headers.get("cache-control")!, /private, no-store/);
  }
  assert.equal(h.reads(), 0);
});
test("disabled accounts and provider outages fail closed without leaking details", async () => {
  for (const options of [{ enabled: false }, { outage: true }]) {
    const h = harness(options);
    const response = await h.download(request(), filename);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /provider secret|%PDF/);
    assert.equal(h.reads(), 0);
  }
});
test("any verified free account receives an uncached attachment; no entitlement dependency", async () => {
  const h = harness({ account: true });
  const response = await h.download(request(), filename);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "%PDF-fixture");
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("content-disposition"), `attachment; filename="${filename}"`);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vary"), "Cookie, Authorization");
  assert.equal(response.headers.get("location"), null);
});
test("unknown and traversal names never reach file storage", async () => {
  const h = harness({ account: true });
  for (const name of ["../the-method.pdf", "%2e%2e%2fsecret", "unknown.pdf", "", filename + "/extra"]) {
    assert.equal((await h.download(request(), name)).status, 404);
  }
  assert.equal(h.reads(), 0);
});
test("a verified HEAD request carries no file body", async () => {
  const h = harness({ account: true });
  const response = await h.download(request({ method: "HEAD" }), filename);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.equal(h.reads(), 0);
});
