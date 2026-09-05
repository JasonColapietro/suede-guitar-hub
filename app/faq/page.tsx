import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { GUIDES, OG_IMAGE, SITE_URL, STRUMLY, TOOLS } from "@/lib/site";

const CANONICAL = `${SITE_URL}/faq`;

/** Read by both the visible trail and the BreadcrumbList JSON-LD below. */
const CRUMBS = crumbTrail("FAQ", CANONICAL);
const PUBLISHED = "2026-08-29";

const TITLE = "GuitarHub FAQ: The Method, the Tools, and the Founding Room";
// Kept between 140 and 160 characters. Every clause names something a reader
// is actually deciding — cost, account, data, the room — rather than
// describing the page as "everything you need to know".
const DESCRIPTION =
  "Straight answers about GuitarHub: what it is and is not, whether it is free, whether you need an account, where your data lives, and what the room is.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
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

/** `a, b, and c` — used to name the tools from the registry inside prose. */
function sentenceList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Lowercases only the first character, so a registry title that contains a
 * proper noun ("Strumly") keeps it. A blanket `toLowerCase()` would not.
 */
function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * Built from `TOOLS` rather than retyped, so the answer below cannot name a
 * tool the site no longer has, or miss one it gained.
 */
const TOOL_SENTENCE = sentenceList(
  TOOLS.map((tool) => `the ${lowerFirst(tool.title)}`),
);

type FaqGroup = {
  id: string;
  title: string;
  /**
   * Visible prose above the group. Deliberately NOT part of the schema: only
   * the question and answer strings below are marked up, so the intro can be
   * edited freely without putting the page and its FAQPage nodes out of sync.
   */
  intro: string;
};

const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    id: "what-it-is",
    title: "What GuitarHub is",
    intro:
      "The site described plainly, including the parts that are not built. If you read one section, read this one.",
  },
  {
    id: "cost-and-data",
    title: "Cost, accounts, and your data",
    intro:
      "Nothing here charges you and almost nothing leaves your browser. These answers say exactly what that means, and name the one exception.",
  },
  {
    id: "who-its-for",
    title: "Who it is for",
    intro:
      "A method that suits everyone suits nobody. This one has an audience, and a group whose time it would waste.",
  },
  {
    id: "the-founding-room",
    title: "The founding room",
    intro:
      "The part of this site most likely to be misread, so these answers are blunt about what exists today and what is only an intention.",
  },
  {
    id: "strumly-and-teachers",
    title: "Strumly, Suede Labs, and teachers",
    intro:
      "GuitarHub is one of three Suede Labs surfaces, and it is not a substitute for the person who teaches you.",
  },
];

type Faq = {
  /** Stable anchor, so a single answer can be linked to directly. */
  id: string;
  /** Matches a `FAQ_GROUPS` id. */
  group: string;
  q: string;
  a: string;
};

/**
 * The single source for the visible Q&A AND for the FAQPage nodes below.
 *
 * Google treats FAQ markup whose answer text is absent from the page as a
 * structured-data violation, so generating both from one array is the only way
 * to guarantee they still match after an edit. Keep `q` and `a` plain strings:
 * no markup, no links, no JSX. Anything that needs a link belongs in the prose
 * around the group, not inside an answer.
 */
const FAQS: readonly Faq[] = [
  // What GuitarHub is
  {
    id: "what-is-guitarhub",
    group: "what-it-is",
    q: "What is GuitarHub?",
    a: "GuitarHub is a guitar practice method and a set of free browser tools that run it. The method is one loop against one goal at a time: record where you actually are, isolate the single thing that breaks the result, put that repair back under the pressure of a full performance, then record the same thing again and compare the two takes. The site exists because guitar education supplies plenty of lessons and almost nothing that tells you whether a lesson worked.",
  },
  {
    id: "what-guitarhub-is-not",
    group: "what-it-is",
    q: "What is GuitarHub not?",
    a: "It is not a video course, a lesson library, a streak tracker, a teacher marketplace, or an app you download. There are no lesson videos here, nothing to install, no mentors on call, and no live chat. The tools and the written guides are the whole of what this site does today, and the founding room is an application under review rather than a service already running.",
  },
  {
    id: "what-are-the-tools",
    group: "what-it-is",
    q: "What are the tools, exactly?",
    a: `The tools are ${TOOL_SENTENCE}. Each one runs entirely in the browser you are reading this in, needs no account, and carries a button that clears what it stored. None of them is a metronome or a tuner: those already exist inside Strumly, and a second, worse copy here would help nobody.`,
  },
  {
    id: "is-this-an-ai-product",
    group: "what-it-is",
    q: "Is GuitarHub an AI product?",
    a: "Not in the way that phrase is usually meant. There is no chatbot on this site, no generated commentary on your playing, and no model looking at anything you do. The tools follow written rules and return the same output for the same input. Strumly, a separate Suede Labs product, is the AI guitar coach, and this site links out to it instead of embedding it.",
  },

  // Cost, accounts, and your data
  {
    id: "is-it-free",
    group: "cost-and-data",
    q: "Is GuitarHub free?",
    a: "Yes. Every tool and every guide here is free to use, no payment is taken anywhere on the site, and no card is collected. The tools are not a limited sample of a paid product, because there is no paid product behind them. Applying to the founding room is free as well.",
  },
  {
    id: "do-i-need-an-account",
    group: "cost-and-data",
    q: "Do I need an account?",
    a: "No. There is no sign-up, no login, and no password, because there are no accounts at all. Open a tool and start using it. The only place on the site that asks for your name and email address is the founding-room application, and that is a form you choose to send once, not an account you keep.",
  },
  {
    id: "where-is-my-data-stored",
    group: "cost-and-data",
    q: "Where is my data stored?",
    a: "In your own browser, in local storage, and nowhere else. What you type into a tool stays on the device you typed it on, so closing the tab does not lose it and reopening the page brings it back. It also does not travel: a plan built on a laptop is not on your phone, because there is no account syncing it. Clear your browser data and it is gone, and we cannot recover it, because we never had it.",
  },
  {
    id: "are-recordings-uploaded",
    group: "cost-and-data",
    q: "Does GuitarHub upload or listen to my recordings?",
    a: "No. There is no recording feature on this site and no upload of any kind. When the method tells you to record a baseline, it means on your phone, in whatever voice-memo app you already have, kept by you. Nothing here receives, stores, or plays back audio.",
  },
  {
    id: "does-anything-train-on-my-playing",
    group: "cost-and-data",
    q: "Does anything here train on my playing?",
    a: "No. Nothing on this site ingests performances, and no model is being trained on anything you do here. GuitarHub prescribes practice; it does not collect it. The tools send nothing to a server at all. The one page that transmits anything is the founding-room application form, which sends the four fields you typed into it and nothing else.",
  },
  {
    id: "tracking-and-analytics",
    group: "cost-and-data",
    q: "Is there tracking or analytics on this site?",
    a: "There is no analytics script and no third-party tracker on GuitarHub. That is a claim you can check rather than take on trust: open the page source, or your browser's network panel, and see what actually loads.",
  },

  // Who it is for
  {
    id: "who-is-it-for",
    group: "who-its-for",
    q: "Who is GuitarHub for?",
    a: "Players who are past the first few months and no longer getting obvious returns from practice: advanced beginners, intermediates, and people coming back to the instrument after a long gap. The planner asks you to place yourself in one of those three and labels the plan with where you are starting from; the four weeks themselves are built from the goal you pick. The common shape is a player with plenty of saved material and no finished piece to show for it.",
  },
  {
    id: "who-is-it-not-for",
    group: "who-its-for",
    q: "Who is GuitarHub not for?",
    a: "Complete beginners, mostly. The method assumes you can already play something badly enough to record it, and someone still learning to fret a first chord needs material rather than a way to audit material. It is also the wrong site for anyone who wants new songs and new lessons, because it deliberately has none, and for anyone who wants a graded course with a certificate at the end, because nothing here is graded and nothing is issued.",
  },
  {
    id: "how-much-time",
    group: "who-its-for",
    q: "How much time does this take?",
    a: "The planner asks how many days a week you practice and how many minutes you get per session, and labels your plan with that cadence. It accepts three to six days and sessions of 15 to 60 minutes, and it builds the same four-week sequence at any of those settings. The one thing the method insists on is that each week end with something recorded, which costs about as long as one take.",
  },

  // The founding room
  {
    id: "what-is-the-founding-room",
    group: "the-founding-room",
    q: "What is the founding room?",
    a: "An application, and it is being reviewed. That is the honest description, because the alternative reading, a cohort you can join today, is not true. The intent is a small room of 8 to 12 players assembled around one rule: every check-in has to change the next practice. Members would be matched by goal and by a schedule that actually works, corrections would stay private, and progress proof would be shared only when a player chooses to share it. Those are design commitments, not a description of something already running.",
  },
  {
    id: "can-i-join-today",
    group: "the-founding-room",
    q: "Can I join the founding room today?",
    a: "No. There is no cohort in session, no start date published, and no schedule set. What exists today is a form on the home page and a person reading what arrives in it. Schedule, review capacity, and what membership would involve will be stated before anyone is asked to commit to anything.",
  },
  {
    id: "what-happens-after-i-apply",
    group: "the-founding-room",
    q: "What happens after I apply?",
    a: "The form sends four things: your name, your email address, a line about your playing experience, and one sentence naming the change you want to prove in thirty days. It arrives as an email at info@suedeai.ai and it is read by a person. There is no automated sequence, no drip campaign, and no card requested at any point. If the room is not a fit for the change you named, that is the answer you get.",
  },

  // Strumly, Suede Labs, and teachers
  {
    id: "how-it-relates-to-strumly",
    group: "strumly-and-teachers",
    q: "How does GuitarHub relate to Strumly and Suede Labs?",
    a: "All three are Suede Labs, a studio founded by Jason Colapietro, who also publishes as Johnny Suede. GuitarHub orchestrates the practice, Strumly powers the tools, and Suede Social carries the wider conversation. In practice the planner here decides what you work on this week and sends you to Strumly for the thing that does it, rather than rebuilding a second, worse copy of a tool that already exists. GuitarHub has no forum of its own and is not claiming one.",
  },
  {
    id: "does-it-replace-a-teacher",
    group: "strumly-and-teachers",
    q: "Does this replace a teacher?",
    a: "No, and it is not trying to. A good teacher can do the isolate stage for you in about a minute, which is most of what you are paying them for. This is a structure for the other six days, and it tends to make a lesson worth more, because you arrive with a recording and a specific question instead of a general report that you have been practising.",
  },
];

function faqsIn(groupId: string): readonly Faq[] {
  return FAQS.filter((faq) => faq.group === groupId);
}

/**
 * The order the page renders in, and therefore the order the schema is built
 * in. Both the visible sections and the FAQPage nodes read from this same
 * grouped traversal, so an entry whose `group` matched nothing would disappear
 * from the page AND from the markup together. That is the safe direction: the
 * schema can never claim an answer the page does not show.
 */
const ORDERED_FAQS = FAQ_GROUPS.flatMap((group) => faqsIn(group.id));

// The canonical estate @ids, copied from app/layout.tsx. Referenced rather
// than redefined: the Organization, Person, and WebSite nodes are declared once
// in the root layout, which renders on this page too, so Google resolves these
// within the page.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const WEBSITE_ID = `${SITE_URL}/#website`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      "@id": `${CANONICAL}#faq`,
      url: CANONICAL,
      name: TITLE,
      description: DESCRIPTION,
      image: OG_IMAGE.url,
      inLanguage: "en-US",
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
      breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
      mainEntity: ORDERED_FAQS.map((faq) => ({
        "@type": "Question",
        "@id": `${CANONICAL}#${faq.id}`,
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

/**
 * Guides worth reading after a specific answer, pulled from the registry by
 * href so the titles and blurbs stay in one place. Listed explicitly because
 * this is a reading order rather than the registry's order.
 */
const DEEPER_HREFS = [
  "/method",
  "/how-to-practice-guitar-effectively",
  "/guitar-practice-plateau",
] as const;

const DEEPER_GUIDES = DEEPER_HREFS.flatMap((href) =>
  GUIDES.filter((guide) => guide.href === href),
);

/** Everything in the registry that the block above did not already show. */
const REMAINING_GUIDES = GUIDES.filter(
  (guide) => !DEEPER_HREFS.some((href) => href === guide.href),
);

const CARD =
  "block h-full rounded-3xl bg-white p-6 ring-1 ring-ink/5 motion-safe:transition hover:shadow-md motion-safe:hover:-translate-y-1";

const INDEX_LINK =
  "inline-flex min-h-11 items-center text-sm leading-snug text-ink/70 motion-safe:transition hover:text-indigo-deep";

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <SiteNav />

      <Breadcrumbs crumbs={CRUMBS} />

      <main>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
              GuitarHub FAQ
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight md:text-5xl">
              Questions, answered{" "}
              <em className="font-display italic text-peach">
                without the sales pitch.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              What this site is, what it costs, what happens to anything you
              type into it, and what the founding room actually is right now
              rather than what it is meant to become.
            </p>
            <p className="mt-8 text-xs uppercase tracking-widest text-violet-soft">
              Updated <time dateTime={PUBLISHED}>August 29, 2026</time>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pt-16 md:pt-20">
          <p className="text-lg leading-relaxed text-ink/70">
            Every answer below is checkable against the site itself. Where
            something does not exist yet, it says so instead of describing the
            plan in the present tense. Where a claim is an argument about how
            practice works rather than a fact about the software, it is written
            as an argument.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            If an answer here is wrong, or the site changed and this page did
            not, mail{" "}
            <a
              href="mailto:info@suedeai.ai"
              className="text-indigo-deep underline underline-offset-4 hover:text-violet"
            >
              info@suedeai.ai
            </a>{" "}
            and it gets fixed.
          </p>
          <div className="strings-divider mx-auto mt-14 h-10 max-w-xs" aria-hidden />
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16" aria-labelledby="on-this-page">
          <h2
            id="on-this-page"
            className="text-[11px] font-semibold uppercase tracking-widest text-violet"
          >
            On this page
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {FAQ_GROUPS.map((group) => (
              <nav key={group.id} aria-label={group.title}>
                <h3 className="font-display text-xl leading-snug text-indigo-deep">
                  <a
                    href={`#${group.id}`}
                    className="inline-flex min-h-11 items-center hover:text-violet"
                  >
                    {group.title}
                  </a>
                </h3>
                <ul className="mt-1">
                  {faqsIn(group.id).map((faq) => (
                    <li key={faq.id}>
                      <a href={`#${faq.id}`} className={INDEX_LINK}>
                        {faq.q}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </section>

        {FAQ_GROUPS.map((group, groupIndex) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className={
              groupIndex % 2 === 0
                ? "scroll-mt-28 bg-cream-soft px-6 py-20"
                : "scroll-mt-28 px-6 py-20"
            }
          >
            <div className="mx-auto max-w-4xl">
              <h2
                id={`${group.id}-heading`}
                className="text-3xl leading-snug text-indigo-deep md:text-4xl"
              >
                {group.title}
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
                {group.intro}
              </p>

              <div className="mt-10 grid gap-4">
                {faqsIn(group.id).map((faq) => (
                  <article
                    key={faq.id}
                    id={faq.id}
                    className="scroll-mt-28 rounded-3xl bg-white p-7 ring-1 ring-ink/5"
                  >
                    <h3 className="font-display text-xl leading-snug text-indigo-deep md:text-2xl">
                      {faq.q}
                    </h3>
                    <p className="mt-3 text-lg leading-relaxed text-ink/75">
                      {faq.a}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl leading-snug text-indigo-deep md:text-4xl">
            The tools these answers keep referring to.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
            Free, no account, nothing uploaded. Each one opens in this browser
            and keeps its state there until you clear it.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className={CARD}>
                  <h3 className="font-display text-xl leading-snug text-indigo-deep">
                    {tool.title} <span aria-hidden>→</span>
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {tool.blurb}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl leading-snug text-indigo-deep md:text-4xl">
              Where an answer was too short.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
              A paragraph can say what the method is. These make the argument
              for it, with the exit test for each stage and the failure modes
              that make practice feel productive without changing anything.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DEEPER_GUIDES.map((guide) => (
                <li key={guide.href}>
                  <Link href={guide.href} className={CARD}>
                    <h3 className="font-display text-xl leading-snug text-indigo-deep">
                      {guide.title} <span aria-hidden>→</span>
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">
                      {guide.blurb}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {REMAINING_GUIDES.length > 0 ? (
              <>
                <h3 className="mt-14 text-[11px] font-semibold uppercase tracking-widest text-violet">
                  The rest of the guides
                </h3>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {REMAINING_GUIDES.map((guide) => (
                    <li key={guide.href}>
                      <Link
                        href={guide.href}
                        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-deep ring-1 ring-ink/5 motion-safe:transition hover:bg-cream"
                      >
                        {guide.title} <span aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <h3 className="mt-14 text-[11px] font-semibold uppercase tracking-widest text-violet">
              The other two Suede surfaces
            </h3>
            <ul className="mt-4 flex flex-wrap gap-3">
              <li>
                <a
                  href={STRUMLY.guides}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-deep ring-1 ring-ink/5 motion-safe:transition hover:bg-cream"
                >
                  Strumly guides <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a
                  href={STRUMLY.aiVsTeacher}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-deep ring-1 ring-ink/5 motion-safe:transition hover:bg-cream"
                >
                  AI feedback vs a human teacher <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a
                  href={STRUMLY.social}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-deep ring-1 ring-ink/5 motion-safe:transition hover:bg-cream"
                >
                  Suede Social <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-deep ring-1 ring-ink/5 motion-safe:transition hover:bg-cream"
                >
                  About GuitarHub <span aria-hidden>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section className="px-3 pb-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
            <h2 className="mx-auto max-w-3xl text-4xl text-cream md:text-5xl">
              Reading about it is not{" "}
              <em className="font-display italic text-peach">evidence.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Build the four weeks in this browser, or send the application and
              start a fit conversation. The planner needs no account. Applying
              takes no payment and creates no commitment on either side.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/breakthrough"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105"
              >
                Build my 30-day plan <span aria-hidden>→</span>
              </Link>
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream motion-safe:transition hover:bg-white/5"
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
