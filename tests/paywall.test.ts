import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { afterEach, mock } from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { guestLearningAccess, type LearningAccess } from "../lib/learning/access.ts";
import { APP_STORE, LIFETIME, LIFETIME_LAUNCH_ENDS, OFFER } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { Paywall } = await import("../components/paywall/Paywall.tsx");
const { BuyButton } = await import("../components/paywall/BuyButton.tsx");
const { PaidLessonGate } = await import("../components/learning/PaidLessonGate.tsx");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (component: FunctionComponent<any>, props: object) => renderToStaticMarkup(createElement(component, props));
const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

/** Visible text, tags stripped and entities decoded. */
function text(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const DURING_LAUNCH = LIFETIME_LAUNCH_ENDS.getTime() - 1_000;
const AFTER_LAUNCH = LIFETIME_LAUNCH_ENDS.getTime();
const at = (now: number) => { mock.timers.reset(); mock.timers.enable({ apis: ["Date"], now }); };
afterEach(() => mock.timers.reset());

const paywall = { trigger: "locked_item", onClose() {}, checkoutAvailable: true, returnTo: "/session" } as const;
const PRESSURE = /only \d+ left|ends (today|tonight)|hears? your chords|scores? your chords|usually \$|was \$99|save \$\d+|countdown/i;

test("the paywall shows the price, the guarantee, one buy button and a one-tap close", () => {
  at(DURING_LAUNCH);
  const markup = render(Paywall, { ...paywall, open: true });
  assert.match(text(markup), /\$79/); assert.ok(text(markup).includes(OFFER.guarantee));
  assert.equal((markup.match(/data-buy-button/g) ?? []).length, 1);
  assert.match(markup, /<button[^>]*aria-label="Close"/);
  assert.match(markup, /href="\/account\?next=%2Fsession"/);
  assert.doesNotMatch(text(markup), PRESSURE);
  assert.equal(render(Paywall, { ...paywall, open: false }), "");
});

test("during the launch the paywall strikes through $99 beside $79 and states the end date", () => {
  at(DURING_LAUNCH);
  const markup = render(Paywall, { ...paywall, open: true });
  assert.match(markup, /<s[^>]*>(<span[^>]*>[^<]*<\/span>)?\$99<\/s>\s*<strong>\$79<\/strong>/);
  assert.ok(text(markup).includes("Launch price $79. Goes to $99 on December 1, 2026."));
  assert.ok(text(markup).includes("Get lifetime access — $79 one time"));
});

test("from the end instant the paywall shows $99 one time with no launch wording", () => {
  at(AFTER_LAUNCH);
  const markup = render(Paywall, { ...paywall, open: true });
  assert.ok(text(markup).includes("$99 one time"));
  assert.ok(text(markup).includes("Get lifetime access — $99 one time"));
  assert.doesNotMatch(text(markup), /\$79|launch/i);
  assert.doesNotMatch(markup, /<s[ >]/);
  assert.doesNotMatch(text(markup), PRESSURE);
});

test("with web checkout unavailable the buy button is the App Store link", () => {
  const markup = render(BuyButton, { checkoutAvailable: false });
  assert.match(markup, new RegExp(`href="${APP_STORE.ios}"`)); assert.ok(text(markup).includes(LIFETIME.cta));
  assert.equal((markup.match(/data-buy-button/g) ?? []).length, 1);
});

test("with web checkout available the buy button is a button priced at render time", () => {
  at(DURING_LAUNCH);
  const launch = render(BuyButton, { checkoutAvailable: true, className: "primary" });
  assert.match(launch, /<button[^>]*type="button"[^>]*data-buy-button/);
  assert.equal(text(launch), "Get lifetime access — $79 one time");
  at(AFTER_LAUNCH);
  assert.equal(text(render(BuyButton, { checkoutAvailable: true })), "Get lifetime access — $99 one time");
});

test("the paywall source closes on Escape and on the close button, and survives a throwing tracker", () => {
  const paywallSource = read("components/paywall/Paywall.tsx");
  assert.match(paywallSource, /"Escape"/);
  assert.match(paywallSource, /aria-label="Close"[^>]*onClick=\{onClose\}|onClick=\{onClose\}[^>]*aria-label="Close"/);
  assert.match(paywallSource, /showModal\(\)/, "a modal dialog keeps focus inside while open");
  assert.match(paywallSource, /try \{ track\(\{ name: "paywall_viewed", trigger \}\); \} catch/);

  const buySource = read("components/paywall/BuyButton.tsx");
  assert.match(buySource, /try \{ track\(\{ name: "checkout_started", platform: "web" \}\); \} catch/);
  assert.match(buySource, /try \{[\s\S]*fetch\("\/api\/checkout"[\s\S]*\} catch/);
  assert.ok(buySource.includes("Checkout is unavailable right now. Try again."));
});

test("with web checkout available a locked lesson sells on the page at the price in force", () => {
  const names = ["GUITARHUB_ACCOUNTS_ENABLED", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "GUITARHUB_SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "VERCEL_ENV"];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  Object.assign(process.env, {
    GUITARHUB_ACCOUNTS_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "https://drzuelosizfllruocmly.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    GUITARHUB_SUPABASE_SERVICE_ROLE_KEY: "service", STRIPE_SECRET_KEY: "sk_test_1", STRIPE_WEBHOOK_SECRET: "whsec_1",
  });
  const gate = (access: LearningAccess) => renderToStaticMarkup(createElement(PaidLessonGate, {
    track: "guitar", lesson: { id: "g-l2-m1-01", title: "Locked lesson", summary: "Summary." }, access, ready: true,
  }));
  try {
    at(DURING_LAUNCH);
    const launch = gate(guestLearningAccess);
    assert.match(launch, /<button[^>]*data-buy-button[^>]*>Get lifetime access — \$79 one time<\/button>/);
    assert.equal((launch.match(/data-buy-button/g) ?? []).length, 1);
    assert.ok(text(launch).includes("Lifetime access is $79 one time"));
    assert.ok(text(launch).includes("Launch price $79. Goes to $99 on December 1, 2026."));
    assert.ok(text(launch).includes(OFFER.guarantee));
    assert.doesNotMatch(text(launch), /not available yet/);
    assert.ok(!launch.includes(`href="${APP_STORE.ios}"`));

    at(AFTER_LAUNCH);
    const signedOut = gate({ ...guestLearningAccess, enabled: true, status: "signedOut" });
    assert.ok(text(signedOut).includes("Get lifetime access — $99 one time"));
    assert.doesNotMatch(text(signedOut), /\$79|Launch price/);
    assert.match(signedOut, /href="\/account\?next=%2Flearn%2Fguitar%2Fg-l2-m1-01"/);
  } finally {
    for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
  }
});
