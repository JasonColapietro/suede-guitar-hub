#!/usr/bin/env node
/**
 * Vendors `contracts/suede-progress.json` from JasonColapietro/sing.
 *
 * The shape of a singer's practice record: the activity types, which session
 * fields are mandatory, the caps a payload is refused for exceeding, and the two
 * refusals — XP and the streak — that a consumer is most likely to argue with.
 * Sing is the reference surface because the record, its validators and its caps
 * are implemented there and nowhere else; this repository has no session-shaped
 * record at all, so a shape declared here would be a transcription, and a
 * transcription cannot fail when the original moves.
 *
 * This repository also keeps `lib/learning-sync/sing-sessions.ts`, which says
 * what a session of each activity type counts as against the voice curriculum
 * in this site's attempt ledger. Since 2026-09-23 the voice lessons and their
 * identifiers belong to sing, which hosts them and publishes
 * `contracts/suede-voice-curriculum.json`; this site redirects /learn/voice to
 * them. The mapping stays for the history already in the ledger.
 *
 * Usage:
 *   node scripts/sync-sing-progress.mjs             # fetch and write
 *   node scripts/sync-sing-progress.mjs --check     # fetch and byte-compare only
 *   node scripts/sync-sing-progress.mjs --sing=/abs/path/to/sing [--check]
 *
 * Same rules as `sync-sing-vocal.mjs` and `sync-sing-glossary.mjs`: the network
 * source is sing's default branch and nothing else, a fetch failure is fatal
 * rather than reported as verified, and `--sing=` reads a local checkout for
 * working offline or against an unmerged branch.
 *
 * ## The provisional window, and how it closes
 *
 * This repository's half was built before sing's builder landed on `main`, so
 * `contracts/suede-progress.json` here starts as a provisional copy declaring
 * `"provisional": true`. While sing's default branch 404s on the path, `--check`
 * reports that state and passes: there is nothing to compare against, and
 * failing CI over a file that does not exist upstream yet teaches people to
 * ignore the check.
 *
 * The window cannot be left open. A 404 is tolerated only for a copy that says
 * it is provisional, so the marker is a claim this script reads rather than a
 * comment. The real contract does not carry the marker, so the first CI run after
 * sing merges compares bytes and fails — which is the prompt to re-sync. A 404
 * against a copy that does not declare itself provisional is fatal, because that
 * is a contract withdrawn upstream.
 *
 * `--sing=` does not go through that window, because a local checkout either has
 * the file or does not. Pointed at a checkout that already carries the real
 * contract, `--check` reports the provisional copy as stale — which is the
 * correct answer, and the re-sync that answer asks for is the one that closes the
 * window.
 */
import { readFile } from "node:fs/promises";
import { vendor, BRANCH, REFERENCE } from "./lib/vendor-sing-contract.mjs";

const FILE = "contracts/suede-progress.json";

/** True when the vendored copy declares itself a placeholder for the real one. */
async function vendoredIsProvisional() {
  try {
    return JSON.parse(await readFile(FILE, "utf8")).provisional === true;
  } catch {
    return false;
  }
}

await vendor({
  file: FILE,
  resyncHint:
    "run: node scripts/sync-sing-progress.mjs, and expect " +
    "tests/sing-session-mapping.test.ts to have something to say if sing added an activity type.",
  async onReferenceMissing({ file, check }) {
    if (!(await vendoredIsProvisional())) {
      throw new Error(
        `${REFERENCE}@${BRANCH} does not publish ${file}, and the vendored copy here does not ` +
          `declare "provisional": true. Either the contract was withdrawn upstream — in which case ` +
          `the copy here is unsourced and the session mapping rests on nothing — or the marker was ` +
          `removed from a copy that is still a placeholder.`,
      );
    }
    if (!check) {
      throw new Error(
        `${REFERENCE}@${BRANCH} does not publish ${file} yet, so there is nothing to sync. The ` +
          `vendored copy is the provisional one written in this repository; refusing to overwrite it ` +
          `with nothing. Re-run once sing's progress-shape contract is on ${BRANCH}.`,
      );
    }
    process.stdout.write(
      `Provisional ${file}: ${REFERENCE}@${BRANCH} does not publish it yet, so no comparison was ` +
        `made. The copy here declares "provisional": true and will fail this check the moment sing ` +
        `publishes the real one.\n`,
    );
  },
});
