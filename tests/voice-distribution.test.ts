import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/learn/[track]/page.tsx", import.meta.url),
  "utf8",
);

test("voice learning metadata advertises the shipped curriculum instead of generic track copy", () => {
  assert.match(
    source,
    /Free Voice Lessons[^"`]*GuitarHub/,
    "the voice path needs a search-facing title that names free voice lessons",
  );
  assert.match(
    source,
    /21 free guided voice lessons/,
    "the metadata must expose the verified free lesson count",
  );
  assert.match(
    source,
    /102-lesson voice curriculum/,
    "the metadata must expose the shipped curriculum depth",
  );
  assert.doesNotMatch(
    source,
    /const description = `Follow the GuitarHub \$\{track\} curriculum[\s\S]*?Free first module/,
    "the track metadata must not keep the pre-launch one-module description",
  );
});
