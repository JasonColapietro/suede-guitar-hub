import type { Metadata } from "next";
import Link from "next/link";
import SessionBuilder from "@/components/SessionBuilder";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { GUIDES, OG_IMAGE, SITE_URL, STRUMLY, TOOLS } from "@/lib/site";

const CANONICAL = `${SITE_URL}/session`;
const PUBLISHED = "2026-08-29";

const TITLE = "Practice Session Builder | GuitarHub";
const DESCRIPTION =
  "Enter the minutes you actually have and the one thing you are fixing. Get a practice session split into timed blocks that add up to exactly that length.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: "Practice Session Builder",
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
    name: "Enter the minutes you actually have",
    text: "Type the real number, not the one you wish you had. A session planned for an hour you do not have becomes the first block and nothing else, which is the one shape of practice that reliably wastes the time.",
  },
  {
    name: "Pick the one thing the session is for",
    text: "Raise a tempo ceiling, memorise a song, repair a transition, or general upkeep. The focus decides which block gets the largest share of the time, and at short lengths it decides which blocks exist at all.",
  },
  {
    name: "Read the split, which adds up exactly",
    text: "Every block is a whole number of minutes, and the blocks total the length you asked for. Nothing is rounded away and nothing is invented, so the plan on screen is the session you actually have.",
  },
  {
    name: "Run the blocks in order, without shortening them",
    text: "Each block has a minimum size below which starting it costs more than skipping it. Anything that lands under that minimum is dropped and its minutes go to the blocks that survived, which is why a fifteen-minute session comes back with two blocks instead of five stubs.",
  },
  {
    name: "Tick a block once it is finished",
    text: "Progress is counted in minutes rather than in boxes, so a long block moves the bar further than a short one. What you tick is stored in this browser, and the clear button removes it.",
  },
] as const;

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
      name: "Practice Session Builder",
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
        "Splits a chosen length into whole minutes that total exactly that length",
        "Shifts the weighting of every block according to the focus chosen",
        "Gives the block matching that focus the largest share of the session",
        "Drops blocks that fall under their minimum useful size and redistributes the minutes",
        "Names every block that was left out, and why",
        "Tracks finished blocks in the browser, with no account",
      ],
      author: { "@id": JASON_PERSON_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      isPartOf: { "@id": SITE_ID },
    },
    {
      "@type": "HowTo",
      "@id": `${CANONICAL}#howto`,
      name: "How to plan a guitar practice session around the time you have",
      description:
        "Turn a fixed number of minutes and one thing worth fixing into an ordered set of practice blocks, each with a length, a purpose and an instruction.",
      inLanguage: "en-US",
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      // Text, not a node reference: schema.org gives `tool` the range
      // HowToTool | Text, so pointing it at the SoftwareApplication @id is a
      // range violation. That node is already attached to this page via
      // isPartOf, so nothing is lost by naming the tool here.
      tool: "Practice Session Builder",
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

const RULES = [
  {
    title: "The minutes add up, exactly",
    body: "Every block is a whole number and the blocks total the length you entered. Rounding each block's share on its own drifts by a minute in either direction depending on the total, so the leftover is handed out deliberately instead: to the blocks whose share was cut hardest by the rounding.",
  },
  {
    title: "Blocks are dropped, never shrunk",
    body: "Each block has a size below which starting it costs more than it returns. A block that lands under that size is removed and its minutes go to the blocks still standing, so a short session comes back with two real blocks rather than five that are each too small to begin.",
  },
  {
    title: "The focus block is always the largest",
    body: "Whatever you chose to fix gets more time than anything else in the session, guaranteed rather than usually. A focus that changes the labels and not the shape of the session is decoration, and this one changes the shape.",
  },
  {
    title: "Something always survives",
    body: "At five minutes there is one block and it takes all five, because a plan with nothing in it is not a shorter plan. The block you get is the one your focus pointed at.",
  },
  {
    title: "The session ends cold, on purpose",
    body: "Wherever there is room for it, the last block puts the guitar down for two minutes and then asks for one attempt with no run-up. What you can only play while already warm has not been learned yet, it has been loaded.",
  },
  {
    title: "Nothing leaves this browser",
    body: "There is no account and no upload. The length, the focus, and the blocks you tick off are stored in this browser only, and the clear button removes them.",
  },
];

const LIMITS = [
  "There is no timer here. Use the clock you already have, or your phone.",
  "Nothing is recorded or listened to. Whether a block was really finished is yours to judge.",
  "The blocks are named and sized, but what goes in the repair block is chosen by you. The tool does not know which bar is broken.",
  "One session at a time. It plans today, not a week, and it keeps no history beyond the boxes you have ticked.",
];

const LINK_PILL =
  "inline-flex min-h-11 items-center gap-1 rounded-full bg-cream-soft px-5 py-2.5 " +
  "text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white";

const RELATED_HREFS = [
  "/diagnose",
  "/tempo",
  "/how-long-to-practice-guitar-each-day",
  "/how-to-practice-guitar-effectively",
  "/guitar-practice-schedule",
  "/deliberate-practice-guitar",
  "/readiness",
] as const;

const RELATED = RELATED_HREFS.flatMap((href) =>
  [...TOOLS, ...GUIDES].filter((entry) => entry.href === href),
);

export default function SessionPage() {
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
            <h1 className="mx-auto mt-7 max-w-4xl text-5xl leading-tight md:text-6xl">
              You have the time.{" "}
              <em className="font-display italic text-peach">
                Now spend it on purpose.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Most practice sessions are decided in the first ninety seconds, by
              whatever your hands reached for. This turns the minutes you have
              into an ordered set of blocks with a length, a purpose, and
              something specific to do in each one.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#build"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105"
              >
                Build a session <span aria-hidden>→</span>
              </a>
              <Link
                href="/tools"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream motion-safe:transition hover:bg-white/5"
              >
                See every tool <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            The problem this solves
          </p>
          <h2 className="mt-4 text-3xl leading-snug text-indigo-deep md:text-4xl">
            The hour was not the problem.{" "}
            <em className="font-display italic">
              Nobody decided what it was for.
            </em>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            An unplanned practice hour has a predictable shape. Ten minutes of
            playing what already sounds good, twenty on the thing you were
            working on last time until it stops being fun, then the rest on
            something else entirely. Nothing in that is lazy. It is what happens
            when the decision about where the time goes is made forty separate
            times, at the instrument, by someone holding a guitar.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            Making the decision once, before you start, is the whole trick — and
            it is why the answer has to be specific about minutes. A block with
            no length is a suggestion. Fifteen minutes on the bar that breaks
            first, followed by nine on tempo, is a session. If the problem is
            bigger than one session and your playing has stalled generally,{" "}
            <Link
              href="/guitar-practice-plateau"
              className="text-indigo-deep underline underline-offset-4 hover:text-violet"
            >
              why guitar practice plateaus
            </Link>{" "}
            is the better place to start.
          </p>
        </section>

        <section id="build" className="mx-auto max-w-6xl px-6 pb-20 scroll-mt-24">
          <SessionBuilder />
        </section>

        <section id="how-it-works" className="bg-cream-soft px-6 py-20 scroll-mt-24">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
              How this works
            </p>
            <h2 className="mt-4 text-3xl leading-snug text-indigo-deep md:text-4xl">
              Five steps, and{" "}
              <em className="font-display italic">no leftover minutes.</em>
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
              Why a short session comes back almost empty
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              Fifteen minutes divided five ways is three minutes a block, and a
              three-minute block is mostly the setup: finding the passage,
              setting the metronome, remembering what you decided last time. The
              builder refuses to produce that. Blocks that fall under their
              minimum are removed and their minutes are given to the ones that
              are left, so fifteen minutes comes back as two blocks that can
              actually be run rather than five that cannot.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              It also tells you which blocks it dropped and what each one needed,
              because &ldquo;there was no room for the cold-start test&rdquo; is
              useful information about your week. If most of your sessions are
              coming back with two blocks, the answer is not a cleverer split —
              it is{" "}
              <Link
                href="/guitar-practice-schedule"
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                a schedule that survives a real week
              </Link>
              .
            </p>

            <h3 className="mt-12 font-display text-2xl leading-snug text-indigo-deep">
              Why the focus changes the shape, not the labels
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              Each focus carries its own weighting across the five blocks, and
              the block that repairs the thing you named is guaranteed the
              largest share of the session. Memorising a song puts the second
              largest share on playing from memory and almost nothing on tempo
              work; raising a tempo ceiling reverses that. At sixty minutes both
              produce five blocks, and the two sessions are not the same session
              with different headings on it.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              General upkeep is the exception, and deliberately so. With nothing
              named as broken there is no repair target worth the largest share,
              so the weight moves to playing complete music under some kind of
              pressure. At half an hour or less the upkeep session drops the
              repair block entirely rather than inventing something to fix. What
              that block should contain when you do have a target is{" "}
              <Link
                href="/deliberate-practice-guitar"
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                deliberate practice on guitar
              </Link>
              .
            </p>

            <h3 className="mt-12 font-display text-2xl leading-snug text-indigo-deep">
              Why the tempo block is deliberately vague about numbers
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">
              This tool knows how many minutes to spend on tempo work. It does
              not know what tempo you are on, what you are aiming at, or how big
              a step your hands can absorb, so it does not pretend to. The{" "}
              <Link
                href="/tempo"
                className="text-indigo-deep underline underline-offset-4 hover:text-violet"
              >
                tempo ladder builder
              </Link>{" "}
              is the tool that answers those, and its rungs are what the tempo
              block here is for. Run the two together: this one decides the
              minutes, that one decides the numbers.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            The rules it follows
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
            The split is generated from rules,{" "}
            <em className="font-display italic">not from a template.</em>
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-ink/70">
            Two players entering the same length get different sessions, because
            the shape is derived from the focus and from how much time there
            actually is.
          </p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-3">
            {RULES.map((rule) => (
              <article key={rule.title} className="bg-cream p-7">
                <h3 className="font-display text-2xl leading-snug text-indigo-deep">
                  {rule.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {rule.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-20">
          <h2 className="text-4xl leading-snug text-indigo-deep md:text-5xl">
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
            What to put inside the blocks, and what to do when one of them stops
            producing change:
          </p>
          {/* Pills rather than links inside the sentence: an inline-flex link
              cannot wrap mid-phrase, and a 20px inline link is not a tap
              target at 390px. */}
          <ul className="mt-5 flex flex-wrap gap-3">
            <li>
              <Link href="/tools" className={LINK_PILL}>
                All the free tools <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link href="/how-to-practice-guitar-effectively" className={LINK_PILL}>
                How to practise effectively <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link href="/how-long-to-practice-guitar-each-day" className={LINK_PILL}>
                How long to practise each day <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link href="/how-to-memorize-songs-on-guitar" className={LINK_PILL}>
                How to memorise a song <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link href="/method" className={LINK_PILL}>
                The GuitarHub method <span aria-hidden>→</span>
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
                The Strumly learning path <span aria-hidden>↗</span>
              </a>
            </li>
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-4xl text-indigo-deep md:text-5xl">
            Where to go next.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RELATED.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="block h-full rounded-3xl bg-white p-6 ring-1 ring-ink/5 motion-safe:transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="font-display text-xl leading-snug text-indigo-deep">
                  {entry.title} <span aria-hidden>→</span>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {entry.blurb}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-3 pb-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream">
            <h2 className="mx-auto max-w-3xl text-4xl leading-tight md:text-5xl">
              The plan is the easy half.{" "}
              <em className="font-display italic text-peach">
                Someone hearing it is the other one.
              </em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              A session builder can tell you to spend fifteen minutes on the bar
              that breaks first. It cannot tell you that the bar breaks because
              your picking hand is anticipating the change. The founding room is
              being assembled for that part: a small crew, a weekly recording,
              and one correction that changes the next session.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105"
              >
                Apply to the room <span aria-hidden>→</span>
              </Link>
              <Link
                href="/breakthrough"
                className="inline-flex min-h-11 w-fit items-center rounded-full border border-peach/40 px-5 py-2 font-semibold underline underline-offset-4 hover:bg-white/5"
              >
                Build the 30-day plan
              </Link>
            </div>
            <p className="mx-auto mt-6 max-w-xl text-sm text-white/60">
              Applying starts a fit conversation. It does not charge you or
              create a commitment.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
