import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { APP_STORE, FREE_TOOLS, GUIDES, OFFER, PAID_TOOLS, SITE_URL, STRUMLY, TOOLS, lifetimeOfferAt, spellOut } from "@/lib/site";
import { FUNNEL_PRIMARY } from "@/lib/funnel";
import { DRILLS } from "@/lib/advanced/drills";
import { keywordsFor } from "@/lib/keywords";

const CANONICAL = `${SITE_URL}/faq`;

/** Read by both the visible trail and the BreadcrumbList JSON-LD below. */
const CRUMBS = crumbTrail("FAQ", CANONICAL);
const PUBLISHED = "2026-08-29";
const UPDATED = "2026-11-10";

const TITLE = "GuitarHub FAQ: Free Module, Price, Guarantee and Data";
// Kept between 140 and 160 characters. Every clause names something a reader
// is actually deciding (cost, access, the guarantee, data) rather than
// describing the page as "everything you need to know".
const DESCRIPTION =
  "GuitarHub answers: what is free, how lifetime access works on the web and iPhone, the 90-day guarantee, how the method runs, and where your data lives.";

/** A static page: priced from the offer in force when it is built. */
const OFFER_NOW = lifetimeOfferAt(new Date());
const LAUNCH_NOTE = OFFER_NOW.launchNote ? ` ${OFFER_NOW.launchNote}` : "";

export const metadata: Metadata = {
  keywords: keywordsFor("/faq"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    // No `images` key: Next attaches the colocated opengraph-image.tsx card
    // only when the page leaves `images` unset.
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

/** "Four", the free tools counted from the registry, so the count in an answer cannot drift. */
const TOOL_COUNT = spellOut(FREE_TOOLS.length);

/** The free and the lifetime tools, named from the registry. */
const FREE_TOOL_SENTENCE = sentenceList(FREE_TOOLS.map((tool) => `the ${lowerFirst(tool.title)}`));
const PAID_TOOL_SENTENCE = sentenceList(PAID_TOOLS.map((tool) => `the ${lowerFirst(tool.title)}`));

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
      "Explore the lessons, practice method, and browser tools, then choose where to begin.",
  },
  {
    id: "cost-and-data",
    title: "Cost, accounts, and your data",
    intro:
      `Your free module, the free tools and the guides cost nothing. Every other lesson opens with lifetime access, ${OFFER_NOW.oneTime} on guitarhub.org or in the iPhone app, backed by a 90-day guarantee. Your practice data stays on your device unless you choose to sync it. Here is exactly how each part works.`,
  },
  {
    id: "who-its-for",
    title: "Who it is for",
    intro:
      "Find a starting point for your experience, goals, and practice schedule.",
  },
  {
    id: "strumly-and-teachers",
    title: "Strumly, Suede AI, and teachers",
    intro:
      "Bring GuitarHub, Strumly, and your teacher into a focused weekly practice routine.",
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
    a: `GuitarHub is the Suede AI guitar lessons site, built to get you playing real chords and improvising your first solo in 30 days. It pairs a step-by-step guitar curriculum with a practice method, ${TOOL_COUNT} free browser tools, and the Advanced Lab for experienced players. The 30-day path runs four modules in order: D and A, then E, C and G, then the minor pentatonic box, then a first solo over a twelve-bar blues. The method behind it is one loop in four stages: baseline, isolate, reconnect, prove. Record where you are, isolate the single thing that breaks the result, reconnect that repair to a full performance, then record again and compare the two takes. Voice lessons live on Suede Sing.`,
  },
  {
    id: "what-guitarhub-is-not",
    group: "what-it-is",
    q: "How can I use GuitarHub?",
    a: `Start free on guitarhub.org: take the five-question placement and your free module opens, get the free 30-day plan with its chord and pentatonic chart pack, and tune and keep time with the tuner and metronome. When you are ready for every lesson, buy lifetime access for ${OFFER_NOW.oneTime} on guitarhub.org or in ${APP_STORE.name} for iPhone. It opens the full curriculum, the Advanced Lab and the daily practice routine.`,
  },
  {
    id: "what-are-the-tools",
    group: "what-it-is",
    q: "What are the tools, exactly?",
    a: `The tools are ${TOOL_SENTENCE}. Each one runs in the browser you are reading this in. ${FREE_TOOL_SENTENCE.charAt(0).toUpperCase()}${FREE_TOOL_SENTENCE.slice(1)} are free and need no account; ${PAID_TOOL_SENTENCE} come with lifetime access. The planning tools keep what you enter in this browser, each with a button that clears it. The tuner and metronome share one page, so tuning up and practicing to a click take nothing else.`,
  },
  {
    id: "is-this-an-ai-product",
    group: "what-it-is",
    q: "Is GuitarHub an AI product?",
    a: "Not in the way that phrase is usually meant. There is no chatbot on this site, no generated commentary on your playing, and no model looking at anything you do. The tools follow written rules and return the same output for the same input, and the microphone exercises measure single-note pitch and timing with fixed signal processing on your device. Strumly, a separate Suede AI product, is the AI guitar coach, and this site links out to it instead of embedding it.",
  },

  // Cost, accounts, and your data
  {
    id: "is-it-free",
    group: "cost-and-data",
    q: "Is GuitarHub free?",
    a: `Your first module is free: the five-question placement picks it, D and A for new players, Box One once you change between open chords, or First Solo when barre chords and the pentatonic box are under your fingers. Also free, with no card and no sign-up: the tuner and metronome, the 30-day plan builder, the practice plateau diagnostic, the placement itself, the tempo ladder builder, the written guides and their PDF field guides, and the glossary. Every other lesson, the ${DRILLS.length}-drill Advanced Lab, the A-to-D chord practice routine and ${PAID_TOOL_SENTENCE} open with lifetime access: ${OFFER_NOW.oneTime}.${LAUNCH_NOTE}`,
  },
  {
    id: "how-to-get-lifetime-access",
    group: "cost-and-data",
    q: "How do I get lifetime lesson access?",
    a: `Buy it once, on the web or on iPhone. On guitarhub.org, choose Get lifetime access, pay through Stripe Checkout, then sign in with the email from your receipt. In ${APP_STORE.name}, buy lifetime access in the app: ${OFFER_NOW.oneTime} in the US App Store, charged in local currency on other countries' App Stores, with Restore Purchases bringing it back on a new iPhone. Sign in with the same email on both and one purchase opens every lesson on guitarhub.org and in the iPhone app.`,
  },
  {
    id: "can-i-buy-on-the-web",
    group: "cost-and-data",
    q: "Can I buy on the web?",
    a: `Yes. Lifetime access is ${OFFER_NOW.oneTime} on guitarhub.org through Stripe Checkout, with sales tax added at checkout where it applies. Enter your email at checkout, then sign in with that email to open every lesson here and in ${APP_STORE.name}.`,
  },
  {
    id: "how-does-the-guarantee-work",
    group: "cost-and-data",
    q: "How does the 90-day guarantee work?",
    a: `${OFFER.guarantee} The guarantee covers lifetime access bought on guitarhub.org: email info@suedeai.ai from the address on your receipt, and the refund goes back to your original payment method. A refund ends lifetime access on the web and on iPhone. Apple handles refunds for purchases made in the iPhone app.`,
  },
  {
    id: "do-i-need-an-account",
    group: "cost-and-data",
    q: "Do I need an account?",
    a: "Not to start. Your free module, the free tools, the 30-day plan and the guides open without signing in, and your free module is kept in this browser. An account, created with a code sent to your email, opens lifetime access you bought on the web, links a purchase made in the iPhone app, keeps your free module on every device, and turns on optional practice sync. You can delete it from the account page at any time; a purchase stays tied to your email.",
  },
  {
    id: "where-is-my-data-stored",
    group: "cost-and-data",
    q: "Where is my data stored?",
    a: "On your device. Plans, logs, lesson progress, drill results, and preferences are saved in this browser's local storage, so closing the tab keeps them and reopening the page brings them back. They stay on the device you used: a plan built on a laptop is not on your phone. If you sign in and explicitly turn on practice sync, new lesson attempts are also saved to your account; earlier records stay local. Clearing your browser data removes the local copy for good.",
  },
  {
    id: "are-recordings-uploaded",
    group: "cost-and-data",
    q: "Does GuitarHub record or upload my playing?",
    a: "GuitarHub never uploads audio. The tuner, the lesson exercises, and the Advanced Lab drills listen through your microphone only after you start them, and measure pitch and timing live on your device; the raw audio is not saved or sent anywhere. Saving a take is always your choice: the iPhone app keeps one optional take per lesson on your phone, and voice takes saved in this browser before the voice lessons moved to Suede Sing stay playable and deletable on the Saved voice takes page. For the method's baseline, record on your phone with any voice-memo app.",
  },
  {
    id: "does-anything-train-on-my-playing",
    group: "cost-and-data",
    q: "Does anything here train on my playing?",
    a: "No. Nothing on this site trains a model on your playing. GuitarHub prescribes practice; it does not collect performances. Microphone audio is analyzed on your device and never sent. The plan and guide forms send the email you enter, and optional practice sync, if you turn it on, sends lesson-attempt results such as scores and tempos, never audio.",
  },
  {
    id: "tracking-and-analytics",
    group: "cost-and-data",
    q: "Is there tracking or analytics on this site?",
    a: "GuitarHub runs no analytics script, no tracking cookies and no third-party tracker. Check it yourself: open the page source or your browser's network panel and see what loads. Vercel, which hosts the site, processes ordinary connection logs to deliver and protect it.",
  },

  // Who it is for
  {
    id: "who-is-it-for",
    group: "who-its-for",
    q: "Who is GuitarHub for?",
    a: "Beginner and intermediate guitarists who want to play real chords and improvise. New players start the 30-day path at D and A. Players who already change between open chords start at the minor pentatonic box, and players with barre chords and the box under their fingers start at a first solo, then take the Advanced Lab. Returning players coming back after a long gap take the placement and land where their hands are today.",
  },
  {
    id: "who-is-it-not-for",
    group: "who-its-for",
    q: "Where should a beginner start?",
    a: "Take the five-question placement. A new player's free module is D and A: two chords, checked string by string, then switched on the beat. If you have never held a guitar, the first stage of the guitar path covers holding the instrument, tuning, and playing a clean note.",
  },
  {
    id: "how-much-time",
    group: "who-its-for",
    q: "How much time does this take?",
    a: "The 30-day plan asks how many days a week you practice and how many minutes you get per session, and labels your plan with that cadence. It accepts three to six days and sessions of 15 to 60 minutes, and it builds the same four weeks from D and A to your first solo at any of those settings. Each week ends with something recorded, which costs about as long as one take.",
  },

  // Strumly, Suede Labs, and teachers
  {
    id: "how-it-relates-to-strumly",
    group: "strumly-and-teachers",
    q: "How does GuitarHub relate to Strumly and Suede AI?",
    a: "GuitarHub, Strumly, Suede Sing, and Suede AI Social are Suede AI products, founded by Jason Colapietro. GuitarHub teaches guitar and structures your practice, Strumly is the AI guitar coach, Suede Sing is the home for voice lessons on the web, and Suede AI Social carries the wider conversation.",
  },
  {
    id: "does-it-replace-a-teacher",
    group: "strumly-and-teachers",
    q: "How can I use this alongside a teacher?",
    a: "Use GuitarHub to structure practice between lessons. Bring your teacher a baseline recording, a recent attempt, and a specific question. Their feedback gives you a focused correction to practice during the week.",
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
      image: `${CANONICAL}/opengraph-image`,
      inLanguage: "en-US",
      datePublished: PUBLISHED,
      dateModified: UPDATED,
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

      <main id="main-content" tabIndex={-1}>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-pale">
              GuitarHub FAQ
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight md:text-5xl">
              GuitarHub FAQ:{" "}
              <em className="font-display italic text-peach">
                straight answers.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-cream">
              {OFFER.promise}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/75">
              What GuitarHub is, what is free, how lifetime access works on
              the web and on iPhone, how the 90-day guarantee works, and what
              happens to anything you type into it.
            </p>
            <p className="mt-8 text-xs uppercase tracking-widest text-white/80">
              Updated <time dateTime={UPDATED}>November 10, 2026</time>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pt-16 md:pt-20">
          <p className="text-lg leading-relaxed text-ink/70">
            Every answer below describes the site as it runs today, and you can
            check each one against the site itself. Where a claim is an argument
            about how practice works rather than a fact about the software, it
            is written as an argument.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Have a question this page does not answer? Mail{" "}
            <a
              href="mailto:info@suedeai.ai"
              className="text-indigo-deep underline underline-offset-4 hover:text-violet"
            >
              info@suedeai.ai
            </a>{" "}
            and you get a personal reply.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Weighing GuitarHub against Fender Play, Yousician, JustinGuitar,
            Guitar Tricks or Ultimate Guitar?{" "}
            <Link
              href="/compare"
              className="text-indigo-deep underline underline-offset-4 hover:text-violet"
            >
              See the side-by-side comparisons
            </Link>
            , with lessons, feedback and practice tools compared row by row.
          </p>
          <div className="strings-divider mx-auto mt-14 h-10 max-w-xs" aria-hidden />
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16" aria-labelledby="on-this-page">
          <h2
            id="on-this-page"
            className="text-xs font-semibold uppercase tracking-widest text-violet"
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
                ? "bg-cream-soft px-6 py-20"
                : "px-6 py-20"
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
                    className="rounded-3xl bg-white p-7 ring-1 ring-ink/5"
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
            Nothing uploaded. Each one opens in this browser and keeps its
            state there until you clear it. The {TOOL_COUNT} free tools need
            no account; the rest come with lifetime access.
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
                <h3 className="mt-14 text-xs font-semibold uppercase tracking-widest text-violet">
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

            <h3 className="mt-14 text-xs font-semibold uppercase tracking-widest text-violet">
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
                  Suede AI Social <span aria-hidden>↗</span>
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
              Start the 30 days{" "}
              <em className="font-display italic text-peach">today.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Get the four weeks from D and A to your first solo, with a
              printable chord and pentatonic chart pack in your inbox. Or take
              the five-question placement and start your free module now.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={FUNNEL_PRIMARY.magnet.href}
                data-funnel-primary
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105"
              >
                {FUNNEL_PRIMARY.magnet.label} <span aria-hidden>→</span>
              </Link>
              <Link
                href={FUNNEL_PRIMARY.freeModule.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream motion-safe:transition hover:bg-white/5"
              >
                {FUNNEL_PRIMARY.freeModule.label} <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="mx-auto mt-6 max-w-xl text-sm text-white/70">
              The plan arrives by email with practice tips, and every email has
              an unsubscribe link.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
