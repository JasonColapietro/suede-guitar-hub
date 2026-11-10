/**
 * The five-email follow-up a lead receives over ten days: the plan (or the
 * Field Guide) they asked for, two practice tips that lead to the free module,
 * then two emails with the lifetime offer. Pure: the dispatcher decides when an
 * email is due and renders it here at send time, so the price is the one in
 * force on the day it is sent.
 *
 * No email carries a tracking pixel or a tracked link. Every email ends with
 * the lead's unsubscribe link.
 */
import { FIELD_GUIDES, fieldGuidePdf } from "../field-guides.ts";
import { catalogLessons } from "../learning/catalog.ts";
import { FREE_MODULES } from "../learning/free-module.ts";
import { lessonHref } from "../learning/track.ts";
import { OFFER, SITEMAP_ENTRIES, SITE_URL, lifetimeOfferAt } from "../site.ts";
import type { Lead, Placement } from "./contract.ts";

/** Days after sign-up on which emails 1 to 5 fall. */
export const SEQUENCE_DAYS = [0, 2, 4, 7, 10] as const;

const DAY_MS = 86_400_000;

/**
 * Email `index` is due once `now` reaches the UTC calendar day `SEQUENCE_DAYS[index]`
 * days after sign-up: a lead created at any hour gets it on that day's run. Due means
 * `createdAt` is before this instant. The database query for due leads uses the same cut-off.
 */
export function sequenceCutoff(index: number, now: Date): Date {
  const tomorrow = (Math.floor(now.getTime() / DAY_MS) + 1) * DAY_MS;
  return new Date(tomorrow - SEQUENCE_DAYS[index] * DAY_MS);
}

/** The next email to send, or null when none is due, all five are sent, or the lead unsubscribed. */
export function dueEmailIndex(lead: { createdAt: string; emailsSent: number; unsubscribedAt: string | null }, now: Date): number | null {
  if (lead.unsubscribedAt !== null) return null;
  const index = lead.emailsSent;
  if (!Number.isInteger(index) || index < 0 || index >= SEQUENCE_DAYS.length) return null;
  const created = Date.parse(lead.createdAt);
  if (Number.isNaN(created)) return null;
  return created < sequenceCutoff(index, now).getTime() ? index : null;
}

type Week = { title: string; focus: string };

/** Four weeks to the promise, starting from what the player can already do. */
const WEEKS: Record<Placement, readonly Week[]> = {
  beginner: [
    { title: "D and A", focus: "Fret clean D and A chords, then switch between them on the beat with a slow strum." },
    { title: "E, C and G", focus: "Add E, C and G and play a four-chord progression through without stopping." },
    { title: "Box One", focus: "Learn the first minor pentatonic box and play it up and down in time." },
    { title: "First Solo", focus: "Improvise short phrases over a chord loop and land each one on the root." },
  ],
  intermediate: [
    { title: "Clean changes", focus: "Change between your open chords on the beat at a steady tempo, every string ringing." },
    { title: "Box One", focus: "Learn the first minor pentatonic box and play it up and down in time." },
    { title: "Phrases in the box", focus: "Build two- and four-note phrases from the box and repeat them in time." },
    { title: "First Solo", focus: "Improvise over a chord loop, answer your own phrases and land on the root." },
  ],
  advanced: [
    { title: "Box One in time", focus: "Run the pentatonic box with alternate picking at a steady tempo." },
    { title: "Bends and slides", focus: "Add bends and slides to your box phrases and hit the target note in tune." },
    { title: "Call and answer", focus: "Play a phrase, then answer it, over a twelve-bar chord loop." },
    { title: "First Solo", focus: "Improvise a full chorus over the twelve-bar and record the take." },
  ],
};

/** The free module each placement starts with (shared contract table). */
const FREE_MODULE_NAMES: Record<Placement, string> = { beginner: "D and A", intermediate: "Box One", advanced: "First Solo" };

const CHART_PACK_URL = `${SITE_URL}/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf`;
const PLAN_URL = `${SITE_URL}/breakthrough`;
const START_URL = `${SITE_URL}/start`;

/** The first lesson after the placement's free module: the page where lifetime access opens the next step. */
function nextLessonUrl(placement: Placement): string {
  const lessons = catalogLessons("guitar");
  const last = lessons.findLastIndex((entry) => entry.module.id === FREE_MODULES[placement]);
  const next = last >= 0 ? lessons[last + 1] : undefined;
  return `${SITE_URL}${next ? lessonHref("guitar", next.lesson.id) : "/learn/guitar"}`;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "link"; text: string; label: string; href: string }
  | { kind: "list"; items: readonly string[] };

const p = (text: string): Block => ({ kind: "p", text });
const link = (text: string, label: string, href: string): Block => ({ kind: "link", text, label, href });

function escapeHTML(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(subject: string, blocks: readonly Block[], unsubscribeUrl: string) {
  const footer = "You asked for your GuitarHub plan and practice tips at guitarhub.org.";
  const text = [
    ...blocks.map((block) => block.kind === "p" ? block.text
      : block.kind === "link" ? `${block.text}\n${block.href}`
      : block.items.map((item) => `- ${item}`).join("\n")),
    "--",
    `${footer}\nUnsubscribe: ${unsubscribeUrl}`,
  ].join("\n\n");
  const body = blocks.map((block) => block.kind === "p" ? `<p>${escapeHTML(block.text)}</p>`
    : block.kind === "link" ? `<p>${escapeHTML(block.text)}<br><a href="${escapeHTML(block.href)}">${escapeHTML(block.label)}</a></p>`
    : `<ul>${block.items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`).join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHTML(subject)}</title></head>`
    + `<body style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#1d1a24;max-width:560px;margin:0 auto;padding:16px">\n${body}\n`
    + `<hr style="border:0;border-top:1px solid #ddd;margin:24px 0"><p style="font-size:13px;color:#555">${escapeHTML(footer)}<br>`
    + `<a href="${escapeHTML(unsubscribeUrl)}">Unsubscribe</a></p></body></html>`;
  return { subject, text, html };
}

function guideTitle(slug: string | undefined) {
  const guide = FIELD_GUIDES.find((entry) => entry.slug === slug);
  if (!guide) return null;
  return { title: SITEMAP_ENTRIES.find((entry) => entry.href === guide.href)?.title ?? guide.coverTitle, pdf: `${SITE_URL}${fieldGuidePdf(guide)}` };
}

function offerBlocks(now: Date): Block[] {
  const offer = lifetimeOfferAt(now);
  return [p(offer.launchNote ? `Lifetime access: ${offer.oneTime}. ${offer.launchNote}` : `Lifetime access: ${offer.oneTime}.`), p(OFFER.guarantee)];
}

/**
 * Email `index` (0 to 4) for `lead`. `now` picks the lifetime price in force, so
 * call it at send time.
 */
export function sequenceEmail(index: number, lead: Lead, unsubscribeUrl: string, now: Date = new Date()): { subject: string; text: string; html: string } {
  const placement: Placement = lead.placement ?? "beginner";
  const freeModule = FREE_MODULE_NAMES[placement];
  const weeks = WEEKS[placement].map((week, i) => `Week ${i + 1}, ${week.title}: ${week.focus}`);
  switch (index) {
    case 0: {
      const guide = lead.source === "guide" ? guideTitle(lead.guideId) : null;
      if (guide) {
        return render(`Your Field Guide: ${guide.title}`, [
          link("Here is your Field Guide, ready to download and print.", `Download ${guide.title} (PDF)`, guide.pdf),
          p(`Put it to work with a 30-day plan. ${OFFER.promise} Here are your four weeks:`),
          { kind: "list", items: weeks },
          link("Print the chord and pentatonic chart pack and keep it on your music stand.", "Download the chart pack (PDF)", CHART_PACK_URL),
          link(`Start week one today with your free module, ${freeModule}.`, "Start your free module", START_URL),
        ], unsubscribeUrl);
      }
      return render("Your 30-day plan: real chords to your first solo", [
        p(`Here is your plan. ${OFFER.promise}`),
        p("Your four weeks:"),
        { kind: "list", items: weeks },
        p("Practise 15 to 20 minutes a day, at least four days a week. Finish each week's focus before you start the next."),
        link("Print the chord and pentatonic chart pack and keep it on your music stand.", "Download the chart pack (PDF)", CHART_PACK_URL),
        link("Set your days and session length, and tick off each step as you go, in the plan builder.", "Open your plan", PLAN_URL),
        link(`Start week one today with your free module, ${freeModule}.`, "Start your free module", START_URL),
      ], unsubscribeUrl);
    }
    case 1:
      return render("Ten minutes a day builds your chord changes", [
        p("Chord changes get fast through short sessions on most days. Your hands keep the move from one day to the next."),
        p("A ten-minute session:"),
        { kind: "list", items: [
          "2 minutes: tune, then play each chord once, slowly, every string ringing.",
          "5 minutes: the one change you are working on, slowly, on every beat.",
          "3 minutes: play it in time with a metronome or a song you like.",
        ] },
        link(`Your free module, ${freeModule}, turns these sessions into guided lessons. Answer five questions and GuitarHub starts you at the right module.`, "Start your free module", START_URL),
      ], unsubscribeUrl);
    case 2:
      return render("The tempo rule for clean changes and solos", [
        p("Find the tempo where you play the change cleanly three times in a row. Stay there for two minutes, then raise it by 5 BPM. When a change buzzes, drop back 5 and play it clean again."),
        p("Clean and in time first, then faster. That is how your chord changes become automatic and how your first solo phrases land on the beat."),
        link(`Your free module, ${freeModule}, takes you through it lesson by lesson.`, "Start your free module", START_URL),
      ], unsubscribeUrl);
    case 3:
      return render("Week one done. Here is the full path", [
        p(`One week into your plan, you have the foundation. Lifetime access takes you the rest of the way. ${OFFER.promise}`),
        p("One payment opens every guided guitar lesson, from first chords through your first solo and on to advanced soloing, yours for life."),
        ...offerBlocks(now),
        link("Unlock the lesson after your free module and keep your plan moving.", "Get lifetime access", nextLessonUrl(placement)),
      ], unsubscribeUrl);
    case 4:
      return render("Your first solo, in 30 days", [
        p(`Ten days ago you started your plan. ${OFFER.promise}`),
        p(`Lifetime access gives you a guided lesson for every week of it, ${placement === "advanced" ? "from First Solo" : `from ${freeModule} through First Solo`}, and every stage after it.`),
        ...offerBlocks(now),
        link("Pick up where your free module ends.", "Get lifetime access", nextLessonUrl(placement)),
      ], unsubscribeUrl);
    default:
      throw new RangeError(`No sequence email at index ${index}`);
  }
}
