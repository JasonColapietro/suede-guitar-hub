import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { register } from "node:module";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PROMISE_GOAL, createBreakthroughPlan, restoreBreakthroughState } from "../lib/breakthrough.ts";
import { freeModuleLessonIds } from "../lib/learning/free-module.ts";
import { lessonHref } from "../lib/learning/track.ts";
import { OFFER, TOOLS } from "../lib/site.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { default: BreakthroughPage } = await import("../app/breakthrough/page.tsx");
const { default: ChartPackPage, metadata: chartPackMetadata } = await import("../app/plan/chart-pack/page.tsx");
const { LeadForm, leadRequestBody, sendLead } = await import("../components/LeadForm.tsx");
const { FieldGuideShelf } = await import("../components/FieldGuides.tsx");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (component: FunctionComponent<any>, props: object = {}) => renderToStaticMarkup(createElement(component, props));
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

/** The form's honeypot input: the one input a person never sees or reaches. */
const HONEYPOT = /<input[^>]*name="company"[^>]*>/;

test("the plan follows the 30-day path through existing lessons", () => {
  const plan = createBreakthroughPlan({ goal: PROMISE_GOAL, experience: "advanced-beginner", daysPerWeek: 4, minutesPerSession: 20 });
  assert.deepEqual(plan.weeks.map(week => week.title), ["D and A", "E, C and G", "Box One", "First Solo"]);
  assert.deepEqual(plan.weeks.map(week => week.resource.href), ["g-l2-m1", "g-l3-m2", "g-l4-m1", "g-l5-m4"].map(id => lessonHref("guitar", freeModuleLessonIds(id)[0])));
  assert.equal(restoreBreakthroughState(JSON.stringify({ profile: { goal: "complete-song", experience: "intermediate", daysPerWeek: 3, minutesPerSession: 15 }, completedActionIds: [] }))?.profile.goal, "complete-song"); // an old saved plan still opens
});

test("/breakthrough is the 30-day plan magnet", () => {
  const page = text(render(BreakthroughPage));
  assert.match(page, /Your 30-Day Chords-to-First-Solo Plan/); assert.ok(page.includes(OFFER.promise));
  assert.doesNotMatch(page, /breakthrough room|founding room|stalled/i);
  const form = render(LeadForm, { source: "plan", buttonLabel: "Email me the full plan" });
  // One input a person fills in. The honeypot is the only other input, and it is hidden from people.
  assert.equal((form.replace(HONEYPOT, "").match(/<input/g) ?? []).length, 1); assert.match(form, /type="email"/);
  assert.doesNotMatch(form, /type="checkbox"/);
  assert.match(text(form), /We'll email your plan and practice tips\. Unsubscribe any time\./);
});

test("a PDF guide asks for an email first and never withholds the file on our failure", () => {
  const shelf = render(FieldGuideShelf, {});
  assert.doesNotMatch(shelf, /href="\/field-guides\/[^"]+\.pdf"/, "no direct PDF link before the email");
  assert.doesNotMatch(text(shelf), /No account, no email/);
  const source = read("components/LeadForm.tsx");
  assert.match(source, /magnet_submitted/); assert.match(source, /catch/);   // on a failed post the download link is still shown
});

test("the chart pack exists and the route keeps its URL", () => { assert.ok(existsSync("public/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf")); assert.ok(TOOLS.some(tool => tool.href === "/breakthrough")); });

test("the lead form's honeypot is hidden, unreachable and never autofilled", () => {
  const form = render(LeadForm, { source: "guide", guideId: "the-method", buttonLabel: "Email me the guide" });
  const honeypot = form.match(HONEYPOT)?.[0];
  assert.ok(honeypot, "the form carries the company honeypot");
  assert.match(honeypot, /tabindex="-1"/);
  assert.match(honeypot, /autoComplete="off"/i);
  assert.match(form, /aria-hidden="true"[^>]*>(?:(?!<\/div>)[\s\S])*name="company"/, "the honeypot sits inside an aria-hidden wrapper");
});

test("the lead body is the shared contract plus an empty honeypot", () => {
  assert.deepEqual(leadRequestBody({ email: " player@example.com ", source: "plan", placement: null, company: "" }), { email: "player@example.com", source: "plan", company: "" });
  assert.deepEqual(leadRequestBody({ email: "player@example.com", source: "plan", placement: "intermediate", company: "" }), { email: "player@example.com", source: "plan", placement: "intermediate", company: "" });
  assert.deepEqual(leadRequestBody({ email: "player@example.com", source: "guide", guideId: "the-method", placement: null, company: "" }), { email: "player@example.com", source: "guide", guideId: "the-method", company: "" });
  const source = read("components/LeadForm.tsx");
  assert.match(source, /readFreeModuleChoice\(browserStorage\(\)\)/, "placement comes from the stored free-module choice");
});

test("a lead post reports its outcome and never throws", async () => {
  const body = { email: "player@example.com", source: "plan" as const, company: "" };
  const answering = (status: number) => async () => ({ ok: status < 300, status });
  assert.equal(await sendLead(answering(204), body), "sent");
  assert.equal(await sendLead(answering(400), body), "invalid");
  assert.equal(await sendLead(answering(503), body), "failed");
  assert.equal(await sendLead(async () => { throw new TypeError("offline"); }, body), "failed");
  const calls: { url: string; init: RequestInit }[] = [];
  await sendLead(async (url, init) => { calls.push({ url, init }); return { ok: true, status: 204 }; }, body);
  assert.equal(calls[0].url, "/api/leads");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), body);
});

test("the download opens on submit, before the lead post answers", () => {
  const source = read("components/LeadForm.tsx");
  const submit = source.slice(source.indexOf("function submit("));
  assert.ok(submit.indexOf("setUnlocked(true)") > 0, "submit unlocks the download");
  assert.ok(submit.indexOf("setUnlocked(true)") < submit.indexOf("sendLead("), "the download opens before the post is sent");
  assert.doesNotMatch(submit.slice(0, submit.indexOf("sendLead(")), /await/, "nothing waits before the download opens");
});

test("the magnet copy makes no listening claim", () => {
  const LISTENING = /\b(hears?|detects?|scores?|listens? to)\b[^.]{0,40}\bchords?\b/i;
  for (const markup of [render(BreakthroughPage), render(ChartPackPage), render(LeadForm, { source: "plan", buttonLabel: "Email me the full plan" })]) {
    assert.doesNotMatch(text(markup), LISTENING);
    assert.doesNotMatch(text(markup), /\$\d/, "no price is typed on the magnet");
  }
});

test("the chart pack prints the path's open chords and box one, and stays out of search", () => {
  assert.deepEqual(chartPackMetadata.robots, { index: false, follow: false });
  const markup = render(ChartPackPage);
  const chords = [...markup.matchAll(/<figcaption>([^<]+) chord<\/figcaption>/g)].map(match => match[1]);
  assert.deepEqual(chords, ["D", "A", "E major", "C major", "G major", "E minor", "A minor", "D minor"]);
  // Box one is the authored g-l4-m1-02 route: A minor pentatonic, frets 5 to 8, roots on A.
  const box = markup.match(/aria-label="(A minor pentatonic box one[^"]*)"/)?.[1] ?? "";
  for (const note of ["String 6: fret 5 A (root), fret 8 C", "String 5: fret 5 D, fret 7 E", "String 4: fret 5 G, fret 7 A (root)", "String 3: fret 5 C, fret 7 D", "String 2: fret 5 E, fret 8 G", "String 1: fret 5 A (root), fret 8 C"]) {
    assert.ok(box.includes(note), `box one names ${note}`);
  }
  assert.match(text(markup), /Week 1 · D and A/);
  assert.match(text(markup), /Week 3 · Box One/);
});
