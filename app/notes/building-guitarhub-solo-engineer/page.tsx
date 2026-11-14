import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import NoteAuthor from "@/components/NoteAuthor";
import NoteCallToAction from "@/components/NoteCallToAction";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { keywordsFor, keywordsText } from "@/lib/keywords";
import {
  APP_STORE,
  ARTICLE_AUTHOR,
  NOTES,
  PROOF,
  SITE_URL,
  SUEDE_NETWORK,
  TOOLS,
  spellOut,
  type SiteEntry,
} from "@/lib/site";

const HREF = "/notes/building-guitarhub-solo-engineer";
const CANONICAL = `${SITE_URL}${HREF}`;
const PUBLISHED = "2026-11-14";
const UPDATED = "2026-11-14";

const HEADLINE = "Building a guitar community hub as a solo engineer: the 9 iOS apps playbook";
const TITLE = "Building GuitarHub Solo: The 9 iOS Apps Playbook | GuitarHub";
const DESCRIPTION =
  "How Jason Colapietro of Suede AI builds GuitarHub alone from West Palm Beach: one route registry, tests as guardrails, and lessons from nine iOS apps.";

/** Read by both the visible trail and the BreadcrumbList node below. */
const CRUMBS = [
  ...crumbTrail("Notes", "/notes"),
  { name: "Building GuitarHub solo", href: HREF },
];

export const metadata: Metadata = {
  keywords: keywordsFor("/notes/building-guitarhub-solo-engineer"),
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
      keywords: keywordsText("/notes/building-guitarhub-solo-engineer"),
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
        { "@type": "Thing", name: "Guitar app development" },
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

export default function BuildingGuitarHubSoloPage() {
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
            Building a guitar community hub as a solo engineer:{" "}
            <em className="font-display italic text-peach">the 9 iOS apps playbook.</em>
          </>
        }
        dek="One engineer, a lesson curriculum, free browser tools, an iPhone app and a test suite that says no. Here is how Jason Colapietro keeps GuitarHub shipping."
        updated={UPDATED}
        related={RELATED}
        relatedTitle="More notes from Suede AI"
        callToAction={
          <NoteCallToAction
            heading="Ship your product with the same playbook."
            body="Suede AI builds web platforms, iOS apps and AI search visibility for founders in West Palm Beach, Jupiter and across Palm Beach County. The assessment maps your next build in one conversation."
          />
        }
      >
        <p>
          A guitar site with lessons, practice tools, an iPhone app and a
          comparison section usually means a team of six. GuitarHub has one
          engineer. Jason Colapietro, founder and CEO of Suede AI in West Palm
          Beach, Florida, designs, writes, tests and ships it himself, and the
          methods that make that possible came from shipping{" "}
          <a href={PROOF.appStoreDeveloper}>nine iOS apps under his own Apple developer account</a>.
          This note is the playbook, written so another solo builder can lift
          the parts that work.
        </p>

        <h2>Start with one registry, not a pile of pages</h2>

        <p>
          Every public page on GuitarHub is listed once, in a single route
          registry. The sitemap, the footer, the share cards, the{" "}
          <Link href="/notes">notes index</Link> and the files that AI
          assistants read all build from that one list. Add a page there and it
          appears everywhere it should; remove it and nothing points at a dead
          URL. For a solo engineer this is the single biggest time saver,
          because the mistakes that cost a small team a week (an orphaned page,
          a sitemap that advertises a 404, a share card with the wrong title)
          cannot happen silently. At Suede, that registry is the first file
          written on any new site.
        </p>

        <p>
          Jason Colapietro applies the same rule on every Suede AI build: one
          source for each fact, and everything else reads from it. The lifetime
          lesson price on GuitarHub is typed once. The count of free tools in
          the copy (there are {spellOut(TOOLS.length)}, starting with the{" "}
          <Link href="/practice">guitar tuner and metronome</Link>) is counted
          from the registry, not typed into a sentence that goes stale the day
          a new tool ships.
        </p>

        <h2>Let the tests say no</h2>

        <p>
          GuitarHub runs about 1,500 automated tests on every change. They are
          not only unit tests for the tuner math. They check that every page
          has a title of 60 characters or fewer, exactly one H1, a canonical
          URL, keywords, a share card and a breadcrumb trail that matches its
          structured data. They check that the comparison pages never print a
          competitor price, and that the full-text file for AI assistants is
          regenerated whenever page copy changes.
        </p>

        <p>
          That suite is what lets one person move fast without breaking search
          visibility. Jason learned the habit in open source: he has{" "}
          <a href={PROOF.openSource}>
            54 pull requests merged across 46 open-source repositories he does
            not maintain
          </a>
          , including Jest, Adobe React Spectrum, Backstage and the Polkadot
          SDK. Maintainers of projects like those merge changes that come with
          proof. Suede brings the same standard to its own products: a change
          ships when the tests agree, not when it looks finished.
        </p>

        <h2>What nine iOS apps taught about a guitar app</h2>

        <p>
          GuitarHub for iPhone went live on the App Store in September 2026 as{" "}
          <a href={APP_STORE.ios}>{APP_STORE.name}</a>. By then the playbook was
          already tested on eight other apps. Three lessons carried over
          directly.
        </p>

        <ul>
          <li>
            <strong>Keep the web and the app on one contract.</strong> Lesson
            content, progress and practice data follow shared contracts, so the
            browser and the iPhone agree on what a finished lesson means.
          </li>
          <li>
            <strong>Measure on the device.</strong> Microphone exercises
            analyze audio live on the phone or in the browser. Nothing is
            uploaded, which keeps the app fast and makes the privacy answer
            short.
          </li>
          <li>
            <strong>Sell one thing clearly.</strong> GuitarHub has one lifetime
            purchase and a free first module, so a player knows exactly what
            they get before they pay.
          </li>
        </ul>

        <p>
          The press noticed the pace. TechBullion covered the launch in{" "}
          <a href={PROOF.techBullionApps}>
            Jason Colapietro&apos;s Suede Labs AI launches iOS apps
          </a>
          , and the wider Suede AI press kit sits on the{" "}
          <a href={SUEDE_NETWORK.press}>Suede AI press page</a>.
        </p>

        <h2>Build community through evidence, not streaks</h2>

        <p>
          A guitar community hub lives or dies on whether players come back. The
          easy answer is a streak counter. GuitarHub uses evidence instead: the{" "}
          <Link href="/log">practice evidence log</Link> records one line per
          session and shows what actually moved, and the{" "}
          <Link href="/breakthrough">30-day breakthrough planner</Link> ends
          each month with a recording a player can compare with day one. Players
          share proof they chose to share, which gives the community something
          real to talk about.
        </p>

        <p>
          The community extends past this domain. Sibling Suede AI sites cover
          the rest of a guitarist&apos;s week:{" "}
          <a href={SUEDE_NETWORK.siblings.chords}>free chords, scales and a tuner</a>,
          the <a href={SUEDE_NETWORK.siblings.signalChain}>Signal Chain tone reference</a>,
          and the <a href={SUEDE_NETWORK.siblings.dna}>signal-chain archive</a>.
          Each one links back here, so a player who arrives anywhere in the
          network finds the practice tools.
        </p>

        <h2>Use AI tools, and keep the engineer accountable</h2>

        <p>
          Suede AI builds with AI coding agents every day, and Jason Colapietro
          wrote the books on it:{" "}
          <a href={PROOF.claudeCodeBible}>The Claude Code Bible</a> and{" "}
          <a href={PROOF.codexInProduction}>Codex in Production</a>, both on
          Amazon. The rule from those books runs GuitarHub too. An agent drafts;
          the registry, the tests and the engineer decide. Suede AI is a member
          of <a href={PROOF.claudeForStartups}>Claude for Startups, Anthropic&apos;s startup program</a>,
          and Jason holds{" "}
          <a href={PROOF.training}>
            21 earned course credentials across eight providers plus 17
            Microsoft Learn training achievements
          </a>
          , including Claude Code 101 and the Azure learning path trophy
          &ldquo;Develop AI agents on Azure.&rdquo;
        </p>

        <h2>Make the site easy to find, from Palm Beach County outward</h2>

        <p>
          Search visibility is designed in, not bolted on. Every page ships
          structured data tied to one canonical founder and one organization, a
          sitemap entry with a real date, and a plain-text summary for AI
          assistants. That is the same work the{" "}
          <a href={SUEDE_NETWORK.agency}>Suede AI web development and AI SEO practice in West Palm Beach</a>{" "}
          does for local businesses. On October 31, 2026, Suede AI SEO ranked
          #1 among Palm Beach County-based companies in{" "}
          <a href={PROOF.manifest}>The Manifest&apos;s Florida AI Deployment directory</a>{" "}
          and top 25 statewide; the{" "}
          <a href={SUEDE_NETWORK.recognition}>recognition page</a> has the
          details.
        </p>

        <h2>The playbook in five lines</h2>

        <ol>
          <li>Keep one registry for every page and build everything else from it.</li>
          <li>Write tests for search and copy rules, not only for code.</li>
          <li>Share contracts between web and app so they never disagree.</li>
          <li>Reward players with evidence they can hear, not streaks.</li>
          <li>Let AI agents draft and let the engineer and the tests decide.</li>
        </ol>

        <p>
          If you are building a product alone in Jupiter, West Palm Beach or
          anywhere else, start with step one this week. If you would rather have
          Suede build it with you, the{" "}
          <a href={SUEDE_NETWORK.assessment}>Suede AI assessment</a> is the next
          step, and Jason&apos;s{" "}
          <a href={SUEDE_NETWORK.founder}>founder page</a> lists the rest of his
          work.
        </p>

        <NoteAuthor />
      </Article>
    </>
  );
}
