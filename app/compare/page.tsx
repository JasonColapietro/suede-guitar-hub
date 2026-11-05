import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import {
  COMPETITORS,
  GUITARHUB,
  GUITARHUB_MODEL,
  VERIFIED_LABEL,
  alternativesHref,
  vsHref,
  type Faq,
} from "@/lib/comparisons";
import { jsonLdText } from "@/lib/course-schema";
import { keywordsFor } from "@/lib/keywords";
import { webPageNode } from "@/lib/page-schema";
import {
  APP_STORE,
  COMPARISONS,
  COMPARISONS_VERIFIED,
  LIFETIME,
  SITE_URL,
} from "@/lib/site";

const CANONICAL = `${SITE_URL}/compare`;

/** Read by both the visible trail and the BreadcrumbList JSON-LD below. */
const CRUMBS = crumbTrail("Compare", CANONICAL);

const TITLE = "GuitarHub vs Other Guitar Lesson Apps (2026)";
const DESCRIPTION = `GuitarHub compared with Fender Play, Yousician, JustinGuitar, Guitar Tricks and Ultimate Guitar: ${LIFETIME.display} lifetime lessons, free tools. Checked November 2026.`;

export const metadata: Metadata = {
  keywords: keywordsFor("/compare"),
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

/**
 * The single source for the visible Q&A and the FAQPage nodes. Plain strings
 * only, so the markup and the page cannot drift apart.
 */
const FAQS: readonly Faq[] = [
  {
    id: "best-guitar-lesson-app",
    q: "What is the best guitar lesson app to buy once?",
    a: `GuitarHub. Lifetime lesson access is ${LIFETIME.oneTime} on the US App Store in ${APP_STORE.name}, and it opens ${GUITARHUB.lessons} guided guitar lessons with no renewals. The first module is free in the app.`,
  },
  {
    id: "what-is-free-on-guitarhub",
    q: "What can I use on GuitarHub for free?",
    a: `The ${GUITARHUB.tools} browser practice tools, the ${GUITARHUB.drills}-drill Advanced Lab, the A-to-D chord routine and ${GUITARHUB.guides} written guides are free on guitarhub.org with no account, and the first lesson module is free in the iPhone app.`,
  },
  {
    id: "how-were-comparisons-checked",
    q: "How were these comparisons checked?",
    a: `Every competitor price, feature and platform was checked on ${VERIFIED_LABEL} against the competitor's App Store and Google Play listings and its own website or help center. Each comparison page lists its sources, and prices are quoted as of November 2026 in US dollars.`,
  },
  {
    id: "does-guitarhub-score-playing",
    q: "Does GuitarHub listen to my playing?",
    a: `Yes. Microphone exercises in the lessons score single-note pitch and attack timing, and all ${GUITARHUB.drills} Advanced Lab drills are scored live through the microphone. The audio is analyzed on your device and never uploaded.`,
  },
];

/**
 * The comparisons as an ItemList, each item pointing at the page's own
 * WebPage node, so the hub lists exactly the routes the registry publishes.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      ...webPageNode({
        canonical: CANONICAL,
        name: TITLE,
        description: DESCRIPTION,
        type: "CollectionPage",
        crumbs: CRUMBS,
        datePublished: COMPARISONS_VERIFIED,
        dateModified: COMPARISONS_VERIFIED,
      }),
      mainEntity: {
        "@type": "ItemList",
        "@id": `${CANONICAL}#comparisons`,
        itemListElement: COMPARISONS.map((entry, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: entry.title,
          url: `${SITE_URL}${entry.href}`,
        })),
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${CANONICAL}#faq`,
      url: CANONICAL,
      name: TITLE,
      inLanguage: "en-US",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      image: `${CANONICAL}/opengraph-image`,
      dateModified: COMPARISONS_VERIFIED,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        "@id": `${CANONICAL}#${faq.id}`,
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

const TABLE_WRAP = "mt-8 overflow-x-auto rounded-3xl bg-white ring-1 ring-ink/5";
const TH_COL = "bg-cream-soft px-4 py-3 align-bottom font-semibold text-indigo-deep";
const TH_ROW = "px-4 py-3 align-top font-semibold text-indigo-deep";
const TD = "px-4 py-3 align-top leading-relaxed text-ink/75";

const RELATED = COMPARISONS.filter((entry) => entry.href.includes("guitarhub-vs-"));

export default function ComparePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(JSON_LD) }}
      />

      <Article
        crumbs={CRUMBS}
        eyebrow="Compare"
        title={
          <>
            GuitarHub and the other{" "}
            <em className="font-display italic text-peach">guitar lesson apps.</em>
          </>
        }
        dek="Price, lessons, feedback and practice tools side by side, with every competitor fact checked against its own store listing or site."
        updated={COMPARISONS_VERIFIED}
        related={RELATED}
        relatedTitle="Head-to-head comparisons"
      >
        <p>
          <strong>The short answer:</strong> GuitarHub is the guitar course you
          buy once. {GUITARHUB.lessons} guided lessons cost {LIFETIME.oneTime}{" "}
          for lifetime access, and the {GUITARHUB.tools} practice tools, the{" "}
          {GUITARHUB.drills}-drill Advanced Lab and the written guides are free
          in any browser. Fender Play, Yousician, the JustinGuitar app and
          Guitar Tricks sell recurring subscriptions, and Ultimate Guitar is a
          tab catalog with paid Pro features.
        </p>

        <h2>How does GuitarHub compare with other guitar lesson apps?</h2>
        <p>Prices are US prices as of November 2026, checked on {VERIFIED_LABEL}.</p>
        <div className={TABLE_WRAP}>
          <table className="w-full min-w-[34rem] border-collapse text-left text-base">
            <caption className="sr-only">
              GuitarHub and five guitar learning services compared
            </caption>
            <thead>
              <tr>
                <th scope="col" className={TH_COL}>Service</th>
                <th scope="col" className={TH_COL}>Price and format</th>
                <th scope="col" className={TH_COL}>Compare</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-ink/5">
                <th scope="row" className={TH_ROW}>GuitarHub</th>
                <td className={TD}>{GUITARHUB_MODEL}</td>
                <td className={TD}>
                  <Link href="/learn/guitar" prefetch={false}>See the curriculum</Link>
                </td>
              </tr>
              {COMPETITORS.map((rival) => (
                <tr key={rival.slug} className="border-t border-ink/5">
                  <th scope="row" className={TH_ROW}>{rival.name}</th>
                  <td className={TD}>{rival.model}</td>
                  <td className={TD}>
                    <Link href={vsHref(rival.slug)} prefetch={false}>
                      GuitarHub vs {rival.name}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Which comparison should you read?</h2>
        {COMPETITORS.map((rival) => (
          <section key={rival.slug}>
            <h3>{rival.name}</h3>
            <p>{rival.summary}</p>
            <ul>
              <li>
                <Link href={vsHref(rival.slug)}>GuitarHub vs {rival.name}</Link>
              </li>
              <li>
                <Link href={alternativesHref(rival.slug)}>
                  The best {rival.name} alternatives
                </Link>
              </li>
            </ul>
          </section>
        ))}

        <h2>What makes GuitarHub different?</h2>
        <p>
          GuitarHub is built to prove progress. The{" "}
          <Link href="/method">GuitarHub method</Link> starts each month with a
          baseline recording, narrows practice to the one thing breaking the
          result, and ends with the same take recorded again, so the change is
          something you hear. The <Link href="/tools">free tools</Link> run
          that loop in the browser, the{" "}
          <Link href="/learn/guitar">guitar curriculum</Link> keeps the lessons
          in order, and microphone scoring happens on your device with nothing
          uploaded.
        </p>

        <h2>Compare GuitarHub: frequently asked questions</h2>
        {FAQS.map((faq) => (
          <section key={faq.id} id={faq.id}>
            <h3>{faq.q}</h3>
            <p>{faq.a}</p>
          </section>
        ))}
      </Article>
    </>
  );
}
