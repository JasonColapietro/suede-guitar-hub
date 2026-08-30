import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
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

const CANONICAL = `${SITE_URL}/guides`;

const TITLE = "Guitar Practice Guides: The Complete GuitarHub Library";
// Kept inside 140-160 characters so Google prints the differentiating tail
// rather than truncating it.
const DESCRIPTION =
  "Every GuitarHub practice guide in one place, grouped by the problem it solves: learning the method, diagnosing a plateau, building the week, raising a ceiling.";

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

/**
 * The index date is derived from the guides it indexes rather than typed here,
 * so it cannot claim to be fresher than its own contents. The literal is a
 * floor — the date this page was written — not a second source of truth.
 */
const PAGE_WRITTEN = "2026-08-29";
const UPDATED = GUIDES.reduce(
  (latest, guide) => (guide.lastModified > latest ? guide.lastModified : latest),
  PAGE_WRITTEN,
);

/**
 * The grouping layer.
 *
 * Titles, blurbs and dates are never restated here — every card below renders a
 * `SiteEntry` straight out of `lib/site.ts`. What this array adds is editorial:
 * which problem a guide belongs to, and in what order the group reads. So it
 * holds hrefs only.
 *
 * Two consequences worth keeping:
 *
 * - An href listed here that the registry does not know renders nothing. That
 *   makes it safe to file a route ahead of its registry entry, and it means
 *   this page can never emit a link to a page that does not exist.
 * - A guide added to the registry that no group claims still appears, in the
 *   catch-all below. A hub whose whole job is reachability must not silently
 *   drop a page because nobody updated a list.
 */
type Cluster = {
  id: string;
  kicker: string;
  title: string;
  intro: ReactNode;
  hrefs: readonly string[];
};

const CLUSTERS: readonly Cluster[] = [
  {
    id: "start-here",
    kicker: "Start here",
    title: "What the method is",
    intro: (
      <>
        These set the terms the rest of the library uses. The method page is the
        spine of the site: one goal at a time, four stages, and an exit test for
        each stage so you can tell when it is finished instead of guessing. The
        rest of this group turns that into what you do with a single practice
        hour. Read them in the order below — every other group assumes them.
      </>
    ),
    hrefs: ["/method", "/how-to-practice-guitar-effectively"],
  },
  {
    id: "plateau",
    kicker: "Diagnosis",
    title: "When practice stops producing change",
    intro: (
      <>
        For the case where the sessions are happening and the playing is not
        moving. These are about finding the cause before prescribing a fix,
        because the most common way to lose a month is honest work on the part
        that was never the problem. If you finish them and still cannot name the
        cause, the{" "}
        <Link href="/diagnose" className="underline underline-offset-4">
          practice plateau diagnostic
        </Link>{" "}
        ends with a named blocker, which is the input the method needs anyway.
      </>
    ),
    hrefs: ["/guitar-practice-plateau", "/deliberate-practice-guitar"],
  },
  {
    id: "routine",
    kicker: "The routine",
    title: "Building the week and the month",
    intro: (
      <>
        Once you know what to fix, the question becomes where it goes in a week
        that already has a job and a bad Wednesday in it. This group covers the
        shape of a session, the shape of a week that survives contact with a
        real one, and how to run a month that ends with a recording you can
        compare rather than a streak you kept.
      </>
    ),
    hrefs: [
      "/guitar-practice-routine-intermediate",
      "/guitar-practice-schedule",
      "/how-long-to-practice-guitar-each-day",
      "/30-day-guitar-challenge",
    ],
  },
  {
    id: "ceilings",
    kicker: "Ceilings",
    title: "Technique ceilings and repertoire",
    intro: (
      <>
        Narrower problems, worked at the instrument: a tempo that will not climb,
        a click you are playing alongside instead of against, and a song that
        only exists while the tab is open. Each of these assumes you have already
        named the passage costing you the song, so they sit after the diagnosis
        rather than in place of it.
      </>
    ),
    hrefs: [
      "/why-cant-i-play-guitar-fast",
      "/practicing-guitar-with-a-metronome",
      "/how-to-memorize-songs-on-guitar",
    ],
  },
];

/** Renders only when a registry guide belongs to none of the groups above. */
const UNGROUPED: Cluster = {
  id: "more",
  kicker: "Also here",
  title: "The rest of the library",
  intro: (
    <>
      Guides that have not been filed into a group above yet. They are listed
      here so that nothing published on this site is unreachable from this page.
    </>
  ),
  hrefs: [],
};

type Group = { cluster: Cluster; entries: readonly SiteEntry[] };

/**
 * Resolves the registry against the grouping layer exactly once, at module
 * evaluation. A guide can only be claimed by the first group that lists it, so
 * an href duplicated across two groups still renders one card.
 */
function buildGroups(): readonly Group[] {
  const byHref = new Map(GUIDES.map((guide) => [guide.href, guide]));
  const claimed = new Set<string>();

  const grouped = CLUSTERS.map((cluster) => ({
    cluster,
    entries: cluster.hrefs.flatMap((href) => {
      const entry = byHref.get(href);
      if (!entry || claimed.has(href)) return [];
      claimed.add(href);
      return [entry];
    }),
  }));

  const leftovers = GUIDES.filter((guide) => !claimed.has(guide.href));

  return [...grouped, { cluster: UNGROUPED, entries: leftovers }].filter(
    (group) => group.entries.length > 0,
  );
}

const GROUPS = buildGroups();

/** Reading order across the whole page. The JSON-LD list below follows it. */
const ORDERED: readonly SiteEntry[] = GROUPS.flatMap((group) => group.entries);

/**
 * The router at the top of the page: a situation, and the one page to open.
 *
 * Rows point at tools as well as guides, because half of these situations are
 * better answered by a tool than by more reading. A row whose href is not in
 * the registry is dropped rather than rendered, so this list can name a route
 * that does not exist yet without ever shipping a dead link.
 */
const ENTRY_BY_HREF = new Map<string, SiteEntry>(
  [...TOOLS, ...GUIDES].map((entry) => [entry.href, entry]),
);

const ROUTER_ROWS: readonly { when: string; href: string }[] = [
  { when: "You have not read anything here yet", href: "/method" },
  {
    when: "You practise most days and nothing is changing",
    href: "/guitar-practice-plateau",
  },
  {
    when: "You cannot tell which part is the problem",
    href: "/diagnose",
  },
  {
    when: "You have an hour and no idea what to do with it",
    href: "/how-to-practice-guitar-effectively",
  },
  {
    when: "Your practice week collapses by Wednesday",
    href: "/guitar-practice-schedule",
  },
  {
    when: "It holds together slowly, then falls apart at speed",
    href: "/why-cant-i-play-guitar-fast",
  },
  {
    when: "You know the passage and want it drilled",
    href: "/tempo",
  },
  {
    when: "You want a month with an actual finish line",
    href: "/30-day-guitar-challenge",
  },
];

const ROUTES = ROUTER_ROWS.flatMap((row) => {
  const entry = ENTRY_BY_HREF.get(row.href);
  return entry ? [{ when: row.when, entry }] : [];
});

const LIBRARY_NOTES: readonly { title: string; body: string }[] = [
  {
    title: "One at a time",
    body: "A guide earns its reading when it answers a question you already have. Working through four in a week is the lesson-collecting habit the method is built against: the pile grows faster than you can play it down.",
  },
  {
    title: "Leave with a sentence",
    body: "The useful output of any page here is a named target with a location in it — the chorus-to-bridge change drops a beat. If you finish a guide and cannot write that sentence, it was the wrong guide for this month, not a failure of attention.",
  },
  {
    title: "Then go and run it",
    body: "None of this does anything by itself. The tools below are where a sentence becomes a plan for the week, and every guide hands off to one of them rather than ending on advice.",
  },
];

// The canonical estate @ids, defined once in app/layout.tsx, which renders on
// this page too. Referenced rather than redeclared, so the site keeps one node
// per entity instead of minting a duplicate publisher on every route.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const WEBSITE_ID = `${SITE_URL}/#website`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${CANONICAL}#collection`,
      url: CANONICAL,
      name: "Guitar practice guides",
      description: DESCRIPTION,
      inLanguage: "en-US",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
      dateModified: UPDATED,
      image: `${SITE_URL}/opengraph-image`,
      mainEntity: { "@id": `${CANONICAL}#guide-list` },
      breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
    },
    {
      "@type": "ItemList",
      "@id": `${CANONICAL}#guide-list`,
      name: "GuitarHub practice guides",
      // Built from the same array the page renders, so the count and the order
      // cannot drift from what a crawler actually finds in the markup.
      numberOfItems: ORDERED.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: ORDERED.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${guide.href}`,
        name: guide.title,
        description: guide.blurb,
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${CANONICAL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "GuitarHub", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Guides", item: CANONICAL },
      ],
    },
  ],
};

/** Small counts read as words in prose and as numerals in the meta line. */
const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

function spellOut(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function GuideCard({
  entry,
  index,
  total,
}: {
  entry: SiteEntry;
  index: number;
  total: number;
}) {
  return (
    <Link
      href={entry.href}
      className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-sm ring-1 ring-ink/5 transition hover:shadow-md motion-safe:hover:-translate-y-1"
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-violet">
        Read {index + 1} of {total}
      </span>
      <h3 className="mt-3 font-display text-xl leading-snug text-indigo-deep">
        {entry.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">{entry.blurb}</p>
      <span className="mt-auto pt-5 text-sm font-semibold text-violet">
        Open the guide <span aria-hidden>→</span>
      </span>
    </Link>
  );
}

export default function GuidesPage() {
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
              Guide library
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight md:text-5xl">
              Guitar practice guides, grouped by{" "}
              <em className="font-display italic text-peach">
                the problem they solve.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Every guide on this site, sorted into the situation it was written
              for, with a note on what each group is for and which page in it to
              read first.
            </p>
            <p className="mt-8 text-xs uppercase tracking-widest text-violet-soft">
              Updated <time dateTime={UPDATED}>{formatUpdated(UPDATED)}</time> ·{" "}
              {plural(ORDERED.length, "guide")} in{" "}
              {plural(GROUPS.length, "group")}
            </p>
          </div>
        </section>

        <nav
          aria-label="Guide groups"
          className="mx-auto max-w-5xl px-6 pt-12 md:pt-16"
        >
          <ul className="flex flex-wrap justify-center gap-3">
            {GROUPS.map((group) => (
              <li key={group.cluster.id}>
                <a
                  href={`#${group.cluster.id}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-cream-soft px-5 text-sm font-semibold text-indigo-deep transition hover:bg-white"
                >
                  {group.cluster.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section
          id="which-one"
          className="mx-auto max-w-4xl scroll-mt-28 px-6 py-16 md:py-20"
        >
          <h2 className="text-3xl leading-snug text-indigo-deep md:text-4xl">
            Which one do you need right now?
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            Find the line that describes this month and open the page next to it.
            Everything below this section is the same library arranged by theme,
            for when you want to read rather than fix something specific.
          </p>

          <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
            {ROUTES.map((route) => (
              <li
                key={route.entry.href}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <span className="text-base leading-relaxed text-ink/70">
                  {route.when}
                </span>
                <Link
                  href={route.entry.href}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full bg-cream-soft px-5 text-sm font-semibold text-indigo-deep transition hover:bg-indigo-deep hover:text-cream sm:self-auto"
                >
                  {route.entry.title} <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {GROUPS.map((group) => (
          <section
            key={group.cluster.id}
            id={group.cluster.id}
            className="mx-auto max-w-6xl scroll-mt-28 px-6 pb-16 md:pb-20"
          >
            <div className="max-w-2xl">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                {group.cluster.kicker}
              </span>
              <h2 className="mt-3 text-3xl leading-snug text-indigo-deep md:text-4xl">
                {group.cluster.title}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ink/70">
                {group.cluster.intro}
              </p>
            </div>

            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.entries.map((entry, index) => (
                <li key={entry.href}>
                  <GuideCard
                    entry={entry}
                    index={index}
                    total={group.entries.length}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section
          id="how-to-use"
          className="mx-auto max-w-6xl scroll-mt-28 px-6 pb-16 md:pb-20"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl leading-snug text-indigo-deep md:text-4xl">
              How to use the library
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              The library is a reference, not a syllabus. Nothing here counts how
              many pages you have read, and reading more of them is not the thing
              that moves your playing.
            </p>
          </div>

          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {LIBRARY_NOTES.map((note) => (
              <li key={note.title}>
                <div className="h-full rounded-3xl bg-cream-soft p-7 ring-1 ring-ink/5">
                  <h3 className="font-display text-xl leading-snug text-indigo-deep">
                    {note.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {note.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="tools"
          className="mx-auto max-w-6xl scroll-mt-28 px-6 pb-16 md:pb-20"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl leading-snug text-indigo-deep md:text-4xl">
              The {spellOut(TOOLS.length)} tools the guides hand off to
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">
              Each one runs in your browser. Nothing is uploaded and nothing is
              emailed, none of them ask for an account, and what you type stays
              on the device you typed it on.
            </p>
          </div>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="flex h-full flex-col rounded-3xl bg-white p-7 ring-1 ring-ink/5 transition hover:shadow-md motion-safe:hover:-translate-y-1"
                >
                  <h3 className="font-display text-xl leading-snug text-indigo-deep">
                    {tool.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {tool.blurb}
                  </p>
                  <span className="mt-auto pt-5 text-sm font-semibold text-violet">
                    Open it <span aria-hidden>→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ink/70">
            GuitarHub orchestrates the practice; Strumly powers the tools and
            keeps its own library on technique, gear and repertoire. When a guide
            here stops at the edge of its subject, it points there — the{" "}
            <a
              href={STRUMLY.guides}
              className="text-indigo-deep underline underline-offset-4 hover:text-violet"
            >
              Strumly guides <span aria-hidden>↗</span>
            </a>{" "}
            are the next layer down.
          </p>
        </section>

        <section className="px-3 pb-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
            <h2 className="mx-auto max-w-2xl text-4xl text-cream md:text-5xl">
              Pick one guide, then{" "}
              <em className="font-display italic text-peach">build the month.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/75">
              The planner turns one finish line into a four-week sequence and
              names the evidence each week has to produce. It needs no account.
              Applying to the founding room starts a fit conversation, is
              reviewed, and takes no payment.
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
