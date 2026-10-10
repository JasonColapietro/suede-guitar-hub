import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { guestLearningAccess } from "../lib/learning/access.ts";
import { APP_STORE, LIFETIME } from "../lib/site.ts";

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

test("the lifetime price has one source of truth", () => {
  assert.equal(LIFETIME.price, 79);
  assert.equal(LIFETIME.currency, "USD");
  assert.equal(LIFETIME.display, "$79");
  assert.equal(LIFETIME.schemaPrice, "79.00");
  assert.equal(LIFETIME.oneTime, "$79 one time");
  assert.equal(LIFETIME.cta, "Get lifetime access on iPhone — $79 one time");
});

test("the homepage prices lifetime access in the hero link and at the lesson-path CTA", () => {
  const home = render(Home);
  const hero = home.slice(home.indexOf("<h1"), home.indexOf('id="how-it-works"'));
  assert.match(text(hero), /unlocked with \$79 lifetime access in GuitarHub for iPhone/);

  const levels = home.slice(home.indexOf('id="levels"'), home.indexOf('id="advanced"'));
  assert.match(text(levels), /Guided lessons · \$79 lifetime access/);
  assert.match(text(levels), /first module free/);
  assert.match(text(levels), /lifetime access: \$79 one time/);
  assert.deepEqual(appStoreLinks(levels), [`${LIFETIME.cta} ↗`]);
  assert.doesNotMatch(text(home), RETIRED);
});

test("/learn and /learn/guitar put the price beside the purchase button", async () => {
  const learn = render(LearnPage);
  assert.match(text(learn), /Guitar curriculum · \$79 lifetime access/);
  assert.match(text(learn), /unlock every lesson with lifetime access for \$79 one time/);
  assert.ok(appStoreLinks(learn).includes(LIFETIME.cta));
  assert.doesNotMatch(text(learn), RETIRED);

  const track = renderToStaticMarkup(await TrackPage({ params: Promise.resolve({ track: "guitar" }) }));
  assert.match(text(track), /Every guided lesson opens with lifetime access: \$79 one time in GuitarHub: Guitar Lessons for iPhone, with the first module free in the app\./);
  assert.ok(appStoreLinks(track).includes(LIFETIME.cta));
  assert.doesNotMatch(text(track), RETIRED);
});

test("a locked lesson states the price and sends the buyer to the App Store", () => {
  const markup = renderToStaticMarkup(createElement(PaidLessonGate, {
    track: "guitar",
    lesson: { id: "g-l2-m1-01", title: "Locked lesson", summary: "Summary." },
    access: guestLearningAccess,
    ready: true,
  }));
  assert.match(text(markup), /Lifetime access is \$79 one time in GuitarHub: Guitar Lessons for iPhone/);
  assert.deepEqual(appStoreLinks(markup), [LIFETIME.cta]);
});

test("/start prices the paid stages on the page and in the placement result", () => {
  assert.match(text(render(StartPage)), /unlock with lifetime access, \$79 one time in GuitarHub for iPhone/);
  const levelCheck = read("components/LevelCheck.tsx");
  assert.match(levelCheck, /The guided lessons unlock with lifetime access, \{LIFETIME\.oneTime\} in GuitarHub for iPhone\./);
  assert.match(levelCheck, /href=\{APP_STORE\.ios\}[\s\S]*?\{LIFETIME\.cta\}/);
});

test("/faq and /about answer the price directly", () => {
  const faq = text(render(FaqPage));
  assert.match(faq, /lifetime access, \$79 one time in the US App Store/);
  assert.match(faq, /choose lifetime access in the app: \$79 one time in the US App Store/);
  assert.doesNotMatch(faq, RETIRED);
  assert.match(text(render(AboutPage)), /lifetime access, \$79 one time in GuitarHub: Guitar Lessons for iPhone/);
});

test("llms.txt states the price, the currency and the product", async () => {
  const body = await (await llmsTxt()).text();
  assert.match(body, /Lifetime lesson access costs \$79 USD, one time, in the US\s+App Store: the in-app purchase "Complete Lifetime"/);
  assert.doesNotMatch(body, RETIRED);
});
