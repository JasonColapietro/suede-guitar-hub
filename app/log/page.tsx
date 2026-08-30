import type { Metadata } from "next";
import Link from "next/link";
import PracticeLog from "@/components/PracticeLog";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { GUIDES, OG_IMAGE, SITE_URL, STRUMLY, TOOLS, isInternalHref } from "@/lib/site";

const CANONICAL = `${SITE_URL}/log`;
const PUBLISHED = "2026-08-29";

const TITLE = "Practice Evidence Log | GuitarHub";
const DESCRIPTION =
  "Log one line per guitar session — the date, the focus, and the tempo or pass rate you hit — then see what actually moved. No streaks, no account, no upload.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: "Practice Evidence Log",
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    // Required, not decorative: a page-level `openGraph` block replaces the
    // root layout's resolved object, taking the file-convention card with it.
    // See OG_IMAGE in lib/site.ts.
    images: [OG_IMAGE],
  },
  alternates: { canonical: CANONICAL },
};

/**
 * Rendered as the visible ordered list AND as the HowTo steps below, from this
 * one array. Schema.org requires the marked-up steps to appear on the page, so
 * generating both from a single source is the only way to keep that true after
 * an edit.
 */
const STEPS = [
  {
    name: "Log the session while it is still true",
    text: "Pick the day you practised and write it down before the evening rewrites it. The log will not accept a date in the future, because a record of what has not happened yet is the one thing it must never hold.",
  },
  {
    name: "Name the focus the same way every time",
    text: "One passage or one skill, not a whole song. Capitals and extra spaces are ignored, so the sessions group together, but a focus called something different each week never accumulates enough sessions to show you anything.",
  },
  {
    name: "Record the number you actually reached",
    text: "Either the fastest tempo you played it cleanly, in beats per minute, or your clean run-throughs as a share of your attempts out of 100. Not the fastest you attempted, and not the one good take.",
  },
  {
    name: "Write the one honest line",
    text: "A single sentence on whether it moved. No change is a perfectly good entry, and a more useful one than a good mood, because it is the entry that tells you next week whether the thing you changed was the thing that worked.",
  },
  {
    name: "Read the summary, including where it refuses to answer",
    text: "You get sessions logged, distinct focuses, and the best number per focus over the last 7 and the last 30 days. A focus with fewer than three sessions is reported as not enough evidence yet, rather than given a direction.",
  },
] as const;

const REFUSALS = [
  {
    title: "No streak counter",
    body: "Deliberately absent, and it is not an oversight. A streak measures attendance: it goes up on a session that changed nothing, and it drops to zero on a week off that changed a lot. It is a number that always moves, which is exactly why it feels like evidence and is not.",
  },
  {
    title: "No direction under three sessions",
    body: "Two points draw a straight line through any pair of numbers, including a good day next to a bad one. Under three sessions on a focus, the tool returns not enough evidence yet. That rule lives in the code rather than in this paragraph, so nothing built on top of it can talk its way past it.",
  },
  {
    title: "A rise with a falling floor is not a rise",
    body: "If your average went up but your worst session went down with it, that is a wider spread, not progress, and the log says so. The same goes the other way: an average that held while the individual sessions swung is reported as no clear direction, not as holding steady.",
  },
  {
    title: "A decline is shown, not buried",
    body: "When the later sessions average below the earlier ones, the log says that in a sentence. A tool that only ever reports good news is a tool whose good news means nothing.",
  },
  {
    title: "Tempo is never averaged with a pass rate",
    body: "If a focus switched from beats per minute to clean passes, only the sessions using the most recent measure feed the comparison, and the count left out is shown next to it. Averaging the two would produce a confident number about nothing.",
  },
  {
    title: "Nothing leaves this browser",
    body: "There is no account, no upload, and no network call. Sessions are stored in this browser only. Export writes a plain JSON file you keep, importing it adds those sessions back, and the clear button removes the lot.",
  },
];

const LIMITS = [
  "It cannot hear you. Every number in it is one you typed, and the log is worth exactly as much as your honesty about them.",
  "It does not know why anything changed. It can tell you the tempo moved; it cannot tell you that your left hand is late because your right hand is early.",
  "It is not a practice plan. Use the tempo ladder or the 30-day planner to decide what to do, and this to record what happened.",
  "A direction over three sessions is a small piece of evidence, not a finding. More sessions on one focus make it worth more.",
];

const RELATED_HREFS = [
  "/diagnose",
  "/session",
  "/tempo",
  "/readiness",
  "/deliberate-practice-guitar",
  "/practicing-guitar-with-a-metronome",
  "/30-day-guitar-challenge",
  "/method",
] as const;

const RELATED = RELATED_HREFS.flatMap((href) =>
  [...TOOLS, ...GUIDES].filter((entry) => entry.href === href),
);

// The canonical estate @ids, copied from app/layout.tsx. Referenced rather than
// redefined: the Organization and Person nodes are declared once in the root
// layout, which renders on this page too.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const SITE_ID = "https://guitarhub.org/#website";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${CANONICAL}#tool`,
      name: "Practice Evidence Log",
      url: CANONICAL,
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Guitar practice tool",
      operatingSystem: "Web",
      browserRequirements:
        "Runs entirely in the browser. Requires JavaScript. No account, and nothing is uploaded.",
      description: DESCRIPTION,
      inLanguage: "en-US",
      isAccessibleForFree: true,
      // Genuinely free, so the price is a fact rather than a marketing claim.
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "One-line session entries with a date, a focus, a measure, and a note",
        "Sessions logged and distinct focuses over the last 7 and 30 days",
        "Best and latest value per focus, with the measures kept separate",
        "A per-focus direction that is withheld below three sessions",
        "No streak counter and no gamification, by design",
        "Export and import the whole log as plain JSON, with no account",
      ],
      author: { "@id": JASON_PERSON_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      isPartOf: { "@id": SITE_ID },
    },
    {
      "@type": "HowTo",
      "@id": `${CANONICAL}#howto`,
      name: "How to keep a guitar practice log that produces evidence",
      description:
        "Record one line per practice session — the date, the focus, the number you reached, and whether it moved — and read the direction only once there is enough of it to mean something.",
      inLanguage: "en-US",
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      // Text, not a node reference: schema.org gives `tool` the range
      // HowToTool | Text, so pointing it at the SoftwareApplication @id is a
      // range violation. That node is already attached to this page via
      // isPartOf, so nothing is lost by naming the tool here.
      tool: "Practice Evidence Log",
      step: STEPS.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
        url: `${CANONICAL}#how-it-works`,
      })),
      author: { "@id": JASON_PERSON_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      isPartOf: { "@id": SITE_ID },
      mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    },
  ],
};

const LINK_PILL =
  "inline-flex min-h-11 items-center gap-1 rounded-full bg-cream-soft px-5 py-2.5 " +
  "text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white";

const INLINE_LINK =
  "text-indigo-deep underline underline-offset-4 hover:text-violet";

export default function LogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SiteNav />

      <main>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
              GuitarHub tool
            </span>
            <h1 className="mx-auto mt-7 max-w-4xl text-4xl leading-tight md:text-6xl">
              A streak proves you showed up.{" "}
              <em className="font-display italic text-peach">
                This proves something changed.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              One line per session: the day, what you worked on, the tempo or
              pass rate you actually reached, and an honest sentence about
              whether it moved. Then a read on the last 7 and 30 days — which
              stays silent about any focus that has not earned a verdict yet.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#log"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                Log a session <span aria-hidden>→</span>
              </a>
              <Link
                href="/tools"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
              >
                All the free tools <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            The problem this fixes
          </p>
          <h2 className="mt-4 text-3xl leading-snug text-indigo-deep md:text-4xl">
            You know you practised.{" "}
            <em className="font-display italic">
              You do not know whether it worked.
            </em>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Most practice records answer the easy question. They count days,
            minutes, and sessions — all things you can produce without playing
            anything better at the end of them. A month of that leaves you with
            a number that went up and a passage that did not.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            The hard question is whether anything moved, and it needs two things
            a streak never asks for: a specific focus, and a number attached to
            it. Log those, and after three sessions on the same focus the
            comparison starts to mean something. Log them for a month and you
            can tell which of the things you changed was the thing that worked.
            That is the same loop the{" "}
            <Link href="/method" className={INLINE_LINK}>
              GuitarHub method
            </Link>{" "}
            runs on, and the reason{" "}
            <Link href="/deliberate-practice-guitar" className={INLINE_LINK}>
              deliberate practice
            </Link>{" "}
            asks for a measurement rather than a duration.
          </p>
        </section>

        <section id="log" className="mx-auto max-w-6xl px-6 pb-20 scroll-mt-24">
          <PracticeLog />
        </section>

        <section id="how-it-works" className="bg-cream-soft px-6 py-20 scroll-mt-24">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
              How this works
            </p>
            <h2 className="mt-4 text-3xl leading-snug text-indigo-deep md:text-4xl">
              Five fields,{" "}
              <em className="font-display italic">and one rule about them.</em>
            </h2>

            <ol className="mt-10 grid gap-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.name}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 rounded-2xl bg-cream p-5 ring-1 ring-ink/5"
                >
                  <span
                    aria-hidden
                    className="grid size-10 place-items-center rounded-full bg-violet text-sm font-bold text-white"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-xl text-indigo-deep">
                      {step.name}
                    </span>
                    <span className="mt-2 block leading-relaxed text-ink/70">
                      {step.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-14 font-display text-2xl leading-snug text-indigo-deep">
              What the log refuses to do
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              A practice tool earns its answers by being willing to give none.
              These six refusals are enforced in the code that computes the
              summary, not in the copy describing it.
            </p>

            <div className="mt-8 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 sm:grid-cols-2">
              {REFUSALS.map((refusal) => (
                <article key={refusal.title} className="bg-cream p-7">
                  <h4 className="font-display text-xl leading-snug text-indigo-deep">
                    {refusal.title}
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {refusal.body}
                  </p>
                </article>
              ))}
            </div>

            <h3 className="mt-14 font-display text-2xl leading-snug text-indigo-deep">
              Where the number comes from
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              Pick whichever measure suits the thing you are working on. A
              passage with a speed ceiling wants a tempo — build the steps with
              the{" "}
              <Link href="/tempo" className={INLINE_LINK}>
                tempo ladder
              </Link>{" "}
              and log the rung you reached. Something that falls apart at random
              wants a pass rate: ten attempts, six clean, log 60. If you are
              unsure which failure you are looking at, the{" "}
              <Link href="/readiness" className={INLINE_LINK}>
                song readiness score
              </Link>{" "}
              names it, and{" "}
              <Link href="/practicing-guitar-with-a-metronome" className={INLINE_LINK}>
                practising with a metronome
              </Link>{" "}
              covers how to take a tempo reading you can trust.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-3xl leading-snug text-indigo-deep md:text-4xl">
            What this does not do.
          </h2>
          <ul className="mt-8 space-y-4">
            {LIMITS.map((limit) => (
              <li
                key={limit}
                className="rounded-2xl bg-white p-6 text-ink/75 ring-1 ring-ink/5"
              >
                {limit}
              </li>
            ))}
          </ul>

          <p className="mt-10 text-ink/70">
            What to run when the log says a focus has stopped moving:
          </p>
          {/* Pills rather than links inside the sentence: an inline-flex link
              cannot wrap mid-phrase, and a 20px inline link is not a tap
              target at 390px. */}
          <ul className="mt-5 flex flex-wrap gap-3">
            <li>
              <Link href="/guitar-practice-plateau" className={LINK_PILL}>
                Why practice plateaus <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link href="/tools" className={LINK_PILL}>
                All the free tools <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <a
                href={STRUMLY.practiceRoutine}
                target="_blank"
                rel="noopener"
                className={LINK_PILL}
              >
                Designing a practice routine <span aria-hidden>↗</span>
              </a>
            </li>
            <li>
              <a
                href={STRUMLY.path}
                target="_blank"
                rel="noopener"
                className={LINK_PILL}
              >
                A staged learning path <span aria-hidden>↗</span>
              </a>
            </li>
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-violet">
            Where to go next
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RELATED.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="block h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5 transition hover:shadow-md motion-safe:hover:-translate-y-1"
                >
                  <h3 className="font-display text-xl leading-snug text-indigo-deep">
                    {entry.title}{" "}
                    <span aria-hidden>{isInternalHref(entry.href) ? "→" : "↗"}</span>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">
                    {entry.blurb}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-3 pb-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
            <h2 className="mx-auto max-w-3xl text-4xl leading-tight text-cream md:text-5xl">
              The log tells you it stopped moving.{" "}
              <em className="font-display italic text-peach">
                It cannot tell you why.
              </em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              That part still takes another set of ears. The founding room is
              being assembled for it: a small crew, a weekly recording, and one
              correction that changes the next session. Applying starts a fit
              conversation. It does not charge you or create a commitment.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                Apply to the room <span aria-hidden>→</span>
              </Link>
              <Link
                href="/breakthrough"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
              >
                Build the 30-day plan <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
