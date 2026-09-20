import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const policy = readFileSync(
  new URL("../app/privacy/page.tsx", import.meta.url),
  "utf8",
);

test("privacy policy describes optional local lesson recordings without contradicting the feature", () => {
  const disclosure = policy.match(
    /<p>When you choose to record[\s\S]*?<\/p>/i,
  )?.[0];

  assert.ok(disclosure, "the recording feature needs its own point-of-use disclosure");
  assert.match(disclosure, /one optional recording[^.]+for that lesson/i);
  assert.match(disclosure, /up to (?:two minutes|120 seconds)/i);
  assert.match(disclosure, /play it back/i);
  assert.match(disclosure, /not uploaded/i);
  assert.match(disclosure, /excluded from (?:your )?device backups/i);
  assert.match(disclosure, /delete/i);

  assert.doesNotMatch(
    policy,
    /Raw microphone audio is not uploaded to our servers or saved as a recording/,
  );
});

test("privacy policy distinguishes browser voice takes from iOS recordings", () => {
  const disclosure = policy.match(
    /<p>When you choose to record a take in a voice lesson[\s\S]*?<\/p>/i,
  )?.[0];
  assert.ok(disclosure, "the browser recorder needs its own point-of-use disclosure");
  assert.match(disclosure, /guitarhub\.org/i);
  assert.match(disclosure, /one optional recording[^.]+for that lesson/i);
  assert.match(disclosure, /up to (?:two minutes|120 seconds)/i);
  assert.match(disclosure, /IndexedDB/i);
  assert.match(disclosure, /current signed-in account or guest scope/i);
  assert.match(disclosure, /replaces the previous browser take/i);
  assert.match(disclosure, /never uploaded or synced/i);
  assert.match(disclosure, /does not score your singing or complete the lesson/i);
  assert.match(disclosure, /delete/i);
  assert.match(disclosure, /confirming the deletion/i);
  assert.match(disclosure, /cannot access or recover/i);
  assert.match(policy, /optional iOS lesson recordings are excluded from device backups/i);
  assert.match(policy, /optional website takes remain only in that browser’s site data/i);
});

test("privacy policy keeps optional account processing conditional and bounded", () => {
  assert.match(policy, /available only when GuitarHub[^.]+enabled its account service/i);
  assert.match(policy, /signing in alone does not start practice sync/i);
  assert.match(policy, /explicitly enable practice sync/i);
  assert.match(policy, /account identifier, sync binding, and only new lesson-attempt evidence/i);
  assert.match(policy, /Earlier guest or local records[^.]+not uploaded automatically/i);
  assert.match(policy, /pause sync/i);
  assert.match(policy, /delete (?:your )?cloud practice history/i);
  assert.match(policy, /local device records are preserved/i);
  assert.match(policy, /Apple-signed transaction data/i);
  assert.match(policy, /account-binding token/i);
  assert.match(policy, /Supabase/);
  assert.match(policy, /https:\/\/supabase\.com\/privacy/);

  assert.doesNotMatch(
    policy,
    /These learning records are not sent to a GuitarHub account or synchronized between devices in the current version/,
  );
});
