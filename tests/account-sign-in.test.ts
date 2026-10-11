import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { safeAccountDestination } from "../lib/learning-auth/config.ts";

type Element = { type: string; props: Record<string, unknown> & { children?: Element | Element[] } };

// Execute the real form's event handlers with isolated hooks, navigation and
// fetch. No email is sent and this does not stand in for browser layout QA.
function signInHarness(returnTo: string, verificationSucceeds = true) {
  const state: unknown[] = [];
  let cursor = 0;
  const destinations: string[] = [];
  const requests: string[] = [];
  let refreshes = 0;
  const source = ts.transpileModule(readFileSync(new URL("../app/account/sign-in.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { default?: (props: { returnTo: string }) => Element } = {};
  const require = createRequire(import.meta.url);
  runInNewContext(source, {
    exports,
    require: (name: string) => name === "react" ? {
      useState: (initial: unknown) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value: unknown) => { state[index] = value; }];
      },
    } : name === "next/navigation" ? {
      useRouter: () => ({ replace: (href: string) => destinations.push(href), refresh: () => { refreshes++; } }),
    } : name === "@/lib/learning-auth/config" ? { safeAccountDestination } : require(name),
    fetch: async (url: string) => {
      requests.push(url);
      return { ok: !url.endsWith("verify") || verificationSucceeds };
    },
  });
  function render() { cursor = 0; return exports.default!({ returnTo }); }
  async function submit() {
    const form = render();
    await (form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>)({ preventDefault() {} });
  }
  return { submit, destinations, requests, refreshes: () => refreshes };
}

test("successful email-code verification returns to the requested lesson", async () => {
  const lesson = "/learn/guitar/g-l1-m1-02";
  const h = signInHarness(lesson);
  await h.submit();
  assert.deepEqual(h.destinations, [], "sending a code must not navigate");
  await h.submit();
  assert.deepEqual(h.requests, ["/auth/email/send", "/auth/email/verify"]);
  assert.deepEqual(h.destinations, [lesson]);
  assert.equal(h.refreshes(), 1);
});

test("sign-in refuses an unsafe destination and stays put when verification fails", async () => {
  const unsafe = signInHarness("https://evil.example");
  await unsafe.submit();
  await unsafe.submit();
  assert.deepEqual(unsafe.destinations, ["/account"]);
  const rejected = signInHarness("/learn/guitar/g-l1-m1-02", false);
  await rejected.submit();
  await rejected.submit();
  assert.deepEqual(rejected.destinations, []);
  assert.equal(rejected.refreshes(), 0);
});

test("account page carries a safe lesson destination into sign-in and the return link", async () => {
  const source = ts.transpileModule(readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { default?: (props: { searchParams: Promise<{ next: string | string[] }> }) => Promise<Element> } = {};
  const require = createRequire(import.meta.url);
  const dependencies: Record<string, unknown> = {
    "next/link": { default: "a" },
    "@/components/Article": { default: "article" },
    "@/lib/site": { APP_STORE: {}, LIFETIME: {} },
    "@/lib/learning-auth/config": { accountConfiguration: () => ({}), safeAccountDestination },
    "@/lib/learning-auth/server": { resolveAccount: async () => null },
    "./sign-in": { default: "SignIn" },
    "@/lib/learning-auth/access": { getVerifiedLearningAccess: async () => null },
    "@/components/learning/LearningAccessProvider": { LearningAccessProvider: "Provider" },
    "@/components/learning/AccountSyncControls": { AccountSyncControls: "Sync", ScopedAccountSignOut: "SignOut" },
  };
  runInNewContext(source, { exports, require: (name: string) => dependencies[name] ?? require(name) });
  function elements(value: unknown): Element[] {
    if (Array.isArray(value)) return value.flatMap(elements);
    if (!value || typeof value !== "object" || !("props" in value)) return [];
    const node = value as Element;
    return [node, ...elements(node.props.children)];
  }
  const lesson = "/learn/guitar/g-l1-m1-02";
  const tree = elements(await exports.default!({ searchParams: Promise.resolve({ next: lesson }) }));
  assert.equal(tree.find(node => node.type === "SignIn")?.props.returnTo, lesson);
  assert.ok(tree.some(node => node.type === "a" && node.props.href === lesson));
  const unsafe = elements(await exports.default!({ searchParams: Promise.resolve({ next: [lesson, "https://evil.example"] }) }));
  assert.equal(unsafe.find(node => node.type === "SignIn")?.props.returnTo, "/account");
  assert.ok(!unsafe.some(node => node.props.href === "https://evil.example"));
});
