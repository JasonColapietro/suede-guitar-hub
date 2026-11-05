import Link from "next/link";
import type { ReactNode } from "react";
import Article, { type RelatedLink } from "@/components/Article";
import { breadcrumbList } from "@/lib/breadcrumbs";
import {
  COMPETITORS,
  GUITARHUB,
  GUITARHUB_CELLS,
  GUITARHUB_MODEL,
  GUITARHUB_SOURCES,
  ROW_LABELS,
  ROW_ORDER,
  VERIFIED_LABEL,
  alternativesHref,
  comparisonPage,
  vsHref,
  type Competitor,
  type ComparisonPageInfo,
  type Faq,
  type Source,
} from "@/lib/comparisons";
import { jsonLdText } from "@/lib/course-schema";
import { webPageNode } from "@/lib/page-schema";
import {
  APP_STORE,
  COMPARISONS,
  COMPARISONS_VERIFIED,
  HUBS,
  LEARN,
  LIFETIME,
  SITE_URL,
  TOOLS,
} from "@/lib/site";

/**
 * The two comparison page types under /compare, rendered from the verified
 * facts in `lib/comparisons.ts`. Server Components, zero JavaScript.
 *
 * Each page answers first, then shows the side-by-side table, the pricing
 * with its "as of" date, the reasons to choose GuitarHub, an FAQ and the
 * sources every competitor fact was checked against. The FAQ questions render
 * as headings and are the same strings the FAQPage JSON-LD carries, so the
 * markup never claims an answer the page does not show.
 */

const TABLE_WRAP = "mt-8 overflow-x-auto rounded-3xl bg-white ring-1 ring-ink/5";
const TABLE = "w-full min-w-[34rem] border-collapse text-left text-base";
const TH_COL = "bg-cream-soft px-4 py-3 align-bottom font-semibold text-indigo-deep";
const TH_ROW = "px-4 py-3 align-top font-semibold text-indigo-deep";
const TD = "px-4 py-3 align-top leading-relaxed text-ink/75";
const ROW = "border-t border-ink/5";

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function ComparisonTable({ rival }: { rival: Competitor }) {
  return (
    <div className={TABLE_WRAP}>
      <table className={TABLE}>
        <caption className="sr-only">
          GuitarHub and {rival.name} compared, facts checked {VERIFIED_LABEL}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH_COL}>
              <span className="sr-only">Feature</span>
            </th>
            <th scope="col" className={TH_COL}>
              GuitarHub
            </th>
            <th scope="col" className={TH_COL}>
              {rival.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {ROW_ORDER.map((row) => (
            <tr key={row} className={ROW}>
              <th scope="row" className={TH_ROW}>
                {ROW_LABELS[row]}
              </th>
              <td className={TD}>{GUITARHUB_CELLS[row]}</td>
              <td className={TD}>{rival.cells[row]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlternativesTable({ rival }: { rival: Competitor }) {
  const others = COMPETITORS.filter((entry) => entry.slug !== rival.slug);
  return (
    <div className={TABLE_WRAP}>
      <table className={TABLE}>
        <caption className="sr-only">
          {rival.name} alternatives compared, facts checked {VERIFIED_LABEL}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH_COL}>
              Alternative
            </th>
            <th scope="col" className={TH_COL}>
              Price and format (as of November 2026)
            </th>
            <th scope="col" className={TH_COL}>
              Full comparison
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className={ROW}>
            <th scope="row" className={TH_ROW}>
              GuitarHub (our pick)
            </th>
            <td className={TD}>{GUITARHUB_MODEL}</td>
            <td className={TD}>
              <Link href={vsHref(rival.slug)} prefetch={false}>
                GuitarHub vs {rival.name}
              </Link>
            </td>
          </tr>
          {others.map((entry) => (
            <tr key={entry.slug} className={ROW}>
              <th scope="row" className={TH_ROW}>
                {entry.name}
              </th>
              <td className={TD}>{entry.model}</td>
              <td className={TD}>
                <Link href={vsHref(entry.slug)} prefetch={false}>
                  GuitarHub vs {entry.name}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FaqList({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <>
      {faqs.map((faq) => (
        <section key={faq.id} id={faq.id}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </section>
      ))}
    </>
  );
}

function SourceList({ sources }: { sources: readonly Source[] }) {
  return (
    <ul>
      {sources.map((source) => (
        <li key={source.url}>
          <a href={source.url}>{source.label}</a>
        </li>
      ))}
    </ul>
  );
}

/** Two years of the published annual plan, against the one-time price. */
function TwoYearCost({ rival }: { rival: Competitor }) {
  if (!rival.yearlyUsd) return null;
  return (
    <p>
      Over two years, {rival.name}&apos;s annual plan comes to{" "}
      <strong>{usd(rival.yearlyUsd * 2)}</strong> at the November 2026 US
      price. GuitarHub lifetime access stays <strong>{LIFETIME.display}</strong>,
      and every free tool, guide and Advanced Lab drill stays free.
    </p>
  );
}

/** What GuitarHub is, stated from the registries. Shared by both page types. */
function GuitarHubTeaching() {
  return (
    <>
      <p>
        GuitarHub teaches guitar in order. The{" "}
        <Link href="/learn/guitar">guitar curriculum</Link> holds{" "}
        {GUITARHUB.lessons} guided lessons, including {GUITARHUB.songCompanions}{" "}
        popular-song practice companions, and every lesson pairs written,
        step-by-step instruction with a practice task. Microphone exercises
        score pitch and attack timing on your device, and lifetime access is{" "}
        {LIFETIME.oneTime} in <a href={APP_STORE.ios}>{APP_STORE.name}</a>, with
        the first module free.
      </p>
      <p>
        Around the lessons sits <Link href="/method">the GuitarHub method</Link>:
        pick one change you can prove in 30 days, record a baseline, isolate the
        one thing that breaks the result, reconnect the repair to the full song,
        then record again and compare the two takes. The{" "}
        <Link href="/tools">{GUITARHUB.tools} free practice tools</Link> run that
        loop in any browser with no account, and the{" "}
        <Link href="/advanced">Advanced Lab</Link> gives experienced players{" "}
        {GUITARHUB.drills} free drills scored live through the microphone.
      </p>
    </>
  );
}

function StartSteps({ rival }: { rival: Competitor }) {
  return (
    <ol>
      <li>
        Take the five-question <Link href="/start">level check</Link>. It
        places you at stage 1, stage 3 or the free Advanced Lab.
      </li>
      <li>
        Name one finish line in the{" "}
        <Link href="/breakthrough">30-day breakthrough planner</Link> and{" "}
        <Link href="/record-guitar-practice-on-phone">
          record a baseline on your phone
        </Link>
        .
      </li>
      <li>
        Bring the song you were working on in {rival.name}: build a{" "}
        <Link href="/tempo">tempo ladder</Link> for its hardest passage and
        check it with the <Link href="/readiness">song readiness score</Link>.
      </li>
      <li>
        Download <a href={APP_STORE.ios}>{APP_STORE.name}</a>, start the free
        first module, and buy lifetime access for {LIFETIME.oneTime} to open
        all {GUITARHUB.lessons} lessons.
      </li>
    </ol>
  );
}

function CallToAction() {
  return (
    <section data-print="hide" className="px-3 pb-3">
      <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
        <h2 className="mx-auto max-w-2xl text-4xl text-cream md:text-5xl">
          Start with GuitarHub{" "}
          <em className="font-display italic text-peach">today.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/75">
          Try the free tools in this browser right now, find your stage in five
          questions, or open the full course on iPhone for{" "}
          {LIFETIME.oneTime}.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={APP_STORE.ios}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
          >
            Get lifetime access, {LIFETIME.oneTime} <span aria-hidden>↗</span>
          </a>
          <Link
            href="/start"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
          >
            Find your level <span aria-hidden>→</span>
          </Link>
          <Link
            href="/tools"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
          >
            Try the free tools <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function JsonLd({ page, faqs }: { page: ComparisonPageInfo; faqs: readonly Faq[] }) {
  const { canonical, title, description, crumbs } = page;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      webPageNode({
        canonical,
        name: title,
        description,
        crumbs,
        datePublished: COMPARISONS_VERIFIED,
        dateModified: COMPARISONS_VERIFIED,
      }),
      {
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        url: canonical,
        name: title,
        inLanguage: "en-US",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        image: `${canonical}/opengraph-image`,
        dateModified: COMPARISONS_VERIFIED,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          "@id": `${canonical}#${faq.id}`,
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
      breadcrumbList(canonical, crumbs),
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdText(graph) }}
    />
  );
}

function registered(href: string): RelatedLink[] {
  return [...COMPARISONS, ...HUBS, ...LEARN, ...TOOLS].filter((candidate) => candidate.href === href);
}

function Shell({
  page,
  faqs,
  title,
  children,
}: {
  page: ComparisonPageInfo;
  faqs: readonly Faq[];
  title: ReactNode;
  children: ReactNode;
}) {
  const { competitor: rival, kind } = page;
  const paired = kind === "vs" ? alternativesHref(rival.slug) : vsHref(rival.slug);
  const related = [
    ...registered(paired),
    ...registered("/compare"),
    ...registered("/learn/guitar"),
    ...registered("/tools"),
  ];
  return (
    <>
      <JsonLd page={page} faqs={faqs} />
      <Article
        crumbs={page.crumbs}
        eyebrow="Compare"
        title={title}
        dek={page.entry.blurb}
        updated={COMPARISONS_VERIFIED}
        related={related}
        relatedTitle="Keep comparing"
        callToAction={<CallToAction />}
      >
        {children}
      </Article>
    </>
  );
}

export function VsPage({ href }: { href: string }) {
  const page = comparisonPage(href);
  const rival = page.competitor;
  return (
    <Shell
      page={page}
      faqs={rival.vsFaqs}
      title={
        <>
          GuitarHub vs{" "}
          <em className="font-display italic text-peach">{rival.name}.</em>
        </>
      }
    >
      <p>
        <strong>The short answer:</strong> {rival.vsAnswer}
      </p>
      <p>
        Every {rival.name} fact on this page was checked on {VERIFIED_LABEL}{" "}
        against the sources listed at the end.
      </p>

      <h2>How do GuitarHub and {rival.name} compare?</h2>
      <ComparisonTable rival={rival} />

      <h2>How much does {rival.name} cost compared with GuitarHub?</h2>
      <p>{rival.pricing}</p>
      <p>
        GuitarHub lifetime lesson access is <strong>{LIFETIME.oneTime}</strong>{" "}
        on the US App Store, bought once in {APP_STORE.name}; other
        storefronts charge their local price. The first module, the practice
        tools, the Advanced Lab and the written guides are free.
      </p>
      <TwoYearCost rival={rival} />

      <h2>How does {rival.name} teach guitar?</h2>
      <p>{rival.summary}</p>
      <p>{rival.teaching}</p>

      <h2>How does GuitarHub teach guitar?</h2>
      <GuitarHubTeaching />

      <h2>Why do guitarists choose GuitarHub over {rival.name}?</h2>
      {rival.advantages.map((point) => (
        <section key={point.title}>
          <h3>{point.title}</h3>
          <p>{point.body}</p>
        </section>
      ))}

      <h2>How do you start with GuitarHub?</h2>
      <StartSteps rival={rival} />
      <p>
        Weighing other options as well? See every{" "}
        <Link href={alternativesHref(rival.slug)}>{rival.name} alternative</Link>{" "}
        or the full <Link href="/compare">GuitarHub comparison hub</Link>.
      </p>

      <h2>GuitarHub vs {rival.name}: frequently asked questions</h2>
      <FaqList faqs={rival.vsFaqs} />

      <h2>Sources</h2>
      <p>
        Checked on {VERIFIED_LABEL}. Prices are US prices as of November 2026
        and vary by country, currency and promotion.
      </p>
      <SourceList sources={[...rival.sources, ...GUITARHUB_SOURCES]} />
    </Shell>
  );
}

export function AlternativesPage({ href }: { href: string }) {
  const page = comparisonPage(href);
  const rival = page.competitor;
  const others = COMPETITORS.filter((entry) => entry.slug !== rival.slug);
  return (
    <Shell
      page={page}
      faqs={rival.alternativesFaqs}
      title={
        <>
          The best {rival.name}{" "}
          <em className="font-display italic text-peach">alternatives.</em>
        </>
      }
    >
      <p>
        <strong>The short answer:</strong> {rival.alternativesAnswer}
      </p>
      <p>
        {rival.summary} {rival.pricing}
      </p>

      <h2>What is the best alternative to {rival.name}?</h2>
      <p>
        GuitarHub, the guitar lessons site from Suede AI. Here is what it puts
        in your hands:
      </p>
      <ul>
        <li>
          <strong>Price:</strong> {GUITARHUB_CELLS.price}.
        </li>
        <li>
          <strong>Free to start:</strong> {GUITARHUB_CELLS.free}.
        </li>
        <li>
          <strong>Lessons:</strong> {GUITARHUB_CELLS.format}.
        </li>
        <li>
          <strong>Feedback:</strong> {GUITARHUB_CELLS.feedback}.
        </li>
        <li>
          <strong>Method:</strong> {GUITARHUB_CELLS.structure}.
        </li>
      </ul>
      <GuitarHubTeaching />

      <h2>Which {rival.name} alternatives are worth comparing?</h2>
      <p>
        GuitarHub leads the list below. Each row links to a full side-by-side
        comparison with GuitarHub, checked on {VERIFIED_LABEL}.
      </p>
      <AlternativesTable rival={rival} />

      <h2>Why switch from {rival.name} to GuitarHub?</h2>
      {rival.advantages.map((point) => (
        <section key={point.title}>
          <h3>{point.title}</h3>
          <p>{point.body}</p>
        </section>
      ))}
      <p>
        The row-by-row breakdown is on{" "}
        <Link href={vsHref(rival.slug)}>GuitarHub vs {rival.name}</Link>.
      </p>

      <h2>How do you switch from {rival.name} to GuitarHub?</h2>
      <StartSteps rival={rival} />

      <h2>{rival.name} alternatives: frequently asked questions</h2>
      <FaqList faqs={rival.alternativesFaqs} />

      <h2>Sources</h2>
      <p>
        Checked on {VERIFIED_LABEL}. Prices are US prices as of November 2026
        and vary by country, currency and promotion.
      </p>
      <SourceList
        sources={[
          ...rival.sources,
          ...others.flatMap((entry) => entry.sources),
          ...GUITARHUB_SOURCES,
        ]}
      />
    </Shell>
  );
}
