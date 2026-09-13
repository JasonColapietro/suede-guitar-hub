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
 * The fetch-and-compare itself lives in `scripts/lib/vendor-sing-contract.mjs`,
 * shared with `sync-sing-glossary.mjs`. This file stays a separate entry point
 * so a red CI line names the contract that drifted.
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
import { vendor } from "./lib/vendor-sing-contract.mjs";

await vendor({
  file: "contracts/suede-vocal.json",
  resyncHint:
    "run: node scripts/sync-sing-vocal.mjs, and expect " +
    "tests/suede-vocal-parity.test.ts to have something to say about the new values.",
});
