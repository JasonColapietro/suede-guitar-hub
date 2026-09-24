#!/usr/bin/env node
/**
 * Vendors `contracts/suede-voice-lesson-urls.json` from JasonColapietro/sing.
 *
 * Since 2026-09-23 sing hosts the voice lessons and this site redirects
 * /learn/voice/** to them. Sing generates the file from the lesson pages it
 * actually serves, so each redirect here points at a page that exists. A lesson
 * moved on sing is a changed line in that file, and this check fails until the
 * copy here is re-synced, rather than a redirect quietly landing on a 404.
 *
 * Usage:
 *   node scripts/sync-sing-lesson-urls.mjs             # fetch and write
 *   node scripts/sync-sing-lesson-urls.mjs --check     # fetch and byte-compare only
 *   node scripts/sync-sing-lesson-urls.mjs --sing=/abs/path/to/sing [--check]
 */
import { vendor } from "./lib/vendor-sing-contract.mjs";

await vendor({
  file: "contracts/suede-voice-lesson-urls.json",
  resyncHint: "run node scripts/sync-sing-lesson-urls.mjs; the voice redirects are built from this file",
});
