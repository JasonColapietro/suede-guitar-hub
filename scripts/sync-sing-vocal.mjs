#!/usr/bin/env node
/**
 * Vendors `contracts/suede-vocal.json` from JasonColapietro/sing.
 *
 * The sibling of `sync-native-learning.mjs` and `sync-native-practice-tools.mjs`,
 * with one difference that is the whole reason this file exists: those two read a
 * local iOS checkout, so they cannot run in CI, and their `--check` has therefore
 * never been executed by anything but a human who remembered. This contract's
 * reference is a public git repository, so the check can run on every pull
 * request — and a vendored contract nobody verifies is just a copy.
 *
 * Usage:
 *   node scripts/sync-sing-vocal.mjs             # fetch and write
 *   node scripts/sync-sing-vocal.mjs --check     # fetch and byte-compare only
 *   node scripts/sync-sing-vocal.mjs --sing=/abs/path/to/sing [--check]
 *
 * `--sing=` reads a local checkout instead of the network, for working offline
 * and for verifying against an unmerged branch before it lands. Without it the
 * source is the reference repository's default branch, which is the only thing a
 * vendored copy should ever track: a copy taken from a branch in flight is the
 * silent drift these contracts exist to prevent.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const FILE = "contracts/suede-vocal.json";
const REFERENCE = "JasonColapietro/sing";
const BRANCH = "main";
const URL = `https://raw.githubusercontent.com/${REFERENCE}/${BRANCH}/${FILE}`;
/** A blip should not fail a build, but a real outage must not pass as "verified". */
const ATTEMPTS = 3;

const check = process.argv.includes("--check");
const singRoot = process.argv
  .find((argument) => argument.startsWith("--sing="))
  ?.slice("--sing=".length);

async function fromNetwork() {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(URL, { headers: { accept: "application/vnd.github.raw" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await new Promise((done) => setTimeout(done, attempt * 1000));
    }
  }
  // Deliberately fatal. Reporting "verified" when the reference was unreachable
  // is the one outcome worse than failing: it is the absence of a check wearing
  // the result of one.
  throw new Error(
    `Could not read ${FILE} from ${REFERENCE}@${BRANCH} after ${ATTEMPTS} attempts ` +
      `(${lastError?.message ?? "unknown error"}). This is a fetch failure, not a drift failure — ` +
      `the vendored copy was not compared. Re-run, or pass --sing=/path/to/a/sing/checkout.`,
  );
}

const reference = singRoot ? await readFile(resolve(singRoot, FILE)) : await fromNetwork();
const source = singRoot ? `${singRoot}/${FILE}` : `${REFERENCE}@${BRANCH}`;

if (check) {
  let vendored;
  try {
    vendored = await readFile(FILE);
  } catch {
    throw new Error(`${FILE} is missing. Run: node scripts/sync-sing-vocal.mjs`);
  }
  assert.deepEqual(
    vendored,
    reference,
    `${FILE}: stale vendored contract. It no longer matches ${source}. ` +
      `Re-sync with: node scripts/sync-sing-vocal.mjs — and expect ` +
      `tests/suede-vocal-parity.test.ts to have something to say about the new values.`,
  );
} else {
  await writeFile(FILE, reference);
}

process.stdout.write(`${check ? "Verified" : "Synced"} ${FILE} against ${source}\n`);
