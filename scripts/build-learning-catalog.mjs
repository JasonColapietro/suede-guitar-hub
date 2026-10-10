#!/usr/bin/env node
// Writes the browser's slim learning catalog and the lazily loaded guitar
// lesson search index, both derived from the curriculum JSON in
// lib/learning/data. Run after syncing the native curriculum:
//   npm run learning:catalog            (write)
//   npm run learning:catalog -- --check (verify only)
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { buildLearningCatalog, buildLessonSearchIndex } from "../lib/learning/catalog-build.ts";

const check = process.argv.includes("--check");
for (const [destination, value] of [
  ["lib/learning/data/catalog.json", buildLearningCatalog()],
  ["lib/learning/data/lesson-search-guitar.json", buildLessonSearchIndex()],
]) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  if (check) assert.deepEqual(await readFile(destination), bytes, `${destination}: stale; run npm run learning:catalog`);
  else await writeFile(destination, bytes);
  process.stdout.write(`${check ? "Verified" : "Wrote"} ${destination} (${bytes.length} bytes)\n`);
}
