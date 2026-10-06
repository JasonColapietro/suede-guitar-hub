import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const pdfs = (await readdir("private/field-guides")).filter(file => file.endsWith(".pdf"));
assert.ok(pdfs.length > 0, "Private PDF assets must exist");
assert.equal((await readdir("public/field-guides")).filter(file => file.endsWith(".pdf")).length, 0,
  "A public PDF would bypass the account download route");
for (const route of ["account/downloads/[filename]", "field-guides/[filename]"]) {
  const tracePath = path.resolve(`.next/server/app/${route}/route.js.nft.json`);
  const trace = JSON.parse(await readFile(tracePath, "utf8"));
  const bundled = new Set(trace.files.map(file => path.resolve(path.dirname(tracePath), file)));
  for (const file of pdfs) {
    assert.ok(bundled.has(path.resolve("private/field-guides", file)), `${route}: missing ${file}`);
  }
}
console.log(`Both authenticated download routes include all ${pdfs.length} server PDF assets; none are public static files.`);
