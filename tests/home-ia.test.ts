import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PLAYER_LEVELS } from "../lib/levels.ts";
import {
  PLACEMENT_QUESTIONS,
  PLACEMENT_RESULTS,
  placeLevel,
  type PlacementAnswers,
} from "../lib/placement.ts";
import { LEARN } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { default: Home } = await import("../app/page.tsx");
const { default: StartPage } = await import("../app/start/page.tsx");
const { default: LearnPage } = await import("../app/learn/page.tsx");
const { default: LevelPicker } = await import("../components/LevelPicker.tsx");

const render = (component: FunctionComponent) => renderToStaticMarkup(createElement(component));

/** Visible text, tags stripped and entities decoded, for phrase and word checks. */
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

const words = (value: string) => value.toLowerCase().match(/[a-z0-9'’-]+/g) ?? [];

const home = render(Home);
const homeText = text(home);
const start = render(StartPage);
const startText = text(start);

test("the hero states the differentiator and leads with one primary action", () => {
  const hero = home.slice(home.indexOf("<h1"), home.indexOf('id="how-it-works"'));
  assert.match(text(hero), /Practice guitar with a plan you can prove\./);
  assert.match(text(hero), /day 1 and day 30/);
  assert.match(text(hero), /no account/i);

  const links = [...hero.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(
    links,
    ["/breakthrough", "/diagnose", "#levels"],
    "the hero carries the free plan, the practice check and the beginner text link, in that order",
  );
  assert.doesNotMatch(hero, /Apply to the room|apps\.apple\.com|strumly|sing\.suedeai/i);
});

test("the homepage runs its sections in the decided order", () => {
  const order = ["how-it-works", "tools", "field-guides", "levels", "advanced", "room", "more"];
  const positions = order.map((id) => home.indexOf(`id="${id}"`));
  positions.forEach((position, index) => assert.ok(position > 0, `#${order[index]} must render`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, `sections must run ${order.join(" → ")}`);
});

test("the founding room is pitched once and keeps its application form on #apply", () => {
  assert.equal((homeText.match(/Apply to the room/g) ?? []).length, 0, "the anchor buttons collapsed into the form");
  assert.equal((home.match(/href="#apply"/g) ?? []).length, 0);
  assert.equal((home.match(/id="apply"/g) ?? []).length, 1);
  const room = home.slice(home.indexOf('id="room"'), home.indexOf('id="more"'));
  assert.ok(room.includes('id="apply"'), "the form sits inside the founding-room section");
  assert.match(text(room), /group of 8–12 players/);
  assert.match(text(room), /see the schedule and price before you commit/);
  assert.match(room, /type="submit"/);
});

test("sister products share one compact row", () => {
  const more = home.slice(home.indexOf('id="more"'));
  assert.match(text(more), /More from Suede AI/);
  for (const name of ["Strumly", "Suede Sing", "The Signal Chain"]) assert.ok(text(more).includes(name), name);
  // Before: four song links, the book shelf and a Strumly guides button competed
  // with the primary action across the page.
  const main = home.slice(home.indexOf("<main"), home.indexOf("</main>"));
  const strumly = [...main.matchAll(/href="(https:\/\/strumly\.suedeai\.ai[^"]*)"/g)].map((match) => match[1]);
  assert.equal(strumly.length, 2, "Strumly is linked from the row only (guides and the book)");
  assert.ok(strumly.every((href) => more.includes(href)));
});

test("no internal status notes reach the visitor", () => {
  for (const [route, value] of [["/", homeText], ["/start", startText], ["/learn", text(render(LearnPage))]] as const) {
    assert.doesNotMatch(value, /being connected|being claimed|previews while|coming soon/i, route);
    assert.doesNotMatch(value, /honest (limits|caveats)|not a fit|what it is not|what we will not promise/i, route);
  }
});

test("/start is a placement, not a copy of the homepage level cards", () => {
  const cards = text(render(LevelPicker));
  assert.ok(!start.includes(cards), "/start must not render the LevelPicker cards");
  for (const level of PLAYER_LEVELS) {
    assert.ok(!startText.includes(level.canAlready), `/start must not restate "${level.canAlready}"`);
    assert.ok(start.includes(`href="${level.href}"`), `/start must still reach ${level.href}`);
  }
  for (const question of PLACEMENT_QUESTIONS) assert.ok(startText.includes(question.prompt), question.id);
  assert.equal((start.match(/type="radio"/g) ?? []).length, PLACEMENT_QUESTIONS.length * 3);

  // A measure of the original problem: 62% of /start was the homepage. Count
  // the share of /start's distinct words that also appear in the homepage's
  // level section, the part it used to copy.
  const levels = home.slice(home.indexOf('id="levels"'), home.indexOf('id="advanced"'));
  const levelWords = new Set(words(text(levels)));
  const main = startText.slice(startText.indexOf("Find your level"));
  const distinct = [...new Set(words(main))];
  const shared = distinct.filter((word) => levelWords.has(word)).length;
  assert.ok(shared / distinct.length < 0.35, `/start shares ${Math.round((100 * shared) / distinct.length)}% of its vocabulary with the homepage level cards`);
});

test("the placement routes to stage 1, stage 3 or the Advanced Lab", () => {
  const answers = (values: number[]) =>
    Object.fromEntries(PLACEMENT_QUESTIONS.map((question, index) => [question.id, values[index]])) as PlacementAnswers;

  assert.equal(placeLevel(answers([0, 0, 0, 0, 0])), "beginner");
  assert.equal(placeLevel(answers([2, 1, 0, 0, 1])), "beginner", "changes with a pause start at stage 1");
  assert.equal(placeLevel(answers([1, 2, 0, 0, 1])), "intermediate");
  assert.equal(placeLevel(answers([2, 2, 1, 1, 2])), "intermediate", "a barre that works on a good day is not yet advanced");
  assert.equal(placeLevel(answers([2, 2, 2, 1, 1])), "advanced");
  assert.equal(placeLevel(answers([2, 2, 2, 0, 2])), "intermediate", "the Lab assumes the pentatonic box");

  for (const level of PLAYER_LEVELS) {
    assert.ok(PLACEMENT_RESULTS[level.id], `${level.id} needs result copy`);
  }
  for (const question of PLACEMENT_QUESTIONS) assert.equal(question.options.length, 3);
});

test("/learn is a hub, not a router", () => {
  const learn = render(LearnPage);
  const learnText = text(learn);
  assert.ok(new Set(words(learnText)).size >= 200, "at least 200 distinct words");
  assert.ok(words(learnText).length >= 350, "at least 350 words");
  for (const href of ["/learn/guitar", "/learn/guitar/routine", "/advanced", "/breakthrough", "/learn/voice/recordings", "/learn/voice/materials", "/start"]) {
    assert.ok(learn.includes(`href="${href}"`), `/learn must link ${href}`);
  }
  assert.match(learn, /href="https:\/\/sing\.suedeai\.ai/);
  assert.match(learn, /href="https:\/\/apps\.apple\.com/);
});

test("the registry describes /start and /learn as they now are", () => {
  const entry = (href: string) => LEARN.find((item) => item.href === href)!;
  assert.match(entry("/start").blurb, /Five quick questions/);
  assert.doesNotMatch(entry("/learn").blurb, /in this browser/);
  assert.match(readFileSync(new URL("../components/SiteNav.tsx", import.meta.url), "utf8"), /href="\/start"/);
});
