import test from "node:test";
import assert from "node:assert/strict";
import { accountConfiguration, safeAccountDestination, isSameOriginMutation } from "../lib/learning-auth/config.ts";

test("account callbacks cannot leave the learning/account surfaces", () => {
  assert.equal(safeAccountDestination("/learn/guitar?lesson=a"), "/learn/guitar?lesson=a");
  assert.equal(safeAccountDestination("/account"), "/account");
  for (const value of [null, "https://evil.example", "//evil.example", "/learn\\evil", "/account\r\nLocation: x", "/accounting", "/apply", "/learn/../../apply"]) {
    assert.equal(safeAccountDestination(value), "/account", String(value));
  }
});

test("browser account mutations require an exact origin", () => {
  const url = "https://guitarhub.org/auth/sign-out";
  assert.equal(isSameOriginMutation(new Request(url, { headers: { origin: "https://guitarhub.org" } })), true);
  for (const origin of ["https://evil.example", "https://guitarhub.org.evil.example", "null"]) {
    assert.equal(isSameOriginMutation(new Request(url, { headers: { origin } })), false);
  }
  assert.equal(isSameOriginMutation(new Request(url)), false);
});

test("accounts stay disabled until configured deliberately", () => {
  const saved = { enabled: process.env.GUITARHUB_ACCOUNTS_ENABLED, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, service: process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY };
  try {
    delete process.env.GUITARHUB_ACCOUNTS_ENABLED;
    assert.equal(accountConfiguration(), null);
    process.env.GUITARHUB_ACCOUNTS_ENABLED = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://drzuelosizfllruocmly.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal(accountConfiguration(), null);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-public-key";
    assert.equal(accountConfiguration(), null);
    process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY = "synthetic-test-only-service-key";
    assert.equal(accountConfiguration()?.url, "https://drzuelosizfllruocmly.supabase.co");
    for (const url of ["http://project.supabase.co", "https://user:password@project.supabase.co", "https://drzuelosizfllruocmly.supabase.co/path", "https://other-project.supabase.co", "invalid"]) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      assert.equal(accountConfiguration(), null);
    }
  } finally {
    for (const [key, value] of Object.entries({ GUITARHUB_ACCOUNTS_ENABLED: saved.enabled, NEXT_PUBLIC_SUPABASE_URL: saved.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: saved.key, GUITARHUB_SUPABASE_SERVICE_ROLE_KEY: saved.service })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
