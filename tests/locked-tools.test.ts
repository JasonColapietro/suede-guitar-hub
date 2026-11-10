import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { afterEach, mock } from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DRILLS, drillHref } from "../lib/advanced/drills.ts";
import { guestLearningAccess, type LearningAccess } from "../lib/learning/access.ts";
import { fetchPaidAccess } from "../lib/paywall/remote-access.ts";
import { FREE_TOOLS, LEARN, LIFETIME_LAUNCH_ENDS, OFFER, PAID_TOOLS, SITE_URL, TOOLS, lifetimeOfferAt } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { default: SessionPage } = await import("../app/session/page.tsx");
const { default: ReadinessPage } = await import("../app/readiness/page.tsx");
const { default: LogPage } = await import("../app/log/page.tsx");
const { default: ToolsPage } = await import("../app/tools/page.tsx");
const { default: DrillPage } = await import("../app/advanced/[drillId]/page.tsx");
const { default: RoutinePage } = await import("../app/learn/guitar/routine/page.tsx");
const { PaidToolGate, PaidToolGateView } = await import("../components/paywall/PaidToolGate.tsx");

/** createElement with children as the third argument, for components whose props type requires `children`. */
const h = createElement as unknown as (type: unknown, props: object, ...children: ReactElement[]) => ReactElement;
const render = (component: FunctionComponent) => renderToStaticMarkup(createElement(component));
const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

/** Visible text: scripts dropped, tags stripped, entities decoded. */
function text(markup: string): string {
  return markup
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** The markup between the gate's root and its end marker: what a locked visitor gets in place of the tool. */
function gated(markup: string): string {
  const start = markup.indexOf("data-paid-tool-gate");
  const end = markup.indexOf("data-paid-tool-gate-end");
  assert.ok(start >= 0 && end > start, "the page renders the paid tool gate");
  return markup.slice(start, end);
}

const DURING_LAUNCH = LIFETIME_LAUNCH_ENDS.getTime() - 1_000;
const AFTER_LAUNCH = LIFETIME_LAUNCH_ENDS.getTime();
const at = (now: number) => { mock.timers.reset(); mock.timers.enable({ apis: ["Date"], now }); };
afterEach(() => mock.timers.reset());

const verified: LearningAccess = { ...guestLearningAccess, enabled: true, status: "verified", accountId: "account-1", tracks: ["guitar"] };

test("paid access is open only for a verified guitar grant", async () => {
  const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
  assert.equal(await fetchPaidAccess(reply(200, { tracks: ["guitar", "voice"] })), "open");
  for (const f of [reply(200, { tracks: [] }), reply(200, { tracks: ["voice"] }), reply(200, {}), reply(401, {}), reply(503, {}), (async () => new Response("not json", { status: 200 })) as typeof fetch, (async () => { throw new Error("offline"); }) as typeof fetch])
    assert.equal(await fetchPaidAccess(f), "locked");
});

test("paid access asks the access endpoint, uncached", async () => {
  const calls: [string, RequestInit | undefined][] = [];
  await fetchPaidAccess((async (input: string | URL | Request, init?: RequestInit) => {
    calls.push([String(input), init]);
    return new Response(JSON.stringify({ tracks: ["guitar"] }), { status: 200 });
  }) as typeof fetch);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/learning/access");
  assert.equal(calls[0][1]?.cache, "no-store");
  assert.equal(calls[0][1]?.method ?? "GET", "GET");
});

test("locked pages keep their introduction and a preview in the server HTML, with the exercise gated", () => {
  for (const now of [DURING_LAUNCH, AFTER_LAUNCH]) {
    at(now);
    for (const [Page, route] of [[SessionPage, "/session"], [ReadinessPage, "/readiness"], [LogPage, "/log"]] as const) {
      const markup = render(Page);
      assert.match(markup, /<h1/, route); assert.match(markup, /data-locked-preview/, route);
      assert.doesNotMatch(text(markup), /Unlock lifetime access/, `${route}: the offer panel waits for the first access answer`);
      const gate = gated(markup);
      assert.match(gate, /data-locked-preview="true"[^>]*inert=""|inert=""[^>]*data-locked-preview="true"/, `${route}: the preview is inert`);
      assert.doesNotMatch(gate, /<(input|select|textarea)\b/, `${route}: the working tool is not rendered for a locked visitor`);
      assert.ok(markup.indexOf("<h1") < markup.indexOf("data-paid-tool-gate"), `${route}: the introduction comes before the gate`);
      assert.doesNotMatch(read(`app${route}/page.tsx`), /index:\s*false/);
      assert.doesNotMatch(markup, /"isAccessibleForFree":true/, `${route}: structured data does not call a lifetime tool free`);
    }
  }
});

test("a drill page keeps its instructions and teaching outside the gate", async () => {
  at(DURING_LAUNCH);
  const drill = DRILLS[0];
  const markup = renderToStaticMarkup(await DrillPage({ params: Promise.resolve({ drillId: drill.id }) }) as ReactElement);
  const gate = gated(markup);
  const outside = markup.replace(gate, "");
  assert.match(outside, /<h1/);
  assert.ok(text(outside).includes("How to play it"));
  assert.ok(text(outside).includes("Why this drill"));
  assert.ok(text(outside).includes(drill.why));
  assert.match(gate, /data-locked-preview/);
  assert.doesNotMatch(text(gate), /Unlock lifetime access/, "the offer panel waits for the first access answer");
  assert.doesNotMatch(gate, /<(input|select|textarea)\b/);
  assert.doesNotMatch(read("app/advanced/[drillId]/page.tsx"), /index:\s*false/);
});

test("the routine page keeps its heading and gates the routine on the learn layout's access", () => {
  at(DURING_LAUNCH);
  const markup = render(RoutinePage);
  // PracticeRoutine carries its own heading, so for a locked visitor the same
  // introduction leads the preview, ahead of (never inside) the inert part.
  assert.match(markup, /<h1[^>]*>A-to-D chord practice routine\.<\/h1>/);
  assert.ok(markup.indexOf("<h1") < markup.indexOf("data-locked-preview"));
  const gate = gated(markup);
  assert.match(gate, /data-locked-preview/);
  assert.doesNotMatch(gate, /<(input|select|textarea)\b/);
  assert.ok(text(markup).includes(OFFER.guarantee));
  const source = read("app/learn/guitar/routine/page.tsx");
  assert.doesNotMatch(source, /index:\s*false/);
  assert.match(source, /LearningPaidToolGate/, "the routine reads the learn layout's access instead of fetching it");
});

test("the gate renders the tool for a verified purchaser and the preview for everyone else", () => {
  const props = (access: LearningAccess) => ({
    checkoutAvailable: false, returnTo: "/session", access,
    preview: createElement("div", { "data-locked-preview": true, inert: true }, "Example output"),
    children: createElement("input", { "data-working-tool": true }),
  });
  const open = renderToStaticMarkup(createElement(PaidToolGate, props(verified)));
  assert.match(open, /data-working-tool/); assert.doesNotMatch(open, /data-paid-tool-gate|Example output/);
  for (const access of [guestLearningAccess, { ...verified, tracks: ["voice"] }, { ...verified, status: "unavailable" }] as LearningAccess[]) {
    const locked = renderToStaticMarkup(createElement(PaidToolGate, props(access)));
    assert.doesNotMatch(locked, /data-working-tool/); assert.match(locked, /Example output/);
    assert.match(locked, /<button[^>]*type="button"/, "the panel's button opens the paywall");
    assert.match(locked, /href="\/account\?next=%2Fsession"/);
    assert.match(locked, /<[a-z]+ data-paid-tool-gate-end[^>]*><\/[a-z]+><\/div>$/, "the gate ends with its empty end marker");
  }
  // Without an access prop the first render has no offer and no tool, until the browser fetch answers.
  const remote = renderToStaticMarkup(createElement(PaidToolGate, { ...props(verified), access: undefined }));
  assert.doesNotMatch(remote, /data-working-tool/);

  const source = read("components/paywall/PaidToolGate.tsx");
  assert.match(source, /trigger="locked_item"/);
  assert.match(source, /fetchPaidAccess\(/);
});

test("before the first access answer the gate shows the preview and a placeholder, never the offer panel", () => {
  const view = (state: "checking" | "open" | "locked") => renderToStaticMarkup(h(PaidToolGateView, {
    state, checkoutAvailable: false, returnTo: "/session",
    preview: createElement("div", { "data-locked-preview": true, inert: true }, "Example output"),
  }, createElement("input", { "data-working-tool": true })));
  const checking = view("checking");
  assert.match(checking, /Example output/); assert.match(checking, /data-paid-tool-gate-checking/);
  assert.doesNotMatch(checking, /Unlock lifetime access|<button|<h2|data-working-tool|<input/);
  assert.match(checking, /min-h-\[/, "the placeholder reserves the panel's space");
  assert.doesNotMatch(checking, /animate-spin|role="progressbar"/, "no spinner");
  const open = view("open");
  assert.match(open, /data-working-tool/); assert.doesNotMatch(open, /Unlock lifetime access|data-paid-tool-gate|Example output/);
  const locked = view("locked");
  assert.match(locked, /Unlock lifetime access/); assert.match(locked, /Example output/);
  assert.doesNotMatch(locked, /data-working-tool|data-paid-tool-gate-checking/);
  // The server render of a gate that asks the endpoint is the checking state.
  const server = renderToStaticMarkup(h(PaidToolGate, { checkoutAvailable: false, returnTo: "/log", preview: createElement("div", null, "Example output") }, createElement("input")));
  assert.match(server, /Example output/); assert.doesNotMatch(server, /Unlock lifetime access|<input/);
});

test("the locked panel states the price in force and the guarantee", () => {
  for (const now of [DURING_LAUNCH, AFTER_LAUNCH]) {
    const offer = lifetimeOfferAt(new Date(now));
    const locked = text(renderToStaticMarkup(h(PaidToolGateView, { state: "locked", checkoutAvailable: false, returnTo: "/session", offer, preview: createElement("div") }, createElement("input"))));
    assert.ok(locked.includes(`${offer.display} one time`)); assert.ok(locked.includes(OFFER.guarantee));
  }
});

test("a request that never answers locks after 8 seconds", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | undefined;
  const hung = ((_url: string, init?: RequestInit) => { signal = init?.signal ?? undefined; return new Promise<Response>(() => {}); }) as unknown as typeof fetch;
  let result: string | undefined;
  const pending = fetchPaidAccess(hung).then(value => { result = value; });
  mock.timers.tick(7_999); await Promise.resolve();
  assert.equal(result, undefined, "still waiting just before the timeout");
  mock.timers.tick(1); await pending;
  assert.equal(result, "locked"); assert.equal(signal?.aborted, true);
  // A prompt answer is not overridden by the timer.
  const quick = (async () => new Response(JSON.stringify({ tracks: ["guitar"] }), { status: 200 })) as typeof fetch;
  assert.equal(await fetchPaidAccess(quick), "open");
});

test("locked pages stay in the sitemap", async () => {
  const urls = new Set((await import("../app/sitemap.ts")).default().map(entry => entry.url));
  for (const path of ["/session", "/readiness", "/log", "/advanced", "/learn/guitar/routine", drillHref(DRILLS[0].id)]) assert.ok(urls.has(`${SITE_URL}${path}`), path);
});

test("the registry marks what lifetime access opens", () => {
  assert.deepEqual(PAID_TOOLS.map(tool => tool.href), ["/session", "/readiness", "/log"]);
  assert.deepEqual(LEARN.filter(entry => entry.access === "paid").map(entry => entry.href), ["/learn/guitar/routine", "/advanced"]);
  assert.equal(FREE_TOOLS.length + PAID_TOOLS.length, TOOLS.length);
});

test("/tools promises only what is free", () => {
  at(DURING_LAUNCH);
  const page = text(render(ToolsPage));
  assert.doesNotMatch(page, /no locked second half|nothing behind it|no payment step/i);
  for (const tool of PAID_TOOLS) assert.ok(page.includes(tool.title));          // still listed, marked as part of lifetime access
  assert.deepEqual(FREE_TOOLS.map(tool => tool.href), ["/practice", "/breakthrough", "/diagnose", "/tempo"]);
  assert.ok(page.includes(lifetimeOfferAt(new Date(DURING_LAUNCH)).oneTime), "the FAQ states the price for the rest");
});
