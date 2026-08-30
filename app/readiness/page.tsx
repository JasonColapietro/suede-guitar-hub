import type { Metadata } from "next";
import Link from "next/link";
import Readiness from "@/components/Readiness";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { GUIDES, OG_IMAGE, SITE_URL, STRUMLY, TOOLS, isInternalHref } from "@/lib/site";

const CANONICAL = `${SITE_URL}/readiness`;
const PUBLISHED = "2026-08-29";

const TITLE = "Song Readiness Score | GuitarHub";
const DESCRIPTION =
  "Score a guitar song against ten checks that decide whether it survives outside practice conditions, then get the single highest-leverage thing to fix.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: "Song Readiness Score",
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
    name: "Name the song",
    text: "Type in one song you would call finished. It is stored under that name in this browser, so you can come back and score it again after you have done something about the result.",
  },
  {
    name: "Answer the ten checks",
    text: "Each check is a yes or no about something that has either happened or has not. None of them ask how well you play. If you are unsure whether you can start it cold, the honest answer is no.",
  },
  {
    name: "Read the score and the band",
    text: "The score is the weighted total of the checks you ticked, shown from 0 to 100. The band names what that total means: practice-room only, good-day only, nearly there, or stage-ready.",
  },
  {
    name: "Do the one action it hands back",
    text: "The tool returns the heaviest check still open, with an instruction you can run in a single practice session. One thing this week, rather than a list of ten.",
  },
  {
    name: "Score it again afterwards",
    text: "Change an answer only once the thing has actually happened. The score is worth something only for as long as the checks stay honest.",
  },
] as const;

const RELATED_HREFS = [
  "/method",
  "/breakthrough",
  "/guitar-practice-plateau",
  "/30-day-guitar-challenge",
] as const;

const RELATED = RELATED_HREFS.flatMap((href) =>
  [...TOOLS, ...GUIDES].filter((entry) => entry.href === href),
);

// The canonical estate @ids, copied from app/layout.tsx. Referenced rather than
// redefined: the Organization and Person nodes are declared once in the root
// layout, which renders on this page too.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${CANONICAL}#tool`,
      name: "Song Readiness Score",
      url: CANONICAL,
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Guitar practice tool",
      operatingSystem: "Web",
      browserRequirements:
        "Runs entirely in the browser. Requires JavaScript. No account, and nothing is uploaded.",
      description: DESCRIPTION,
      inLanguage: "en-US",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Ten weighted performance-readiness checks",
        "Weighted 0-100 score with four named readiness bands",
        "The single highest-leverage unchecked item, with an instruction",
        "Multiple songs tracked in the browser, with no account",
      ],
      author: { "@id": JASON_PERSON_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      isPartOf: { "@id": "https://guitarhub.org/#website" },
    },
    {
      "@type": "HowTo",
      "@id": `${CANONICAL}#howto`,
      name: "How to tell whether a guitar song is performance-ready",
      description:
        "Test one song against the conditions that break a performance: a cold start, a mistake mid-song, full tempo, and a listener in the room. Then act on the heaviest failure first.",
      inLanguage: "en-US",
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      step: STEPS.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
        url: `${CANONICAL}#how-it-works`,
      })),
      author: { "@id": JASON_PERSON_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    },
  ],
};

export default function ReadinessPage() {
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
            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight md:text-6xl">
              Finished, <em className="font-display italic text-peach">or just comfortable?</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Score one song against the ten conditions that decide whether it
              holds up away from your practice chair. No account, nothing
              uploaded, and it stays in your browser.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#score"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                Score a song <span aria-hidden>→</span>
              </a>
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
              >
                Apply to the room <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            The problem this measures
          </p>
          <h2 className="mt-4 text-3xl leading-snug text-indigo-deep md:text-4xl">
            The song did not fall apart because you forgot it.{" "}
            <em className="font-display italic">It fell apart because of the room.</em>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Most songs reach a point where you would say they are done. You can
            play it, it sounds like the record, and you stop working on it. Then
            you play it for one person and it comes apart in a bar that has
            never given you trouble.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            The notes were not the problem. The problem was a condition you
            never practiced in: cold hands, a listener, full tempo set by
            something other than you, or a mistake in bar four with nothing
            rehearsed for what comes next. This tool asks about those conditions
            one at a time, weights them by how much damage each one does, and
            hands back the single thing worth fixing before you play it for
            anybody. If your whole practice has stalled rather than one song,
            start with{" "}
            <Link
              href="/guitar-practice-plateau"
              className="text-indigo-deep underline underline-offset-4 hover:text-violet"
            >
              why guitar practice plateaus
            </Link>{" "}
            instead.
          </p>
        </section>

        <section id="score" className="mx-auto max-w-6xl px-6 pb-20 scroll-mt-24">
          <Readiness />
        </section>

        <section
          id="how-it-works"
          className="bg-cream-soft px-6 py-20 scroll-mt-24"
        >
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
              How this works
            </p>
            <h2 className="mt-4 text-3xl leading-snug text-indigo-deep md:text-4xl">
              What the number is, and{" "}
              <em className="font-display italic">what it is not.</em>
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
              Why two checks weigh more than the others
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              Starting cold and playing through a mistake carry three points
              each. The rest carry two or one, for nineteen points in total. That
              split is a judgment rather than a finding: those two failures end a
              performance, and the other eight only make it worse. A song can
              pass eight checks and still stop dead in the first bar.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              The practical effect is that ticking the two heavy checks scores
              higher than ticking three light ones. The score does not reward
              collecting the easy boxes, which is the same reason the{" "}
              <Link
                href="/method"
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                GuitarHub method
              </Link>{" "}
              puts a recording at the end of every week.
            </p>

            <h3 className="mt-12 font-display text-2xl leading-snug text-indigo-deep">
              Why it hands back one action instead of a list
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              Ten open checks is a to-do list, and a to-do list is how a song
              stays unfinished. The tool sorts what is left by weight and returns
              the top one with an instruction you can run in a single session.
              When two are tied it takes the earlier one, because the order they
              are listed in is roughly the order a song needs them. If you want
              that same idea across a whole month rather than one song, the{" "}
              <Link
                href="/30-day-guitar-challenge"
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                30-day challenge
              </Link>{" "}
              and the{" "}
              <Link
                href="/breakthrough"
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                breakthrough planner
              </Link>{" "}
              run it week by week.
            </p>

            <h3 className="mt-12 font-display text-2xl leading-snug text-indigo-deep">
              What the score cannot tell you
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              It cannot hear you. It counts what you told it, and it only knows
              about the ten things on the list. It has nothing to say about tone,
              feel, dynamics, or whether the song suits you at all. A score of
              100 means the ten failure modes here have been tested, not that the
              performance is good.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              Read a low score as a map of what has not been tested yet, rather
              than a verdict on your playing. For turning that map into a weekly
              routine, Strumly has a{" "}
              <a
                href={STRUMLY.practiceRoutine}
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                guide to designing a practice routine
              </a>{" "}
              and a{" "}
              <a
                href={STRUMLY.path}
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                staged learning path
              </a>
              .
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-violet">
            Where to go next
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
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
            <h2 className="mx-auto max-w-2xl text-4xl text-cream md:text-5xl">
              One song, tested properly,{" "}
              <em className="font-display italic text-peach">beats five nearly done.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/75">
              Score the song, do the one action, and score it again. If you want
              a human layer around that work, the founding room is being
              assembled as a small crew with a weekly studio. Applying starts a
              fit conversation and takes no payment.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/breakthrough"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                Build my 30-day plan <span aria-hidden>→</span>
              </Link>
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
              >
                Apply to the room <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
