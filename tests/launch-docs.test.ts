import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { OFFER, lifetimeOfferAt } from "../lib/site.ts";

const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
/** The docs are written during the launch, so they carry the launch offer's own strings. */
const LAUNCH = lifetimeOfferAt(new Date("2026-11-10T12:00:00Z"));

test("the launch docs tell the same story as the site", () => {
  for (const file of ["press-kit.md", "README.md", "social.md", "communities.md", "directories.md", "outreach-emails.md"]) {
    const doc = read(`docs/launch/${file}`);
    assert.doesNotMatch(doc, /founding room|No price, ever|No pricing|four free (browser )?tools|free Advanced Lab|breakthrough room|breakthrough planner/i, file);
    assert.doesNotMatch(doc, /hears? (your )?chords|scores? (your )?chords|chord (recognition|detection)/i, file);
  }
  const kit = read("docs/launch/press-kit.md");
  assert.ok(kit.includes(OFFER.promise));
  assert.ok(kit.includes(LAUNCH.launchNote!), "the press kit carries the launch line verbatim");
  assert.ok(kit.includes(LAUNCH.oneTime));
  assert.ok(kit.includes(OFFER.guarantee));
});

test("the account docs describe accounts, both ledgers and the owner steps as built", () => {
  const account = read("docs/account/README.md");
  for (const path of ["/api/checkout", "/api/stripe/webhook", "/api/learning/free-module", "/api/learning/purchases/apple/claim", "/api/learning/account", "/api/leads"]) assert.ok(account.includes(path), path);
  for (const table of ["guitarhub_stripe_purchases", "guitarhub_free_modules", "guitarhub_leads", "guitarhub_delete_account"]) assert.ok(account.includes(table), table);
  assert.doesNotMatch(account, /There is no web checkout|does not create accounts/);
  assert.match(account, /STRIPE_WEBHOOK_SECRET/);
  assert.match(account, /owner step/i);
  assert.match(read("docs/account/client-sync.md"), /free module/i);
});
