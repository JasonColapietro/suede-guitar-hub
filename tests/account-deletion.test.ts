import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLearningHandlers, type LearningHandlerDependencies } from "../lib/learning-auth/handlers.ts";
register("./component-render-hooks.mjs", import.meta.url);

const id = "a1111111-1111-4111-8111-111111111111", epoch = "b2222222-2222-4222-8222-222222222222", other = "c3333333-3333-4333-8333-333333333333";
const request = (body?: unknown, init: RequestInit = {}) => new Request("https://guitarhub.org/api/learning/account", { method: body === undefined ? "GET" : "POST", headers: { origin: "https://guitarhub.org", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...init });

function harness(overrides: Partial<LearningHandlerDependencies> = {}) {
  const writes: string[] = [];
  const unexpected = async () => { throw new Error("not under test"); };
  const deps: LearningHandlerDependencies = {
    enabled: () => true, resolveAccount: async () => ({ accountId: id, verifiedEmail: "buyer@example.com" }),
    getBinding: async () => ({ appAccountToken: id, syncEpoch: epoch }),
    listAttempts: async () => [], listPurchases: async () => [], findPurchaseOwner: async () => null,
    appendAttempts: unexpected, clearHistory: unexpected, recordPurchase: unexpected, claimPurchase: unexpected, verifier: unexpected,
    listStripePurchases: async () => [], stripeLiveRequired: () => true, getFreeModule: async () => null, setFreeModule: unexpected,
    deleteAccountData: async () => { writes.push("data"); }, identityInUse: async () => true, deleteIdentity: async () => { writes.push("identity"); },
    environment: () => "Production", allowedLessons: new Map(), ...overrides,
  };
  return { handlers: createLearningHandlers(deps), writes };
}

test("deletion removes GuitarHub data, and the shared identity only when nothing else uses it", async () => {
  for (const [inUse, expected] of [[true, ["data"]], [false, ["data", "identity"]]] as const) {
    const h = harness({ deleteAccountData: async (a, email) => { assert.equal(a, id); assert.equal(email, "buyer@example.com"); h.writes.push("data"); }, identityInUse: async (a) => { assert.equal(a, id); return inUse; }, deleteIdentity: async (a) => { assert.equal(a, id); h.writes.push("identity"); } });
    const response = await h.handlers.deleteAccount(request(undefined, { method: "DELETE" }));
    assert.equal(response.status, 204); assert.equal(await response.text(), "");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(h.writes, expected);
  }
});

test("deletion needs sign-in and a same-origin or bearer request, and keeps the identity when the check fails", async () => {
  const signedOut = harness({ resolveAccount: async () => null });
  assert.equal((await signedOut.handlers.deleteAccount(request(undefined, { method: "DELETE" }))).status, 401);
  assert.deepEqual(signedOut.writes, []);

  for (const headers of [{}, { origin: "https://evil.example" }] as Record<string, string>[]) {
    const crossOrigin = harness();
    const response = await crossOrigin.handlers.deleteAccount(new Request("https://guitarhub.org/api/learning/account", { method: "DELETE", headers }));
    assert.equal(response.status, 403); assert.deepEqual(await response.json(), { error: "invalid_origin" });
    assert.deepEqual(crossOrigin.writes, []);
  }

  const bearer = harness();
  assert.equal((await bearer.handlers.deleteAccount(new Request("https://guitarhub.org/api/learning/account", { method: "DELETE", headers: { authorization: "Bearer token" } }))).status, 204);
  assert.deepEqual(bearer.writes, ["data"]);

  // The account always comes from the session; an id in the body is never used.
  const bodyId = harness({ deleteAccountData: async (a) => { assert.equal(a, id); bodyId.writes.push("data"); }, identityInUse: async () => false, deleteIdentity: async (a) => { assert.equal(a, id); bodyId.writes.push("identity"); } });
  assert.equal((await bodyId.handlers.deleteAccount(request({ accountId: other }, { method: "DELETE" }))).status, 204);
  assert.deepEqual(bodyId.writes, ["data", "identity"]);

  const unverified = harness({ resolveAccount: async () => ({ accountId: id, verifiedEmail: null }), deleteAccountData: async (_a, email) => { assert.equal(email, null); unverified.writes.push("data"); } });
  assert.equal((await unverified.handlers.deleteAccount(request(undefined, { method: "DELETE" }))).status, 204);
  assert.deepEqual(unverified.writes, ["data"]);

  // An unverified email keeps the identity even when no other product uses it, so no Apple purchase is orphaned.
  const unverifiedFree = harness({ resolveAccount: async () => ({ accountId: id, verifiedEmail: null }), identityInUse: async () => false });
  assert.equal((await unverifiedFree.handlers.deleteAccount(request(undefined, { method: "DELETE" }))).status, 204);
  assert.deepEqual(unverifiedFree.writes, ["data"]);

  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    const checkFails = harness({ identityInUse: async () => { throw new Error("schema unavailable"); } });
    const response = await checkFails.handlers.deleteAccount(request(undefined, { method: "DELETE" }));
    assert.equal(response.status, 204);
    assert.deepEqual(checkFails.writes, ["data"]);
  } finally { console.error = original; }
  assert.equal(logged.length, 1);

  const dataFails = harness({ deleteAccountData: async () => { throw new Error("database down"); }, identityInUse: async () => false });
  assert.equal((await dataFails.handlers.deleteAccount(request(undefined, { method: "DELETE" }))).status, 503);
  assert.deepEqual(dataFails.writes, []);

  // A failed identity removal is reported, so the person or app can retry; data deletion is idempotent.
  const identityFails = harness({ identityInUse: async () => false, deleteIdentity: async () => { throw new Error("admin api down"); } });
  assert.equal((await identityFails.handlers.deleteAccount(request(undefined, { method: "DELETE" }))).status, 503);
});

test("the account page offers deletion behind an explicit confirmation", async () => {
  const { AccountSyncControls } = await import("../components/learning/AccountSyncControls.tsx");
  const { LearningAccessProvider } = await import("../components/learning/LearningAccessProvider.tsx");
  const Provider = LearningAccessProvider as (props: { access: Parameters<typeof LearningAccessProvider>[0]["access"]; children?: React.ReactNode }) => React.ReactNode;
  for (const status of ["verified", "unavailable"] as const) {
    const markup = renderToStaticMarkup(createElement(Provider, { access: { enabled: true, status, accountId: id, tracks: [], freeModuleId: null, purchaseSource: null } }, createElement(AccountSyncControls)));
    assert.match(markup, /<summary>Delete account<\/summary>/, status);
    assert.match(markup, /cannot be undone/, status);
    assert.match(markup, /purchase stays tied to your email/i, status);
    assert.match(markup, /sign in again with the same email/i, status);
    assert.match(markup, /<input type="checkbox"[^>]*\/> I understand/, status);
    assert.match(markup, /<button[^>]*disabled=""[^>]*>Delete account<\/button>/, status);
  }
});
