import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildLlmsFull, decodeEntities, mainToMarkdown } from "../lib/llms-full.ts";
import { pageJsonLd, webPageNode } from "../lib/page-schema.ts";
import { GUIDES, SITE_URL, TOOLS } from "../lib/site.ts";

const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

test("entities decode and markup converts to Markdown with absolute links", () => {
  assert.equal(decodeEntities("Rock &amp; roll &#x27;n&#39; &rarr;"), "Rock & roll 'n' →");
  const markdown = mainToMarkdown(
    '<nav>skip me</nav><main><h1>Title</h1><p>Read <a href="/method">the method</a> <strong>first</strong>.</p>' +
      '<ul><li>One</li><li>Two</li></ul><section data-print="hide"><p>Related cards</p></section>' +
      '<form><p>Apply</p></form></main>',
    { origin: SITE_URL },
  );
  assert.equal(markdown, `## Title\n\nRead [the method](${SITE_URL}/method) **first**.\n\n- One\n- Two`);
});

test("each section is headed by the page H1 and cites its URL", () => {
  const out = buildLlmsFull({
    title: "T",
    summary: "S",
    intro: [],
    origin: SITE_URL,
    pages: [{ url: `${SITE_URL}/x`, html: "<main><p>Eyebrow</p><h1>Heading</h1><p>Body</p></main>" }],
  });
  assert.equal(out, `# T\n\n> S\n\n## Heading\n\nSource: ${SITE_URL}/x\n\nEyebrow\n\nBody\n`);
});

test("public/llms-full.txt is current with the rendered pages", () => {
  // Fails when page copy changes without regenerating: run npm run llms:full.
  execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "--import",
      "./tests/register-aliases.mjs",
      "scripts/build-llms-full.mts",
      "--check",
    ],
    { stdio: "pipe" },
  );
  const body = read("public/llms-full.txt");
  assert.ok(body.startsWith("# GuitarHub: full text\n"));
  assert.ok(Buffer.byteLength(body) < 500_000, "llms-full.txt must stay under 500 KB");
  for (const entry of [...GUIDES, ...TOOLS]) {
    assert.ok(body.includes(`Source: ${SITE_URL}${entry.href}\n`), `${entry.href} is missing from llms-full.txt`);
  }
  assert.doesNotMatch(body, /<[a-z][a-z0-9]*[\s>]/i, "no HTML tags survive the conversion");
  assert.match(read("app/llms.txt/route.ts"), /https:\/\/guitarhub\.org\/llms-full\.txt/);
});

test("page nodes reference the shared site and publisher by @id", () => {
  const node = webPageNode({ canonical: `${SITE_URL}/tempo`, name: "Tempo", description: "D", mainEntity: `${SITE_URL}/tempo#tool`, crumbs: [{ name: "GuitarHub", href: "/" }, { name: "Tempo", href: "/tempo" }] });
  assert.deepEqual(node.isPartOf, { "@id": `${SITE_URL}/#website` });
  assert.deepEqual(node.publisher, { "@id": "https://suedeai.ai/#organization" });
  assert.deepEqual(node.mainEntity, { "@id": `${SITE_URL}/tempo#tool` });
  assert.deepEqual(node.breadcrumb, { "@id": `${SITE_URL}/tempo#breadcrumb` });
  const doc = pageJsonLd({ canonical: `${SITE_URL}/tempo`, name: "Tempo", description: "D", crumbs: [{ name: "GuitarHub", href: "/" }, { name: "Tempo", href: "/tempo" }] });
  assert.deepEqual(doc["@graph"].map((item) => item["@type"]), ["WebPage", "BreadcrumbList"]);
  const withoutTrail = pageJsonLd({ canonical: `${SITE_URL}/tempo`, name: "Tempo", description: "D", crumbs: [], breadcrumbs: false });
  assert.deepEqual(withoutTrail["@graph"].map((item) => item["@type"]), ["WebPage"]);
});

test("the IndexNow key file is served from public/ with the bare key", () => {
  const key = "4c265a375effa42521f5b88bb3c28501";
  assert.equal(read(`public/${key}.txt`), key);
});

test("the AI Instructions page links the full-text reference and names its page", () => {
  const guide = read("public/ai-instructions.html");
  assert.match(guide, /href="\/llms-full\.txt"/);
  const description = guide.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? "";
  assert.ok(description.length >= 120 && description.length <= 160, `description is ${description.length} characters`);
  const ld = JSON.parse(guide.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? "{}");
  assert.deepEqual(ld["@graph"].map((node: { "@type": string }) => node["@type"]), ["WebPage", "BreadcrumbList"]);
});
