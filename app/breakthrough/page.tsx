import type { Metadata } from "next";
import Link from "next/link";
import BreakthroughPlanner from "@/components/BreakthroughPlanner";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { OG_IMAGE } from "@/lib/site";

const CANONICAL = "https://guitarhub.org/breakthrough";

const TITLE = "Build Your 30-Day Guitar Plan | GuitarHub";
const DESCRIPTION =
  "Choose one guitar breakthrough, get a four-week practice sequence, launch the right Strumly tools, and track evidence in your browser.";

/**
 * The `openGraph` block is not optional here. Next merges page metadata key by
 * key, so a page that omits `openGraph` inherits the root layout's block whole
 * — including its `url`, which would make every share of this page advertise
 * `og:url` as the home page.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description:
      "One finish line, four weeks of practice, and a recording at the end of every week. Free, no account, and it stays in your browser.",
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

// The Organization, Person and WebSite nodes are declared once in
// app/layout.tsx, which renders on this route too, so these reference the
// canonical estate @ids rather than minting duplicates for the same entities.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const SITE_ID = "https://guitarhub.org/#website";

// The other three tools each carry a SoftwareApplication node; this one is the
// primary CTA target from every page's closer and had none, so nothing
// machine-readable said what it is or that it is free.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${CANONICAL}#tool`,
      name: "30-day breakthrough planner",
      url: CANONICAL,
      description:
        "Turns one 30-day guitar goal into a four-week sequence of weekly focuses, practice actions, and a piece of evidence to record at the end of each week.",
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Music practice tool",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript. No account and no network connection.",
      isAccessibleForFree: true,
      // Genuinely free: there is no payment step, no account, and no gate
      // anywhere in the planner.
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "One finish line chosen from a fixed list of 30-day goals",
        "Four weeks of focuses and actions, sized to your days and minutes",
        "A named piece of evidence to record at the end of every week",
        "Progress checkboxes stored in the browser, with no account",
      ],
      inLanguage: "en-US",
      isPartOf: { "@id": SITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
  ],
};

const LOOP = [
  ["Diagnose", "Start from an honest attempt, not a placement quiz you can game."],
  ["Prescribe", "One finish line and one weekly path replace the lesson pile."],
  ["Practice", "Launch the exact Strumly tool, song, or coach session the week needs."],
  ["Prove", "End each week with a recording and a self-diagnosis, not watch time."],
  ["Correct", "Founding-room members receive one highest-leverage correction and next action."],
  ["Share", "Progress proof is learner-controlled; private corrections stay private."],
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

      <main>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
              The Breakthrough Room
            </span>
            <h1 className="mx-auto mt-7 max-w-4xl text-5xl leading-tight md:text-6xl">
              Stop browsing. <em className="font-display italic text-peach">Prove one change.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Turn one guitar goal into four weeks of practice, evidence, correction, and the next right move. The planner is free and stays in your browser.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/70">
              Not sure which change to chase?{" "}
              <Link
                href="/diagnose"
                className="font-semibold text-peach underline underline-offset-4 hover:brightness-110"
              >
                Run the practice plateau diagnostic
              </Link>{" "}
              first. It reads nine answers back and tells you what they point
              at, including when they do not point at any one thing.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <BreakthroughPlanner />
        </section>

        <section className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">The learning loop</p>
            <h2 className="mt-4 max-w-3xl text-4xl text-indigo-deep md:text-5xl">
              Community becomes useful when every conversation changes the next practice.
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink/70">
              The planner runs this loop for you. If you want to see what each
              stage asks and how you know you can move on, read{" "}
              <Link
                href="/method"
                className="font-semibold text-violet underline underline-offset-4 hover:text-indigo-deep"
              >
                the GuitarHub method
              </Link>
              .
            </p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-3">
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
