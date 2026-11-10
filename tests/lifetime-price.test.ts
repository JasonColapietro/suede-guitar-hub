import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { guestLearningAccess } from "../lib/learning/access.ts";
import { APP_STORE, LIFETIME, LIFETIME_LAUNCH_ENDS, OFFER, lifetimeOfferAt } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
// Maps next/navigation for the track page; its access stub is not used here.
register("./lesson-gate-hooks.mjs", import.meta.url);
const { default: Home } = await import("../app/page.tsx");
const { default: StartPage } = await import("../app/start/page.tsx");
const { default: LearnPage } = await import("../app/learn/page.tsx");
const { default: TrackPage } = await import("../app/learn/[track]/page.tsx");
const { default: FaqPage } = await import("../app/faq/page.tsx");
const { default: AboutPage } = await import("../app/about/page.tsx");
const { PaidLessonGate } = await import("../components/learning/PaidLessonGate.tsx");
const { GET: llmsTxt } = await import("../app/llms.txt/route.ts");

const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const render = (component: FunctionComponent) => renderToStaticMarkup(createElement(component));

/** Visible text, tags stripped and entities decoded. */
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

/** Every `<a>` pointing at the App Store, with its visible label. */
function appStoreLinks(markup: string): string[] {
  const href = APP_STORE.ios.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...markup.matchAll(new RegExp(`<a [^>]*href="${href}"[^>]*>([\\s\\S]*?)</a>`, "g"))].map((match) => text(match[1]));
}

const RETIRED = /App Store shows the price|shows the price (and terms )?before you confirm/i;

/** The current price for a RegExp: these pages are built ahead of time from the offer in force at build. */
const PRICE = LIFETIME.display.replace("$", "\\$");
const priced = (pattern: string) => new RegExp(pattern.replaceAll("{price}", PRICE));

test("the launch offer is $79 until 1 December 2026 00:00 in New York, then $99", () => {
  const newYork = (instant: Date) => instant.toLocaleString("en-US", { timeZone: "America/New_York", hourCycle: "h23" });
  assert.equal(newYork(LIFETIME_LAUNCH_ENDS), "12/1/2026, 00:00:00");
  assert.equal(newYork(new Date(LIFETIME_LAUNCH_ENDS.getTime() - 1_000)), "11/30/2026, 23:59:59");

  const launch = lifetimeOfferAt(new Date(LIFETIME_LAUNCH_ENDS.getTime() - 1_000));
  assert.deepEqual({ ...launch }, {
    price: 79, regularPrice: 99, launch: true, display: "$79", regularDisplay: "$99", schemaPrice: "79.00",
    oneTime: "$79 one time", cta: "Get lifetime access on iPhone — $79 one time", webCta: "Get lifetime access — $79 one time",
    launchNote: "Launch price $79. Goes to $99 on December 1, 2026.",
  });
  const regular = lifetimeOfferAt(LIFETIME_LAUNCH_ENDS);
  assert.deepEqual({ ...regular }, {
    price: 99, regularPrice: 99, launch: false, display: "$99", regularDisplay: "$99", schemaPrice: "99.00",
    oneTime: "$99 one time", cta: "Get lifetime access on iPhone — $99 one time", webCta: "Get lifetime access — $99 one time",
    launchNote: null,
  });
  assert.equal(lifetimeOfferAt(new Date("2027-06-01T00:00:00Z")), regular);
  assert.equal(lifetimeOfferAt(new Date("2026-11-10T12:00:00Z")), launch);
});

test("LIFETIME keeps its fields and reads them from the offer in force", () => {
  const now = lifetimeOfferAt(new Date());
  assert.equal(LIFETIME.name, "Complete Lifetime");
  assert.equal(LIFETIME.currency, "USD");
  assert.deepEqual(
    { price: LIFETIME.price, display: LIFETIME.display, schemaPrice: LIFETIME.schemaPrice, oneTime: LIFETIME.oneTime, cta: LIFETIME.cta, webCta: LIFETIME.webCta },
    { price: now.price, display: now.display, schemaPrice: now.schemaPrice, oneTime: now.oneTime, cta: now.cta, webCta: now.webCta },
  );
});

test("the offer promise and guarantee are fixed", () => {
  assert.deepEqual(OFFER, {
    promise: "Play real chords and improvise your first solo in 30 days.",
    guarantee: "If after 90 days you are not playing chords and improvising, you get a full refund.",
  });
});

test("the homepage prices lifetime access in the hero link and at the lesson-path CTA", () => {
  const home = render(Home);
  const hero = home.slice(home.indexOf("<h1"), home.indexOf('id="how-it-works"'));
  assert.match(text(hero), priced("unlocked with {price} lifetime access in GuitarHub for iPhone"));

  const levels = home.slice(home.indexOf('id="levels"'), home.indexOf('id="advanced"'));
  assert.match(text(levels), priced("Guided lessons · {price} lifetime access"));
  assert.match(text(levels), /first module free/);
  assert.match(text(levels), priced("lifetime access: {price} one time"));
  assert.deepEqual(appStoreLinks(levels), [`${LIFETIME.cta} ↗`]);
  assert.doesNotMatch(text(home), RETIRED);
});

test("/learn and /learn/guitar put the price beside the purchase button", async () => {
  const learn = render(LearnPage);
  assert.match(text(learn), priced("Guitar curriculum · {price} lifetime access"));
  assert.match(text(learn), priced("unlock every lesson with lifetime access for {price} one time"));
  assert.ok(appStoreLinks(learn).includes(LIFETIME.cta));
  assert.doesNotMatch(text(learn), RETIRED);

  const track = renderToStaticMarkup(await TrackPage({ params: Promise.resolve({ track: "guitar" }) }));
  assert.match(text(track), priced("Every guided lesson opens with lifetime access: {price} one time in GuitarHub: Guitar Lessons for iPhone, with the first module free in the app\\."));
  assert.ok(appStoreLinks(track).includes(LIFETIME.cta));
  assert.doesNotMatch(text(track), RETIRED);
});

test("a locked lesson states the price and the guarantee and offers one way to buy", () => {
  const markup = renderToStaticMarkup(createElement(PaidLessonGate, {
    track: "guitar",
    lesson: { id: "g-l2-m1-01", title: "Locked lesson", summary: "Summary." },
    access: guestLearningAccess,
    ready: true,
  }));
  assert.match(text(markup), priced("Lifetime access is {price} one time in GuitarHub: Guitar Lessons for iPhone"));
  assert.ok(text(markup).includes(OFFER.guarantee));
  assert.equal((markup.match(/data-buy-button/g) ?? []).length, 1);
  assert.deepEqual(appStoreLinks(markup), [LIFETIME.cta]);
});

test("/start prices the paid stages on the page and in the placement result", () => {
  assert.match(text(render(StartPage)), priced("unlock with lifetime access, {price} one time in GuitarHub for iPhone"));
  const levelCheck = read("components/LevelCheck.tsx");
  assert.match(levelCheck, /The guided lessons unlock with lifetime access, \{LIFETIME\.oneTime\} in GuitarHub for iPhone\./);
  assert.match(levelCheck, /href=\{APP_STORE\.ios\}[\s\S]*?\{LIFETIME\.cta\}/);
});

test("/faq and /about answer the price directly", () => {
  const faq = text(render(FaqPage));
  assert.match(faq, priced("lifetime access, {price} one time in the US App Store"));
  assert.match(faq, priced("choose lifetime access in the app: {price} one time in the US App Store"));
  assert.doesNotMatch(faq, RETIRED);
  assert.match(text(render(AboutPage)), priced("lifetime access, {price} one time in GuitarHub: Guitar Lessons for iPhone"));
});

test("llms.txt states the price, the currency and the product", async () => {
  const body = await (await llmsTxt()).text();
  assert.match(body, priced("Lifetime lesson access costs {price} USD, one time, in the US\\s+App Store: the in-app purchase \"Complete Lifetime\""));
  assert.doesNotMatch(body, RETIRED);
});
