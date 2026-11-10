import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { COMPETITORS, GUITARHUB_CELLS } from "../lib/comparisons.ts";
import { COMPARISONS, OFFER, STRUMLY, lifetimeOfferAt } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
// Maps next/navigation for the track page; its access stub is not used here.
register("./lesson-gate-hooks.mjs", import.meta.url);
const { default: HomePage } = await import("../app/page.tsx");
const { default: LearnPage } = await import("../app/learn/page.tsx");
const { default: TrackPage } = await import("../app/learn/[track]/page.tsx");
const { default: StartPage } = await import("../app/start/page.tsx");
const { default: FaqPage } = await import("../app/faq/page.tsx");
const { default: AboutPage } = await import("../app/about/page.tsx");
const { default: ComparePage } = await import("../app/compare/page.tsx");
const { default: ToolsPage } = await import("../app/tools/page.tsx");
const { default: PracticePage } = await import("../app/practice/page.tsx");
const { default: DiagnosePage } = await import("../app/diagnose/page.tsx");
const { default: GuidesPage } = await import("../app/guides/page.tsx");
const { default: MethodPage } = await import("../app/method/page.tsx");
const { GET: llmsRoute } = await import("../app/llms.txt/route.ts");

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

const comparisonPages = new Map<string, FunctionComponent>();
for (const { href } of COMPARISONS) {
  const mod = (await import(new URL(`../app${href}/page.tsx`, import.meta.url).href)) as { default: FunctionComponent };
  comparisonPages.set(href, mod.default);
}
const renderComparison = (href: string) => render(comparisonPages.get(href)!);

const home = render(HomePage);
const homeText = text(home);
const llmsText = async () => (await llmsRoute()).text();

test("the promise is the headline on every listed surface", async () => {
  const SURFACES = { "/": HomePage, "/learn": LearnPage, "/start": StartPage, "/faq": FaqPage, "/compare": ComparePage } as const;
  for (const [route, Page] of Object.entries(SURFACES)) assert.ok(text(render(Page)).includes(OFFER.promise), route);
  const llms = await llmsText();
  assert.ok(llms.startsWith(`# GuitarHub — ${OFFER.promise}`));
  for (const href of COMPARISONS.map((entry) => entry.href)) assert.ok(text(renderComparison(href)).includes(OFFER.promise), href);
  assert.match(home.slice(home.indexOf("<h1"), home.indexOf("</h1>")), /Play real chords and improvise your first solo in 30 days\./);
});

test("the breakthrough-room positioning and the cohort application are gone from the home page", () => {
  assert.doesNotMatch(home, /id="room"|id="apply"|ApplyForm|founding room|breakthrough room/i);
  assert.doesNotMatch(read("app/page.tsx"), /ApplyForm/);
  assert.doesNotMatch(text(render(FaqPage)), /founding room|home-page form/i);
});

test("voice on the web points to Suede Sing and is never called free", async () => {
  for (const value of [homeText, text(render(LearnPage)), text(render(FaqPage)), text(render(AboutPage)), await llmsText()]) {
    assert.match(value, /Suede Sing/);
    assert.doesNotMatch(value, /Suede Sing[^.]*\bfree\b|\bfree\b[^.]*Suede Sing/i);
  }
  assert.ok(home.includes(STRUMLY.sing));
});

test("nothing locked is still called free, and no page says the app hears chords", async () => {
  const all = [
    homeText,
    text(render(LearnPage)),
    text(render(StartPage)),
    text(render(FaqPage)),
    await llmsText(),
    JSON.stringify(GUITARHUB_CELLS),
    ...COMPETITORS.map((rival) => JSON.stringify(rival)),
  ].join("\n");
  assert.doesNotMatch(all, /free Advanced Lab|Advanced Lab[^.]{0,40}\bfree\b|free A-to-D|A-to-D chord routine[^.]{0,40}\bfree\b|first module is free in the app/i);
  assert.doesNotMatch(all, /hears? (your )?chords|scores? (your )?chords|chord (recognition|detection)/i);
});

test("each free page has exactly one primary button, to the magnet or the free module", () => {
  const pages = { "/": HomePage, "/tools": ToolsPage, "/practice": PracticePage, "/diagnose": DiagnosePage, "/start": StartPage, "/guides": GuidesPage, "/compare": ComparePage, "/method": MethodPage };
  for (const [route, Page] of Object.entries(pages)) {
    const primary = [...render(Page).matchAll(/<a [^>]*data-funnel-primary[^>]*>/g)];
    assert.equal(primary.length, 1, route);
    assert.match(primary[0][0], /href="\/(breakthrough|start)"/, route);
  }
});

test("the web buy path is offered where the price is stated", async () => {
  // These pages are built ahead of time and priced from the offer in force at build.
  const offer = lifetimeOfferAt(new Date());
  const levels = home.slice(home.indexOf('id="levels"'), home.indexOf('id="more"'));
  const track = renderToStaticMarkup(await TrackPage({ params: Promise.resolve({ track: "guitar" }) }));
  for (const [route, markup] of [["/#levels", levels], ["/learn", render(LearnPage)], ["/learn/guitar", track]] as const) {
    assert.equal((markup.match(/data-buy-button/g) ?? []).length, 1, route);
    assert.ok(text(markup).includes(offer.oneTime), route);
    if (offer.launchNote) assert.ok(text(markup).includes(offer.launchNote), route);
  }
});

