import type { Metadata } from "next";
import Link from "next/link";
import BreakthroughPlanner from "@/components/BreakthroughPlanner";
import { CHART_PACK_PDF, LeadForm } from "@/components/LeadForm";
import SiteNav from "@/components/SiteNav";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { webPageNode } from "@/lib/page-schema";
import SiteFooter from "@/components/SiteFooter";
import { keywordsFor } from "@/lib/keywords";
import { PROMISE_GOAL, createBreakthroughPlan } from "@/lib/breakthrough";
import { OFFER } from "@/lib/site";

const CANONICAL = "https://guitarhub.org/breakthrough";

const PLAN_NAME = "Your 30-Day Chords-to-First-Solo Plan";
const TITLE = `${PLAN_NAME} | GuitarHub`;
const DESCRIPTION =
  "A free four-week practice sequence from D and A to your first solo, with a printable chord and pentatonic chart pack sent to your inbox.";

/**
 * The `openGraph` block is not optional here. Next merges page metadata key by
 * key, so a page that omits `openGraph` inherits the root layout's block whole
 * — including its `url`, which would make every share of this page advertise
 * `og:url` as the home page.
 */
export const metadata: Metadata = {
  keywords: keywordsFor("/breakthrough"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: `${OFFER.promise} Four weeks, four guided lessons and a printable chord and pentatonic chart pack.`,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    // No `images` key: Next attaches the colocated opengraph-image.tsx card
    // only when the page leaves `images` unset.
  },
  alternates: { canonical: CANONICAL },
};

// The Organization, Person and WebSite nodes are declared once in
// app/layout.tsx, which renders on this route too, so these reference the
// canonical estate @ids rather than minting duplicates for the same entities.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const SITE_ID = "https://guitarhub.org/#website";

// The other three tools each carry a SoftwareApplication node; this one is the
// primary CTA target from every page's closer and had none, so nothing
// machine-readable said what it is or that it is free.
/** Read by both the visible trail and the BreadcrumbList node below. */
const CRUMBS = [
  ...crumbTrail("Tools", "/tools"),
  { name: "30-day chords-to-first-solo plan", href: "/breakthrough" },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${CANONICAL}#tool`,
      name: "30-day chords-to-first-solo plan",
      url: CANONICAL,
      description:
        "Builds a four-week guitar plan from D and A chords to a first improvised solo, with a practice action for every practice day and a piece of evidence to record at the end of each week.",
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Music practice tool",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript.",
      isAccessibleForFree: true,
      // Free: the plan, the schedule builder and the chart pack have no
      // payment step and no account.
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "Four weeks from D and A, through E, C and G and the first pentatonic box, to a first solo",
        "A guided lesson for every week",
        "Practice actions sized to your days and minutes",
        "A printable chord and pentatonic chart pack, sent by email",
        "Progress checkboxes stored in the browser, with no account",
      ],
      inLanguage: "en-US",
      isPartOf: { "@id": SITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
    webPageNode({
      canonical: CANONICAL,
      name: TITLE,
      description: DESCRIPTION,
      mainEntity: `${CANONICAL}#tool`,
      crumbs: CRUMBS,
    }),
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

/** The plan everyone starts from: the summary on this page and the plan the email sends. */
const PATH = createBreakthroughPlan({ goal: PROMISE_GOAL, experience: "advanced-beginner", daysPerWeek: 4, minutesPerSession: 20 });

/** The /method loop, run inside every week of the plan. */
const LOOP = [
  ["Baseline", "Record one real attempt at the week's work and name the spot where it breaks."],
  ["Isolate", "Cut that spot down to the smallest piece that still breaks and repair that one piece."],
  ["Reconnect", "Put the repair back into the full change, the box or the phrase, with the click on."],
  ["Prove", "Record the week's evidence and play it beside the first take."],
] as const;

export default function BreakthroughPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* The shared header and footer, so this page is part of the site rather
          than a dead end: both carry links to every other tool and guide. */}
      <SiteNav />

      <Breadcrumbs crumbs={CRUMBS} />

      <main id="main-content" tabIndex={-1}>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-cream md:py-24">
            <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="text-center lg:text-left">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-pale">
                  Free 30-day plan
                </span>
                <h1 className="mt-7 text-5xl leading-tight md:text-6xl">{PLAN_NAME}</h1>
                <p className="mt-6 text-2xl leading-snug text-peach">{OFFER.promise}</p>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75 lg:max-w-none">
                  Four weeks, one guided lesson each: D and A, then E, C and G,
                  then the first minor pentatonic box, then your first solo over
                  an A blues. Get the full plan and a printable chord and
                  pentatonic chart pack by email.
                </p>
              </div>
              <div className="rounded-3xl bg-cream p-6 text-ink shadow-xl md:p-8">
                <p className="font-display text-2xl text-indigo-deep">Get the full plan</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  The four weeks, a daily practice shape and the chart pack for
                  your music stand.
                </p>
                <div className="mt-5">
                  <LeadForm source="plan" buttonLabel="Email me the full plan" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="plan-summary" aria-labelledby="plan-summary-title" className="mx-auto max-w-6xl px-6 pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">Your plan at a glance</p>
          <h2 id="plan-summary-title" className="mt-4 max-w-3xl text-4xl text-indigo-deep md:text-5xl">
            Four weeks from first chords to your first solo
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink/70">
            {PATH.finishLine} Practise 15 to 20 minutes a day, at least four
            days a week, and finish each week&apos;s focus before you start the
            next.
          </p>
          <ol className="mt-10 grid gap-5 md:grid-cols-2">
            {PATH.weeks.map((week) => (
              <li key={week.week} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet">Week {week.week}</p>
                <h3 className="mt-2 font-display text-2xl text-indigo-deep">{week.title}</h3>
                <p className="mt-3 text-ink/75">{week.focus}</p>
                <p className="mt-3 text-sm text-ink/70">
                  <strong className="text-indigo-deep">Proof:</strong> {week.evidence}
                </p>
                <Link
                  href={week.resource.href}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-violet underline underline-offset-4 hover:text-indigo-deep"
                >
                  {week.resource.label} <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-ink/70">
            The chart pack prints every open chord in weeks 1 and 2 and the box
            one map for weeks 3 and 4:{" "}
            <a href={CHART_PACK_PDF} download className="font-semibold text-violet underline underline-offset-4 hover:text-indigo-deep">
              chord and pentatonic chart pack (PDF)
            </a>
            .
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <p className="max-w-2xl text-sm leading-relaxed text-ink/70">
            This is the planner rather than the guide: it turns one finish line into four weeks of focuses and a piece of evidence to record each week. Choosing a finish line of your own and judging the day 30 recording are written out in{" "}
            <Link
              href="/30-day-guitar-challenge"
              className="font-semibold text-violet underline underline-offset-4 hover:text-indigo-deep"
            >
              the 30-day guitar challenge
            </Link>
            .
          </p>
          <div className="mt-10">
            <BreakthroughPlanner />
          </div>
        </section>

        <section className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">Inside every week</p>
            <h2 className="mt-4 max-w-3xl text-4xl text-indigo-deep md:text-5xl">
              Each week ends with a recording that proves the change.
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink/70">
              Every week of the plan runs the same four steps. To see what each
              stage asks and how you know you can move on, read{" "}
              <Link
                href="/method"
                className="font-semibold text-violet underline underline-offset-4 hover:text-indigo-deep"
              >
                the GuitarHub method
              </Link>
              .
            </p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-2 lg:grid-cols-4">
              {LOOP.map(([title, body]) => (
                <article key={title} className="bg-cream p-7">
                  <h3 className="font-display text-2xl text-indigo-deep">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
