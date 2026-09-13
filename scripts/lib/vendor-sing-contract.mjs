/**
 * The vendoring mechanism shared by the contracts this repository copies from
 * JasonColapietro/sing.
 *
 * Extracted from `scripts/sync-sing-vocal.mjs` when the glossary contract became
 * the second one. The alternative was a second copy of the fetch-and-compare
 * logic, and the part worth not copying is the failure policy: a fetch that did
 * not succeed must never be reported as a verified comparison. One copy of that
 * rule is one place it can be wrong. The per-contract scripts stay as separate
 * entry points so a CI line names the contract that drifted.
 *
 * The reference is always the default branch. A copy taken from a branch in
 * flight is the silent drift these contracts exist to prevent, so there is no
 * option to point this at one; `--sing=` reads a local checkout instead, which
 * is an explicitly human act rather than something CI can do by accident.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const REFERENCE = "JasonColapietro/sing";
export const BRANCH = "main";
/** A blip should not fail a build, but a real outage must not pass as "verified". */
const ATTEMPTS = 3;

/** Parsed once from `process.argv`, the same way by every sync script. */
export function readArguments(argv = process.argv) {
  return {
    check: argv.includes("--check"),
    singRoot: argv
      .find((argument) => argument.startsWith("--sing="))
      ?.slice("--sing=".length),
  };
}

/**
 * Fetch one file from the reference repository's default branch.
 *
 * Returns `{ found: false }` only for an HTTP 404, which is a different fact
 * from a failure: it means the reference repository does not publish that path
 * yet. Every other outcome — a network error, a 5xx, a proxy refusal — throws,
 * because the caller cannot tell a clean reference from an unreachable one and
 * must not guess.
 */
export async function fetchFromSing(file) {
  const url = `https://raw.githubusercontent.com/${REFERENCE}/${BRANCH}/${file}`;
  let lastError;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/vnd.github.raw" },
      });
      // Not retried: a 404 is a stable answer, not a blip.
      if (response.status === 404) return { found: false };
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return { found: true, bytes: Buffer.from(await response.arrayBuffer()) };
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) {
        await new Promise((done) => setTimeout(done, attempt * 1000));
      }
    }
  }

  // Deliberately fatal. Reporting "verified" when the reference was unreachable
  // is the one outcome worse than failing: it is the absence of a check wearing
  // the result of one.
  throw new Error(
    `Could not read ${file} from ${REFERENCE}@${BRANCH} after ${ATTEMPTS} attempts ` +
      `(${lastError?.message ?? "unknown error"}). This is a fetch failure, not a drift failure — ` +
      `the vendored copy was not compared. Re-run, or pass --sing=/path/to/a/sing/checkout.`,
  );
}

/**
 * Write or byte-compare one vendored contract.
 *
 * `onReferenceMissing` is called when the reference repository has no such path
 * on its default branch, and is the only hook a caller gets for that case. A
 * contract that is already published upstream should not pass one: the default
 * is to treat a missing reference as fatal, because a path that used to exist
 * and now 404s means the contract was withdrawn.
 */
export async function vendor({ file, resyncHint = "", onReferenceMissing }) {
  const { check, singRoot } = readArguments();

  let reference;
  let source;

  if (singRoot) {
    reference = await readFile(resolve(singRoot, file));
    source = `${singRoot}/${file}`;
  } else {
    const fetched = await fetchFromSing(file);
    if (!fetched.found) {
      if (!onReferenceMissing) {
        throw new Error(
          `${REFERENCE}@${BRANCH} does not publish ${file}. If it once did, the contract was ` +
            `withdrawn upstream and the vendored copy here is now unsourced.`,
        );
      }
      await onReferenceMissing({ file, check });
      return;
    }
    reference = fetched.bytes;
    source = `${REFERENCE}@${BRANCH}`;
  }

  if (check) {
    let vendored;
    try {
      vendored = await readFile(file);
    } catch {
      throw new Error(`${file} is missing. Run the sync without --check.`);
    }
    // Compared with `Buffer.equals` and reported as a short message on purpose.
    // `assert.deepEqual` on two buffers of this size builds a byte-by-byte diff
    // while formatting the AssertionError, which on a real drift took the
    // process out with SIGKILL instead of printing a failure — a check whose
    // failure path cannot report is not a check.
    if (!vendored.equals(reference)) {
      throw new Error(
        `${file}: stale vendored contract. It no longer matches ${source} ` +
          `(${vendored.length} bytes here, ${reference.length} bytes there). ` +
          `Re-sync it${resyncHint ? ` — ${resyncHint}` : "."}`,
      );
    }
  } else {
    await writeFile(file, reference);
  }

  process.stdout.write(`${check ? "Verified" : "Synced"} ${file} against ${source}\n`);
}
