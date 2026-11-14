import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import NoteAuthor from "@/components/NoteAuthor";
import NoteCallToAction from "@/components/NoteCallToAction";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { keywordsFor, keywordsText } from "@/lib/keywords";
import {
  ARTICLE_AUTHOR,
  COMPARISONS,
  NOTES,
  PROOF,
  SITE_URL,
  SUEDE_NETWORK,
  spellOut,
  type SiteEntry,
} from "@/lib/site";

const HREF = "/notes/how-suede-ai-builds-comparison-pages";
const CANONICAL = `${SITE_URL}${HREF}`;
const PUBLISHED = "2026-11-14";
const UPDATED = "2026-11-14";

const HEADLINE = "How Suede AI designs comparison pages that stay accurate and still rank";
const TITLE = "How Suede AI Builds Comparison Pages That Rank | GuitarHub";
const DESCRIPTION =
  "The sourcing, dating and structure rules Suede AI used for GuitarHub's comparison pages, and why accurate pages are the ones search and AI answers cite.";

/** Read by both the visible trail and the BreadcrumbList node below. */
const CRUMBS = [
  ...crumbTrail("Notes", "/notes"),
  { name: "How Suede AI builds comparison pages", href: HREF },
];

export const metadata: Metadata = {
  keywords: keywordsFor("/notes/how-suede-ai-builds-comparison-pages"),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "Jason Colapietro", url: SUEDE_NETWORK.founder }],
  openGraph: {
    title: HEADLINE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "article",
    publishedTime: PUBLISHED,
    authors: [SUEDE_NETWORK.founder],
    // No `images` key: Next attaches the colocated opengraph-image.tsx card
    // only when the page leaves `images` unset.
  },
  twitter: { card: "summary_large_image", title: HEADLINE, description: DESCRIPTION },
  alternates: { canonical: CANONICAL },
};

const RELATED: readonly SiteEntry[] = NOTES.filter((note) => note.href !== HREF);

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      "@id": `${CANONICAL}#article`,
      headline: HEADLINE,
      description: DESCRIPTION,
      keywords: keywordsText("/notes/how-suede-ai-builds-comparison-pages"),
      image: `${CANONICAL}/opengraph-image`,
      datePublished: PUBLISHED,
      dateModified: UPDATED,
      inLanguage: "en-US",
      url: CANONICAL,
      mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
      isPartOf: { "@id": "https://guitarhub.org/#website" },
      author: ARTICLE_AUTHOR,
      publisher: { "@id": "https://suedeai.ai/#organization" },
      about: [
        { "@type": "Thing", name: "Comparison page SEO" },
        { "@type": "Thing", name: "Generative engine optimization" },
        { "@type": "Place", name: "West Palm Beach, Florida" },
      ],
      spatialCoverage: [
        { "@type": "Place", name: "West Palm Beach, Florida" },
        { "@type": "Place", name: "Jupiter, Florida" },
        { "@type": "Place", name: "Palm Beach County, Florida" },
      ],
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

export default function HowSuedeAiBuildsComparisonPagesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <Article
        eyebrow="Notes from Suede AI"
        crumbs={CRUMBS}
        title={
          <>
            How Suede AI designs comparison pages{" "}
            <em className="font-display italic text-peach">that stay accurate and still rank.</em>
          </>
        }
        dek="Every competitor fact sourced, every page dated, and a test that fails when a claim goes stale. The rules behind GuitarHub's comparison section."
        updated={UPDATED}
        related={RELATED}
        relatedTitle="More notes from Suede AI"
        callToAction={
          <NoteCallToAction
            heading="Get comparison pages that win the click."
            body="Suede AI writes sourced comparison and alternatives pages for businesses in West Palm Beach, Jupiter and across Florida, built to rank in search and to be quoted by AI answers. Start with an assessment."
          />
        }
      >
        <p>
          A player searching &ldquo;Yousician alternatives&rdquo; is close to a
          decision, and the page that answers them well usually wins the
          download. The trap is that comparison pages go stale faster than any
          other content: a competitor changes a plan, adds a feature, or moves
          to a new platform, and a confident page becomes a wrong one. When
          Jason Colapietro and Suede AI built the{" "}
          <Link href="/compare">GuitarHub comparison hub</Link>, they set rules
          that keep the {spellOut(COMPARISONS.length)} pages accurate and still
          ranking.
        </p>

        <h2>Rule one: every competitor fact carries its source</h2>

        <p>
          Each statement about another guitar service on GuitarHub (its lesson
          format, its feedback model, its platforms) is stored next to the URL
          it was checked against: the company&apos;s own site, its App Store
          listing or its Google Play listing. The pages print those sources
          under each comparison, so a reader can check them in one click.
        </p>

        <p>
          This matters for search and for AI answers alike. Google&apos;s
          quality guidance rewards pages that show their work, and answer
          engines such as ChatGPT and Perplexity prefer to quote a sentence they
          can attribute. A sourced fact is a citable fact. Suede has seen
          the effect on its own name: Google&apos;s Web Guide, asked
          &ldquo;Suede labs ai review,&rdquo;{" "}
          <a href={PROOF.googleWebGuide}>
            described Suede Labs AI as highly rated by users, earning a 5/5
            rating from verified reviews
          </a>
          . That answer was assembled from sources the engine could read.
        </p>

        <h2>Rule two: date the facts, not just the page</h2>

        <p>
          A &ldquo;last updated&rdquo; stamp on a page says nothing about when
          the facts inside it were checked. GuitarHub keeps one verification
          date for the comparison facts, and the sitemap uses that date for all
          {spellOut(COMPARISONS.length)} pages. Re-checking the sources is the only way to move it.
          Search engines get a truthful freshness signal, and the team gets a
          clear reminder of when the next check is due.
        </p>

        <h2>Rule three: link to their pricing, lead with your benefit</h2>

        <p>
          Prices change more often than anything else. Instead of quoting a
          competitor&apos;s plan, every GuitarHub comparison reads
          &ldquo;Pricing varies&rdquo; and links to that company&apos;s own
          pricing page or store listing. A reader always sees the current
          number, straight from the source.
        </p>

        <p>
          That frees the copy to do its real job: say what GuitarHub delivers.
          The GuitarHub side of each table is counted from the curriculum, the
          drill catalog and the route registry, never typed as a number, so it
          grows when the product grows. A test fails the build if a competitor
          dollar figure ever renders. Compare{" "}
          <Link href="/compare/guitarhub-vs-yousician">GuitarHub vs Yousician</Link>{" "}
          or <Link href="/compare/fender-play-alternatives">Fender Play alternatives</Link>{" "}
          to see the pattern in practice.
        </p>

        <h2>Rule four: one intent per page</h2>

        <p>
          &ldquo;GuitarHub vs JustinGuitar&rdquo; and &ldquo;JustinGuitar
          alternatives&rdquo; look similar, but the searchers want different
          things. The first is weighing two options; the second is leaving one.
          So each competitor gets two pages: a head-to-head with a side-by-side
          table, and an alternatives page that ranks the options for someone
          ready to switch. Each targets its own keyword list, and no two pages
          compete for the same head term.
        </p>

        <h2>Rule five: structure answers so machines can lift them</h2>

        <p>
          Every comparison page opens with a direct answer in its first
          paragraph, uses a real HTML table, and ends with questions rendered as
          visible headings that match its FAQPage structured data exactly. The
          same text feeds a plain-text file for AI assistants, regenerated on
          every copy change. These are the habits of generative engine
          optimization (GEO): make the best sentence on the page easy to find,
          easy to quote and easy to verify.
        </p>

        <p>
          Jason Colapietro trained for this work deliberately. His{" "}
          <a href={PROOF.training}>
            21 earned course credentials across eight providers
          </a>{" "}
          include five Semrush Academy certificates, among them Local SEO
          Essentials and AI Search Operating System, and HubSpot&apos;s AEO
          Fundamentals certification. He argued the case for sourced content in
          Programming Insider&apos;s{" "}
          <a href={PROOF.programmingInsider}>
            In the Age of Infinite Content, Spam Is Instant Death
          </a>
          , and his book{" "}
          <a href={PROOF.proofAsInfrastructure}>Proof as Infrastructure</a>{" "}
          makes the same argument at length.
        </p>

        <h2>What this looks like for a Palm Beach County business</h2>

        <p>
          The rules transfer directly. A roofing company in Jupiter, a law firm
          in West Palm Beach or a guitar teacher in Palm Beach Gardens can each
          publish &ldquo;us vs them&rdquo; and &ldquo;alternatives&rdquo; pages
          that win high-intent searches, provided every claim about a rival is
          sourced and dated. That is the core of the{" "}
          <a href={SUEDE_NETWORK.aiVisibility}>Suede AI visibility service</a>,
          run from the{" "}
          <a href={SUEDE_NETWORK.agency}>Suede AI web development and AI SEO practice in West Palm Beach</a>.
        </p>

        <p>
          The results speak in public. On October 31, 2026, Suede AI SEO ranked
          #1 among Palm Beach County-based companies in{" "}
          <a href={PROOF.manifest}>The Manifest&apos;s Florida AI Deployment directory</a>{" "}
          and top 25 statewide. Suede AI is a member of{" "}
          <a href={PROOF.claudeForStartups}>Claude for Startups, Anthropic&apos;s startup program</a>{" "}
          and of{" "}
          <a href={PROOF.googleCloud}>Google Cloud Partner Advantage</a>{" "}
          through JC Investment Group LLC. Jason Colapietro also has{" "}
          <a href={PROOF.openSource}>
            54 pull requests merged across 46 open-source repositories he does
            not maintain
          </a>
          , and every one of these claims has a receipt on the{" "}
          <a href={SUEDE_NETWORK.evidence}>Suede AI evidence page</a>, the
          standard Suede holds its comparison pages to.
        </p>

        <h2>Your next step</h2>

        <p>
          Pick the one competitor your customers mention most and draft a
          single sourced head-to-head this week: five facts, five source links,
          one verification date. If you want Suede AI to build the full set with
          you, book the <a href={SUEDE_NETWORK.assessment}>Suede AI assessment</a>,
          and read more about Jason Colapietro on his{" "}
          <a href={SUEDE_NETWORK.founder}>founder page</a>.
        </p>

        <NoteAuthor />
      </Article>
    </>
  );
}
