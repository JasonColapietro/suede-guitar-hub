import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import {
  GUIDES,
  OG_IMAGE,
  SITE_URL,
  STRUMLY,
  TOOLS,
  type SiteEntry,
} from "@/lib/site";

const CANONICAL = `${SITE_URL}/tools`;
const PUBLISHED = "2026-08-29";

const TITLE = "Free Guitar Practice Tools | GuitarHub";
// 146 characters. No count of the tools appears here or anywhere in the body
// copy: this page is generated from the registry, and a hard-typed "four"
// becomes a lie the moment a fifth entry is added to `TOOLS`.
const DESCRIPTION =
  "Every free guitar practice tool on GuitarHub in one place: what each one is for, who it helps, and why they all run in your browser with no account.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description:
      "Planner, diagnostic, tempo ladder, readiness score. Free, no account, and nothing you type leaves your browser.",
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
 * The per-tool copy the registry does not carry.
 *
 * `lib/site.ts` holds the href, the title and the one-line blurb, because those
 * are used by the footer and the sitemap too. The two longer lines below are
 * specific to this page, so they live here, keyed by href.
 *
 * Keyed rather than listed, and read with a lookup that is allowed to miss: the
 * card grid maps over `TOOLS`, so a tool added to the registry appears here
 * automatically with its title and blurb even before anyone writes its two
 * lines. A missing entry costs the card two rows. A hardcoded list would cost
 * it the whole card.
 */
type ToolDetail = {
  /** What the tool does, in terms of what you put in and what comes back. */
  purpose: string;
  /** The player it is built for, described by their situation. */
  audience: string;
};

const TOOL_DETAILS: Readonly<Record<string, ToolDetail>> = {
  "/breakthrough": {
    purpose:
      "You choose one finish line, say where you are as a player, and say how many days a week and how many minutes a session you actually have. It returns four weeks, each with a focus, the actions that serve it, and the recording that ends the week.",
    audience:
      "Players who practice regularly and still reach the end of a month unable to say what changed. Also anyone whose month keeps splitting across five goals at once.",
  },
  "/diagnose": {
    purpose:
      "Nine questions about how you practice now, not how you mean to. Each answer scores five named blockers against their own maximum, and the result is the one your answers point at hardest, with a prescription and a first action.",
    audience:
      "Players who are putting in the hours, know something has stopped working, and cannot name which part of the routine it is.",
  },
  "/tempo": {
    purpose:
      "You give it the tempo you already play a passage cleanly and the tempo you want. It returns an ordered set of sessions between them, with the step size capped, sessions that hold a tempo instead of adding to it, and a pass condition on every rung.",
    audience:
      "Anyone whose speed work is pushing the metronome up until the passage falls apart, then starting over the next day from a number they cannot remember.",
  },
  "/readiness": {
    purpose:
      "Ten yes-or-no checks about things that have either happened with a song or have not, weighted into a score and a band. It hands back the heaviest check still open, with one instruction you can run in a session.",
    audience:
      "Players deciding whether a song is finished, and anyone about to play one standing up, in front of a person, or into a camera.",
  },
};

/**
 * The routing question this page exists to answer, and the reason the tools are
 * not interchangeable: each one serves a different stage of the method.
 *
 * Hrefs only. Titles and blurbs are read from `TOOLS` at render, so a title
 * edited in `lib/site.ts` changes here too, and a row whose tool has been
 * removed from the registry drops out instead of rendering a dead link.
 */
const ROUTING: readonly { href: string; sentence: string; stage: string }[] = [
  {
    href: "/diagnose",
    sentence:
      "I practice most days and cannot say what stopped producing change.",
    stage: "Before the baseline. It ends with a named blocker.",
  },
  {
    href: "/breakthrough",
    sentence: "I know what I want to fix and the month keeps dissolving.",
    stage: "The whole loop, laid out one stage per week.",
  },
  {
    href: "/tempo",
    sentence: "One passage holds together up to a speed and then does not.",
    stage: "Isolate. The stage where the fragment gets repaired.",
  },
  {
    href: "/readiness",
    sentence: "I think this song is finished and I am not sure I believe it.",
    stage: "Reconnect and prove. What survives outside practice.",
  },
];

const ROUTING_ROWS = ROUTING.flatMap((row) => {
  const tool = TOOLS.find((entry) => entry.href === row.href);
  return tool ? [{ ...row, tool }] : [];
});

const COMMON = [
  {
    title: "Free, with nothing behind it",
    body: "No payment step, no card, no trial, and no locked second half. Nothing on this site takes money, so there is no version of these tools you are being shown the outline of.",
  },
  {
    title: "No account",
    body: "No sign-up, no login, no password, no email address. Not a guest mode either — there is no account system here to be a guest of.",
  },
  {
    title: "Runs in your browser",
    body: "The plan, the ladder, and the score are computed by code already running on the page. Your answers are not sent somewhere to be processed and handed back.",
  },
  {
    title: "Stores nothing on a server",
    body: "Each tool keeps its state in your browser's local storage and nowhere else. Close the tab and the work is still there. Clear your browser data and it is gone, including for us, who never had it.",
  },
];

const LIMITS = [
  "No metronome, no tuner, and no audio of any kind. Use the ones you already practice with.",
  "Nothing is recorded, uploaded, or listened to. Every honest answer these tools depend on is one you supply.",
  "State does not follow you between devices or browsers, because there is no account to carry it. A plan built on your laptop is not on your phone.",
  "Clearing your browser data deletes what you entered, and it cannot be restored from here.",
  "They need JavaScript. The results are computed on the page rather than fetched, so nothing computes without it.",
  "They prescribe practice and cannot hear you play. A tool can tell you the next tempo. It cannot tell you your left hand is late because your right hand is early.",
];

/**
 * Rendered as the visible questions below AND as the FAQPage nodes in the
 * graph, from this one array. Schema.org requires the marked-up answer to
 * appear on the page, so generating both from a single source is the only way
 * to keep that true after an edit. Keep these plain strings: no links, no
 * markup.
 */
const FAQS = [
  {
    q: "Are the tools actually free?",
    a: "Yes, and there is nothing here to upgrade to. No payment is taken anywhere on this site and no card is collected. The tools are not a trial, a sample, or a gated preview of a larger version — what is on the page is the whole tool.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no sign-up, no login, and no password anywhere on GuitarHub, because there is no account system. Nothing asks for your email address except the founding-room application, which is a separate thing and is not required to use any tool.",
  },
  {
    q: "Where does what I type go?",
    a: "Into your own browser's local storage, under a key belonging to that tool, and nowhere else. Nothing you enter is transmitted. There is also no analytics script and no third-party tracker on this site, which you can confirm from the page source rather than take on trust.",
  },
  {
    q: "Which tool should I open first?",
    a: "If you cannot name what stopped working, start with the practice plateau diagnostic, because every other tool needs a target and that one produces it. If you already know the goal, start with the 30-day breakthrough planner.",
  },
  {
    q: "Can I use them without JavaScript?",
    a: "No. The plans, ladders, and scores are computed by code running in your browser rather than fetched from a server. That is the same design decision that keeps your answers off a server, and the cost of it is that nothing computes with JavaScript switched off.",
  },
] as const;

// The canonical estate @ids, copied from app/layout.tsx. Referenced rather than
// redefined: the Organization, Person, and WebSite nodes are declared once in
// the root layout, which renders on this page too, so Google resolves these
// within the page.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const WEBSITE_ID = `${SITE_URL}/#website`;
const ITEMLIST_ID = `${CANONICAL}#tools`;

/**
 * The ItemList is built from `TOOLS`, so it can never drift from the cards
 * rendered below it — the failure mode structured data usually dies of.
 *
 * Each item carries the `<url>#tool` @id that the tool's own page already mints
 * for its `SoftwareApplication` node, so the entity is referenced rather than
 * duplicated. The name, url, and description are repeated here anyway: an @id
 * only unifies nodes that a crawler has actually fetched, so a tool page not
 * yet crawled still resolves to a complete, self-sufficient node from this one.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${CANONICAL}#collectionpage`,
      url: CANONICAL,
      name: TITLE,
      description: DESCRIPTION,
      image: OG_IMAGE.url,
      inLanguage: "en-US",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      mainEntity: { "@id": ITEMLIST_ID },
      breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
    },
    {
      "@type": "ItemList",
      "@id": ITEMLIST_ID,
      name: "Free guitar practice tools",
      description:
        "The practice tools published on GuitarHub. Each one is free, runs in the browser, and requires no account.",
      numberOfItems: TOOLS.length,
      itemListOrder: "https://schema.org/ItemListUnordered",
      itemListElement: TOOLS.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.title,
        item: {
          "@type": "SoftwareApplication",
          "@id": `${SITE_URL}${tool.href}#tool`,
          name: tool.title,
          url: `${SITE_URL}${tool.href}`,
          description: TOOL_DETAILS[tool.href]?.purpose ?? tool.blurb,
          applicationCategory: "EducationalApplication",
          applicationSubCategory: "Guitar practice tool",
          operatingSystem: "Web",
          browserRequirements:
            "Requires JavaScript. No account, and nothing is uploaded.",
          isAccessibleForFree: true,
          // Genuinely free: there is no payment step, no card, and no gate
          // anywhere in any of these tools.
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          inLanguage: "en-US",
          isPartOf: { "@id": WEBSITE_ID },
          publisher: { "@id": SUEDE_ORG_ID },
          author: { "@id": JASON_PERSON_ID },
        },
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${CANONICAL}#faq`,
      inLanguage: "en-US",
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: FAQS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${CANONICAL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "GuitarHub", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Tools", item: CANONICAL },
      ],
    },
  ],
};

const CARD =
  "flex h-full flex-col rounded-3xl bg-white p-7 ring-1 ring-ink/5 " +
  "motion-safe:transition has-[a:hover]:shadow-md has-[a:hover]:ring-violet/20";

// Pills rather than links inside a sentence: an inline-flex link cannot wrap
// mid-phrase, and a 20px inline link is not a tap target at 390px.
const LINK_PILL =
  "inline-flex min-h-11 items-center gap-1 rounded-full bg-cream-soft px-5 py-2.5 " +
  "text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white";

function ToolCard({ tool }: { tool: SiteEntry }) {
  const detail = TOOL_DETAILS[tool.href];

  return (
    <article className={CARD}>
      <h3 className="font-display text-2xl leading-snug text-indigo-deep">
        <Link
          href={tool.href}
          className="inline-flex min-h-11 items-center gap-2 hover:text-violet"
        >
          {tool.title} <span aria-hidden>→</span>
        </Link>
      </h3>

      <p className="mt-2 text-base leading-relaxed text-ink/70">{tool.blurb}</p>

      {detail ? (
        <dl className="mt-6 space-y-4 border-t border-ink/10 pt-5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-violet">
              What it is for
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink/70">
              {detail.purpose}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-violet">
              Who it helps
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink/70">
              {detail.audience}
            </dd>
          </div>
        </dl>
      ) : null}
    </article>
  );
}

export default function ToolsPage() {
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
              Free practice tools
            </span>
            <h1 className="mx-auto mt-7 max-w-4xl text-4xl leading-tight md:text-6xl">
              Free guitar practice tools{" "}
              <em className="font-display italic text-peach">
                that run in your browser.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Every tool GuitarHub publishes, in one place: what each one is for,
              who it helps, and which part of the practice loop it belongs to.
              None of them ask for an account, and nothing you type into them
              leaves your browser.
            </p>
          </div>
        </section>

        <section className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
              The common thread
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
              The same conditions,{" "}
              <em className="font-display italic">on every one of them.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-ink/70">
              These are not a funnel with the good part behind a form. They are
              small, finished tools, and the conditions below are the same for
              all of them.
            </p>

            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-2">
              {COMMON.map((item) => (
                <article key={item.title} className="bg-cream p-7">
                  <h3 className="font-display text-2xl leading-snug text-indigo-deep">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ink/70">
              The last one is a claim you can check rather than trust. There is
              no analytics script and no third-party tracker on this site, which
              the page source will tell you faster than we can. Nothing here
              records audio, accepts an upload, or listens to you play. When a
              tool tells you to record a baseline, it means on your phone, kept
              by you.
            </p>
            {/* A pill rather than a link inside that sentence: an inline
                prose link renders about 22px tall, which is not a tap target
                at 390px. Same reason the routing section below carries one. */}
            <p className="mt-6">
              <Link href="/about" className={LINK_PILL}>
                What happens to anything you type <span aria-hidden>→</span>
              </Link>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
            The tools.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-ink/70">
            Each one does a different job inside the same loop, which is why
            there is no single &ldquo;start here&rdquo; button. Open the one
            that matches the sentence you would use to describe the problem.
          </p>

          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {TOOLS.map((tool) => (
              <li key={tool.href}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>

        {ROUTING_ROWS.length > 0 ? (
          <section className="bg-cream-soft px-6 py-20">
            <div className="mx-auto max-w-6xl">
              <h2 className="max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
                Which one to open first.
              </h2>
              <p className="mt-6 max-w-2xl text-lg text-ink/70">
                Find your sentence on the left. The stage on the right is where
                that tool sits in the four-stage loop the whole site runs on:
                baseline, isolate, reconnect, prove.
              </p>
              <p className="mt-6">
                <Link href="/method" className={LINK_PILL}>
                  The GuitarHub method <span aria-hidden>→</span>
                </Link>
              </p>

              <ul className="mt-12 space-y-4">
                {ROUTING_ROWS.map((row) => (
                  <li
                    key={row.href}
                    className="grid gap-5 rounded-3xl bg-cream p-7 ring-1 ring-ink/5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center"
                  >
                    <div>
                      <p className="font-display text-xl leading-snug text-indigo-deep">
                        &ldquo;{row.sentence}&rdquo;
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-ink/60">
                        {row.stage}
                      </p>
                    </div>
                    <div className="md:justify-self-end">
                      <Link href={row.href} className={LINK_PILL}>
                        {row.tool.title} <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-4xl leading-snug text-indigo-deep md:text-5xl">
            What these tools do not do.
          </h2>
          <p className="mt-6 text-lg text-ink/70">
            The limits are the other half of the privacy claim. Nothing above is
            free because something else is being taken instead — it is free
            because these tools are small and do less than a product would.
          </p>
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
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-4xl leading-snug text-indigo-deep md:text-5xl">
            The thinking behind them.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-ink/70">
            Every tool here is an argument about practice with a form attached.
            The guides are the argument written out, including the parts a form
            cannot make.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <li key={guide.href}>
                <Link
                  href={guide.href}
                  className="block h-full rounded-3xl bg-white p-6 ring-1 ring-ink/5 motion-safe:transition hover:-translate-y-1 hover:shadow-md"
                >
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

          <p className="mt-10 max-w-2xl text-ink/70">
            The tools decide what to practice. For the material that does it —
            the metronome work, the chord shapes, the coach — GuitarHub links
            out to Strumly rather than building a second, worse copy:
          </p>
          <ul className="mt-5 flex flex-wrap gap-3">
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
                href={STRUMLY.guides}
                target="_blank"
                rel="noopener"
                className={LINK_PILL}
              >
                All Strumly guides <span aria-hidden>↗</span>
              </a>
            </li>
          </ul>
        </section>

        <section className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl leading-snug text-indigo-deep md:text-5xl">
              Common questions.
            </h2>
            <dl className="mt-10 space-y-8">
              {FAQS.map((item) => (
                <div
                  key={item.q}
                  className="rounded-3xl bg-cream p-7 ring-1 ring-ink/5"
                >
                  <dt className="font-display text-2xl leading-snug text-indigo-deep">
                    {item.q}
                  </dt>
                  <dd className="mt-3 text-base leading-relaxed text-ink/70">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="px-3 py-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
            <h2 className="mx-auto max-w-3xl text-4xl leading-tight md:text-5xl">
              The tools are the practice.{" "}
              <em className="font-display italic text-peach">
                The room is the correction.
              </em>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              A form can hand you the next tempo and the next week. It cannot
              listen to your recording and tell you which of the four things
              going wrong is causing the other three. The founding room is being
              assembled for that part: a small crew, a weekly recording, and one
              correction that changes the next session.
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
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream motion-safe:transition hover:bg-white/5"
              >
                Build the 30-day plan <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="mx-auto mt-6 max-w-xl text-sm text-white/60">
              Applying is an application, and it is reviewed. It takes no
              payment, asks for no card, and creates no commitment on either
              side.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
