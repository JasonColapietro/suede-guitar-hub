import assert from "node:assert/strict";
import test from "node:test";

import { FUNNEL_EVENT_NAMES, type FunnelEvent } from "../lib/analytics/events.ts";
import { track } from "../lib/analytics/tracker.ts";

const CONTRACT_NAMES = [
  "screen_viewed",
  "magnet_submitted",
  "placement_completed",
  "free_module_started",
  "free_module_completed",
  "paywall_viewed",
  "checkout_started",
  "purchase_completed",
  "sign_in_completed",
];

const ONE_OF_EACH: FunnelEvent[] = [
  { name: "screen_viewed", screen: "home" },
  { name: "magnet_submitted", source: "plan" },
  { name: "placement_completed", placement: "beginner" },
  { name: "free_module_started", module_id: "m1" },
  { name: "free_module_completed", module_id: "m1" },
  { name: "paywall_viewed", trigger: "module_end" },
  { name: "checkout_started", platform: "web" },
  { name: "purchase_completed", platform: "web", source: "stripe" },
  { name: "sign_in_completed", platform: "web" },
];

test("funnel event names match the shared contract in order", () => {
  assert.deepEqual([...FUNNEL_EVENT_NAMES], CONTRACT_NAMES);
});

test("the sample events cover every funnel name", () => {
  assert.deepEqual(ONE_OF_EACH.map((event) => event.name), CONTRACT_NAMES);
});

test("track returns undefined for every event name", () => {
  for (const event of ONE_OF_EACH) assert.equal(track(event), undefined, event.name);
});

test("track sends nothing and touches no browser state", () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    assert.fail("track must not call fetch");
  }) as typeof fetch;
  try {
    assert.equal(typeof (globalThis as { document?: unknown }).document, "undefined");
    assert.equal(typeof (globalThis as { localStorage?: unknown }).localStorage, "undefined");
    assert.equal(typeof (globalThis as { sessionStorage?: unknown }).sessionStorage, "undefined");
    for (const event of ONE_OF_EACH) assert.doesNotThrow(() => track(event));
  } finally {
    globalThis.fetch = realFetch;
  }
});
