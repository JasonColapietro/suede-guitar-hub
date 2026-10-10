import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import test from "node:test";

import { HTTP_METHODS, allowHeader, apiNotFound, methodNotAllowed, routeOptions, type HttpMethod } from "../lib/api-methods.ts";
import { accountSyncEligible } from "../lib/learning-sync/client.ts";
import { createLearningHandlers, type LearningHandlerDependencies } from "../lib/learning-auth/handlers.ts";

const API_ROOT = new URL("../app/api/", import.meta.url);

/** Every route.ts under app/api, relative to it. */
function routeFiles(dir = API_ROOT, prefix = ""): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const url = new URL(name, dir);
    if (statSync(url).isDirectory()) found.push(...routeFiles(new URL(`${name}/`, dir), `${prefix}${name}/`));
    else if (name === "route.ts") found.push(`${prefix}${name}`);
  }
  return found;
}

function exportedMethods(source: string): Set<string> {
  return new Set([...source.matchAll(/export (?:async )?(?:const|function) (GET|HEAD|OPTIONS|POST|PUT|DELETE|PATCH)\b/g)].map((match) => match[1]));
}

test("Allow lists the served methods, HEAD with GET and OPTIONS always, in a stable order", () => {
  assert.equal(allowHeader(["POST"]), "OPTIONS, POST");
  assert.equal(allowHeader(["GET"]), "GET, HEAD, OPTIONS");
  assert.equal(allowHeader(["DELETE", "GET", "POST"]), "GET, HEAD, OPTIONS, POST, DELETE");
});

test("a 405 is small JSON with an Allow header, and OPTIONS answers 204 with the same list", async () => {
  const served: HttpMethod[] = ["GET", "POST", "DELETE"];
  const refused = methodNotAllowed(served)();
  assert.equal(refused.status, 405);
  assert.equal(refused.headers.get("allow"), "GET, HEAD, OPTIONS, POST, DELETE");
  assert.match(refused.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await refused.json(), { error: "method_not_allowed" });

  const options = routeOptions(served)();
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("allow"), refused.headers.get("allow"));
});

test("unknown API paths answer a small JSON 404 for every method", async () => {
  const response = apiNotFound();
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), { error: "not_found" });

  const catchAll = await import("../app/api/[[...path]]/route.ts");
  for (const method of HTTP_METHODS) {
    const handler = (catchAll as Record<string, unknown>)[method];
    assert.equal(typeof handler, "function", `the catch-all must answer ${method}`);
    assert.equal((handler as () => Response)().status, 404);
  }
});

test("every API route answers every method: served ones, or a 405 naming what is served", () => {
  const files = routeFiles();
  assert.ok(files.includes("learning/attempts/route.ts") && files.includes("apply/route.ts"), "the scan must find the real routes");

  for (const file of files) {
    if (file.startsWith("[[...path]]")) continue;
    const source = readFileSync(new URL(file, API_ROOT), "utf8");
    const declared = source.match(/const SERVED: readonly HttpMethod\[\] = \[([^\]]*)\]/);
    assert.ok(declared, `${file} must declare the methods it serves`);
    const served = [...declared[1].matchAll(/"([A-Z]+)"/g)].map((match) => match[1]);
    const exported = exportedMethods(source);

    for (const method of HTTP_METHODS) {
      // Next answers HEAD from GET on its own.
      if (method === "HEAD" && served.includes("GET")) continue;
      assert.ok(exported.has(method), `${file} must export ${method}`);
    }
    assert.match(source, /export const OPTIONS = routeOptions\(SERVED\)/, `${file}: OPTIONS must list only the served methods`);
    for (const method of served) {
      assert.doesNotMatch(source, new RegExp(`export const ${method} = notAllowed`), `${file} serves ${method}, so it must not refuse it`);
    }
    for (const method of HTTP_METHODS.filter((m) => m !== "OPTIONS" && !served.includes(m) && !(m === "HEAD" && served.includes("GET")))) {
      assert.match(source, new RegExp(`export const ${method} = notAllowed;`), `${file} must refuse ${method} with an Allow header`);
    }
  }
});

test("the browser builds a sync client only for a verified account on an enabled service", () => {
  const accountId = "a1111111-1111-4111-8111-111111111111";
  assert.equal(accountSyncEligible({ enabled: false, status: "disabled", accountId: null }), false);
  // Defensive: even a stray account id cannot start sync while the service is off.
  assert.equal(accountSyncEligible({ enabled: false, status: "verified", accountId }), false);
  assert.equal(accountSyncEligible({ enabled: true, status: "signedOut", accountId: null }), false);
  assert.equal(accountSyncEligible({ enabled: true, status: "unavailable", accountId }), false);
  assert.equal(accountSyncEligible({ enabled: true, status: "verified", accountId: "" }), false);
  assert.equal(accountSyncEligible({ enabled: true, status: "verified", accountId }), true);

  // The provider is the only place a browser client is constructed for a page,
  // and it checks eligibility before constructing one.
  const provider = readFileSync(new URL("../components/learning/LearningAccessProvider.tsx", import.meta.url), "utf8");
  const effect = provider.slice(provider.indexOf("useEffect("));
  assert.ok(effect.indexOf("accountSyncEligible(") > 0 && effect.indexOf("accountSyncEligible(") < effect.indexOf("new AccountSyncClient("));
  assert.match(provider, /const scopedClient = accountSyncEligible\(access\)/);

  // The server renders the access snapshot from the account configuration, so
  // a deployment without accounts reports `enabled: false` to the browser.
  const access = readFileSync(new URL("../lib/learning-auth/access.ts", import.meta.url), "utf8");
  assert.match(access, /if \(!accountConfiguration\(\)\) return \{ enabled: false, accountId: null, tracks: \[\], status: "disabled" \}/);
});

test("a disabled account service still answers truthfully and touches nothing", async () => {
  const calls: string[] = [];
  const unexpected = (name: string) => async () => { calls.push(name); throw new Error(name); };
  const deps = {
    enabled: () => false,
    resolveAccount: unexpected("resolveAccount"), getBinding: unexpected("getBinding"), listAttempts: unexpected("listAttempts"),
    listPurchases: unexpected("listPurchases"), findPurchaseOwner: unexpected("findPurchaseOwner"), appendAttempts: unexpected("appendAttempts"),
    clearHistory: unexpected("clearHistory"), recordPurchase: unexpected("recordPurchase"), verifier: unexpected("verifier"),
    environment: () => "Production", allowedLessons: new Map(),
  } as unknown as LearningHandlerDependencies;
  const handlers = createLearningHandlers(deps);
  for (const handler of [handlers.readAttempts, handlers.appendAttempts, handlers.binding]) {
    const response = await handler(new Request("https://guitarhub.org/api/learning/attempts", { method: "POST", headers: { origin: "https://guitarhub.org" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "account_service_unavailable" });
  }
  assert.deepEqual(calls, []);
});
