import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import TempoLadder from "@/components/TempoLadder";
import { GUIDES, OG_IMAGE, STRUMLY, TOOLS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tempo Ladder Builder | GuitarHub",
  description:
    "Turn one stuck passage into a tempo ladder: a proven starting speed, capped steps, hold rungs, a back-off session, and a target you can record.",
  openGraph: {
    title: "Tempo Ladder Builder | GuitarHub",
    description:
      "Enter the tempo you play a passage cleanly and the tempo you want. Get an ordered ladder of sessions, each with a pass condition.",
    url: "https://guitarhub.org/tempo",
    siteName: "GuitarHub",
    type: "website",
    // Required, not decorative: a page-level `openGraph` block replaces the
    // root layout's resolved object, taking the file-convention card with it.
    // See OG_IMAGE in lib/site.ts.
    images: [OG_IMAGE],
  },
  alternates: { canonical: "https://guitarhub.org/tempo" },
};

// The Organization and Person nodes are defined once, in app/layout.tsx. These
// reference those @ids rather than minting a second copy of the same entities;
// Google resolves @id within a page, and the layout's graph is on every page.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const SITE_ID = "https://guitarhub.org/#website";
const TOOL_ID = "https://guitarhub.org/tempo#tool";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": TOOL_ID,
      name: "Tempo Ladder Builder",
      url: "https://guitarhub.org/tempo",
      description:
        "Builds an ordered sequence of practice tempos between the speed you already play a passage cleanly and the speed you are working toward, with a pass condition on every rung.",
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Music practice tool",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript. No account and no network connection.",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Caps every tempo increase at a tenth of the tempo being left behind",
        "Inserts hold rungs that repeat a tempo instead of adding to it",
        "Inserts back-off rungs that drop below the last tempo and climb back",
        "Writes a pass condition for every session",
        "Stores progress in the browser, with no account",
      ],
      isPartOf: { "@id": SITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
    {
      "@type": "HowTo",
      "@id": "https://guitarhub.org/tempo#howto",
      name: "How to build a tempo ladder for one guitar passage",
      description:
        "Take one passage from the speed you can already play it cleanly to the speed you want, one capped step at a time.",
      // Text, not a node reference: schema.org gives `tool` the range
      // HowToTool | Text, so pointing it at the SoftwareApplication @id is a
      // range violation. That node is already attached to this page via
      // isPartOf, so nothing is lost by naming the tool here.
      tool: "Tempo Ladder Builder",
      isPartOf: { "@id": SITE_ID },
      step: [
        {
          "@type": "HowToStep",
          name: "Find the tempo you actually own",
          text: "Play the passage against a metronome and drop the tempo until you get three passes in a row with no missed notes and no rushing. That number is your baseline, not your best single attempt.",
        },
        {
          "@type": "HowToStep",
          name: "Name the tempo you are working toward",
          text: "Use the tempo of the recording, or the tempo the rest of the song sits at. One ladder covers one reachable jump, not a whole year of playing.",
        },
        {
          "@type": "HowToStep",
          name: "Choose how many sessions to spend",
          text: "Each rung is one practice session. Fewer sessions mean larger steps, and the builder refuses a count that would force a step bigger than a tenth of the tempo you are leaving.",
        },
        {
          "@type": "HowToStep",
          name: "Run one rung per session",
          text: "Move up only when the rung's pass condition is met. Hold rungs repeat the previous tempo, and a back-off rung drops below it and climbs back through the tempos you have already passed.",
        },
        {
          "@type": "HowToStep",
          name: "Finish with a recording",
          text: "The last rung is three clean passes at the target tempo followed by one recorded pass, so the result is evidence rather than a feeling.",
        },
      ],
    },
  ],
};

const RULES = [
  {
    title: "Steps are capped, not averaged",
    body: "No rung asks for more than a tenth of the tempo you are leaving, and never more than 10 BPM. A jump from 60 is smaller than a jump from 200, because your hands feel proportion, not arithmetic.",
  },
  {
    title: "Hold rungs are sessions, not rest",
    body: "Some rungs repeat the previous tempo. Reaching a tempo once and owning it are different things, and the second one only comes from repetition at a speed you already reached.",
  },
  {
    title: "One session goes down on purpose",
    body: "Every ladder contains at least one back-off rung: drop below the top tempo you reached and climb back through the rungs you already passed. Re-covering ground is what turns a ceiling into a floor.",
  },
  {
    title: "The numbers are metronome numbers",
    body: "Rungs land on whole BPM, and on multiples of five or two wherever that does not distort the spacing. A ladder you cannot dial in is not a ladder.",
  },
  {
    title: "The baseline is a measurement",
    body: "The first session is not practice. You are finding the fastest tempo you can play the passage three times in a row, cleanly. Start the ladder above that and every rung after it is guesswork.",
  },
  {
    title: "Nothing leaves this browser",
    body: "There is no account and no upload. Your two tempos and the sessions you check off are stored in this browser only, and the clear button removes them.",
  },
];

const LIMITS = [
  "There is no metronome here. Use the one you already practice with.",
  "Nothing is recorded or listened to. The pass conditions are yours to judge honestly.",
  "A ladder covers one passage. Build a separate one for each part that is holding a song back.",
  "The builder refuses gaps too wide for one ladder and hands back a nearer target instead of pretending.",
];

const LINK_PILL =
  "inline-flex min-h-11 items-center gap-1 rounded-full bg-cream-soft px-5 py-2.5 " +
  "text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white";

const NEXT_TOOLS = TOOLS.filter((tool) => tool.href !== "/tempo");
const NEXT_GUIDES = GUIDES.filter((guide) =>
  ["/deliberate-practice-guitar", "/how-to-practice-guitar-effectively", "/guitar-practice-plateau"].includes(
    guide.href,
  ),
);

export default function TempoPage() {
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
              Tempo Ladder Builder
            </span>
            <h1 className="mx-auto mt-7 max-w-4xl text-5xl leading-tight md:text-6xl">
              One passage.{" "}
              <em className="font-display italic text-peach">
                One tempo at a time.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Speeding a passage up by pushing the metronome until it falls apart
              teaches your hands to fall apart. This builds the ladder instead:
              the tempo you already own at the bottom, the tempo you want at the
              top, and a session for every rung between them.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <TempoLadder />
        </section>

        <section className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
              How this works
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
              The rungs are generated from rules,{" "}
              <em className="font-display italic">not from a template.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-ink/70">
              Two players entering the same target get different ladders, because
              the shape is derived from the distance between your two tempos and
              the number of sessions you are willing to spend.
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
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20">
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
            Why the rungs are shaped this way, and what to run when one of them
            will not pass:
          </p>
          {/* Pills rather than links inside the sentence: an inline-flex link
              cannot wrap mid-phrase, and a 20px inline link is not a tap
              target at 390px. */}
          <ul className="mt-5 flex flex-wrap gap-3">
            <li>
              <Link href="/deliberate-practice-guitar" className={LINK_PILL}>
                Deliberate practice on guitar <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link href="/method" className={LINK_PILL}>
                The GuitarHub method <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <a
                href={STRUMLY.chordTransitions}
                target="_blank"
                rel="noopener"
                className={LINK_PILL}
              >
                Smoother chord transitions <span aria-hidden>↗</span>
              </a>
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
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-4xl text-indigo-deep md:text-5xl">
            Where to go next.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...NEXT_TOOLS, ...NEXT_GUIDES].map((entry) => (
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
              A ladder is the practice.{" "}
              <em className="font-display italic text-peach">
                The room is the correction.
              </em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              The builder can tell you the next tempo. It cannot tell you that
              your left hand is late because your right hand is early. The
              founding room is being assembled for that part: a small crew, a
              weekly recording, and one correction that changes the next session.
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
