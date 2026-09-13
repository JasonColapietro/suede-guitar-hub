#!/usr/bin/env node
/**
 * Vendors `contracts/glossary.json` from JasonColapietro/sing.
 *
 * The shared vocabulary of the two instruments Suede teaches. Sing authors it,
 * emits it as static JSON, and renders the voice and music entries with the
 * schema.org term markup. This repository vendors the whole set, renders only
 * the `guitar` entries, links the rest to sing's glossary anchors, and emits no
 * term markup for anything — see `lib/glossary.ts` and
 * `tests/glossary.test.ts`, which fails if that markup ever appears here.
 *
 * Usage:
 *   node scripts/sync-sing-glossary.mjs             # fetch and write
 *   node scripts/sync-sing-glossary.mjs --check     # fetch and byte-compare only
 *   node scripts/sync-sing-glossary.mjs --sing=/abs/path/to/sing [--check]
 *
 * Same rules as `sync-sing-vocal.mjs`: the network source is sing's default
 * branch and nothing else, a fetch failure is fatal rather than reported as
 * verified, and `--sing=` reads a local checkout for offline work.
 *
 * ## The provisional window, and how it closes
 *
 * This repository's half of the glossary was built before sing's emitter landed
 * on `main`, so `contracts/glossary.json` here starts as a provisional copy and
 * declares `"provisional": true` at its top level. While sing's default branch
 * 404s on the path, `--check` reports that state and passes — there is nothing
 * to compare against, and failing CI for a file that does not exist upstream
 * yet teaches people to ignore the check.
 *
 * That window closes by itself and cannot be left open:
 *
 *   - A 404 is only tolerated for a vendored copy that says it is provisional.
 *     A provisional marker is therefore a claim the script reads, not a comment.
 *   - Once sing publishes the file, the 404 stops happening and the byte
 *     comparison runs. The real contract will not carry `"provisional": true`,
 *     so a stale provisional copy fails the comparison on the first CI run after
 *     sing merges, which is exactly the prompt to re-sync.
 *   - A 404 against a copy that does NOT say it is provisional is fatal: that is
 *     a contract withdrawn upstream.
 *
 * Only `--check` tolerates the missing reference. A plain sync has nothing to
 * write and says so rather than truncating the provisional copy.
 */
import { readFile } from "node:fs/promises";
import { vendor, BRANCH, REFERENCE } from "./lib/vendor-sing-contract.mjs";

const FILE = "contracts/glossary.json";

/**
 * Whether the vendored copy declares itself a placeholder for the real one, or
 * is not there at all. The two are different failures and must read as such.
 */
async function vendoredState() {
  let text;
  try {
    text = await readFile(FILE, "utf8");
  } catch {
    return "missing";
  }
  try {
    return JSON.parse(text).provisional === true ? "provisional" : "final";
  } catch {
    return "unparseable";
  }
}

await vendor({
  file: FILE,
  resyncHint: "run: node scripts/sync-sing-glossary.mjs",
  async onReferenceMissing({ file, check }) {
    const state = await vendoredState();
    if (state === "missing") {
      throw new Error(
        `${file} is missing here, and ${REFERENCE}@${BRANCH} does not publish it either, so there ` +
          `is nothing to vendor and nothing to compare. The glossary surface reads this file.`,
      );
    }
    if (state !== "provisional") {
      throw new Error(
        `${REFERENCE}@${BRANCH} does not publish ${file}, and the vendored copy here does not ` +
          `declare "provisional": true${state === "unparseable" ? " (it is not valid JSON)" : ""}. ` +
          `Either the contract was withdrawn upstream — in which case the copy here is now ` +
          `unsourced and the glossary surface needs a decision — or the marker was removed from a ` +
          `copy that is still a placeholder.`,
      );
    }
    if (!check) {
      throw new Error(
        `${REFERENCE}@${BRANCH} does not publish ${file} yet, so there is nothing to sync. The ` +
          `vendored copy is the provisional one written in this repository; refusing to overwrite it ` +
          `with nothing. Re-run once sing's glossary emitter is on ${BRANCH}.`,
      );
    }
    process.stdout.write(
      `Provisional ${file}: ${REFERENCE}@${BRANCH} does not publish it yet, so no comparison was ` +
        `made. The copy here declares "provisional": true and will fail this check the moment sing ` +
        `publishes the real one.\n`,
    );
  },
});
