import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import NoteAuthor from "@/components/NoteAuthor";
import NoteCallToAction from "@/components/NoteCallToAction";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { keywordsFor, keywordsText } from "@/lib/keywords";
import {
  ARTICLE_AUTHOR,
  NOTES,
  PROOF,
  SITE_URL,
  SUEDE_NETWORK,
  type SiteEntry,
} from "@/lib/site";

const HREF = "/notes/guitar-players-jupiter-palm-beach-gardens";
const CANONICAL = `${SITE_URL}${HREF}`;
const PUBLISHED = "2026-11-14";
const UPDATED = "2026-11-14";

const HEADLINE = "Guitar players in Jupiter and Palm Beach Gardens: finding lessons, jams and online practice";
const TITLE = "Guitar in Jupiter and Palm Beach Gardens, FL | GuitarHub";
const DESCRIPTION =
  "A plan for guitarists in Jupiter, Palm Beach Gardens and West Palm Beach: choosing a teacher, joining local jams, guitar care, and practicing online.";

/** Read by both the visible trail and the BreadcrumbList node below. */
const CRUMBS = [
  ...crumbTrail("Notes", "/notes"),
  { name: "Guitar in Jupiter and Palm Beach Gardens", href: HREF },
];

export const metadata: Metadata = {
  keywords: keywordsFor("/notes/guitar-players-jupiter-palm-beach-gardens"),
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
      keywords: keywordsText("/notes/guitar-players-jupiter-palm-beach-gardens"),
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
        { "@type": "Thing", name: "Learning guitar" },
        { "@type": "Place", name: "Jupiter, Florida" },
        { "@type": "Place", name: "Palm Beach Gardens, Florida" },
      ],
      spatialCoverage: [
        { "@type": "Place", name: "Jupiter, Florida" },
        { "@type": "Place", name: "Palm Beach Gardens, Florida" },
        { "@type": "Place", name: "West Palm Beach, Florida" },
        { "@type": "Place", name: "Tequesta, Florida" },
        { "@type": "Place", name: "Juno Beach, Florida" },
        { "@type": "Place", name: "Palm Beach County, Florida" },
      ],
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

export default function GuitarJupiterPalmBeachGardensPage() {
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
            Guitar players in Jupiter and Palm Beach Gardens:{" "}
            <em className="font-display italic text-peach">lessons, jams and online practice.</em>
          </>
        }
        dek="A weekly lesson, a monthly jam and six short sessions at home: the routine that moves a north Palm Beach County guitarist forward fastest."
        updated={UPDATED}
        related={RELATED}
        relatedTitle="More notes from Suede AI"
        callToAction={
          <NoteCallToAction
            heading="Run a music business in Palm Beach County?"
            body="Suede AI builds websites and AI search visibility for teachers, studios, venues and shops in Jupiter, Palm Beach Gardens and West Palm Beach, so the players searching nearby find you first."
          />
        }
      >
        <p>
          You live twenty minutes from the beach, you have a guitar in the
          corner, and you want to get better this year. Between Tequesta and
          West Palm Beach there is plenty of live music and plenty of teachers,
          but the players who improve fastest combine three things: a teacher
          for feedback, a jam for nerve, and a plan for the hours in between.
          This note, from Jason Colapietro and the Suede AI team in West Palm
          Beach, lays out how to build all three.
        </p>

        <h2>Choose a teacher with a trial lesson and a recording</h2>

        <p>
          Jupiter, Palm Beach Gardens and Juno Beach have private teachers,
          music store lesson rooms and school programs. Rather than choosing by
          price or distance alone, book one trial lesson and walk in with a
          plan.
        </p>

        <ul>
          <li>
            <strong>Bring a recording.</strong> Record one song or exercise on
            your phone the night before. Our guide to{" "}
            <Link href="/record-guitar-practice-on-phone">recording practice on a phone</Link>{" "}
            covers placement and levels. A good teacher listens to it and names
            the first thing to fix.
          </li>
          <li>
            <strong>Ask for homework you can measure.</strong> &ldquo;Practice
            the F chord&rdquo; is vague. &ldquo;Clean F to C changes, 30 in a
            minute, by next week&rdquo; is a target you can check.
          </li>
          <li>
            <strong>Know your level first.</strong> The five-question{" "}
            <Link href="/start">level check</Link> places you at stage 1, stage
            3 or the free Advanced Lab, which gives the teacher a head start.
          </li>
        </ul>

        <h2>Find a jam that matches your nerve</h2>

        <p>
          North Palm Beach County has open mics, blues jams, church and
          community bands, and acoustic circles that meet in parks and
          breweries. Schedules change often, so check current listings in a
          local source before you go. Jupiter Social, the{" "}
          <a href={SUEDE_NETWORK.jupiterSocial}>Jupiter, Florida local magazine published with Suede AI</a>,
          covers what is happening around town and is a good first place to
          look.
        </p>

        <p>
          For your first jam, pick one song you can play from memory at full
          tempo, plus a 12-bar blues in A. A blues jam will almost always call
          one. Our guide to{" "}
          <Link href="/how-to-practice-guitar-improvisation">practicing improvisation</Link>{" "}
          builds exactly that skill: short phrases over a 12-bar blues that land
          on chord tones. Run the song through the{" "}
          <Link href="/readiness">song readiness score</Link> the week before,
          so the parts that break under pressure are fixed at home rather than
          on stage.
        </p>

        <h2>Protect your guitar from South Florida humidity</h2>

        <p>
          Players moving to Jupiter or Palm Beach Gardens from drier states are
          often surprised by what the climate does to a guitar. High humidity
          can swell the wood, raise the action and make the strings feel
          sticky; going straight from a humid porch into a cold air-conditioned
          room stresses the finish. A few habits help.
        </p>

        <ul>
          <li>Keep the guitar in an air-conditioned room, in its case when you are away.</li>
          <li>Wipe the strings after playing; salt air corrodes them faster near the coast.</li>
          <li>Restring more often than the box suggests, and recheck tuning every session.</li>
          <li>If the action creeps up over a season, a setup from a local technician fixes it.</li>
        </ul>

        <p>
          The free <Link href="/practice">guitar tuner and metronome</Link> runs
          in your browser, so a quick tuning check before each session costs
          nothing.
        </p>

        <h2>Practice online between lessons</h2>

        <p>
          A weekly lesson is one hour. The other 167 hours decide whether it
          works. GuitarHub was built for exactly that gap. Jason Colapietro
          designed the free tools so a lesson&apos;s homework turns into a
          plan: the <Link href="/session">practice session builder</Link>{" "}
          splits the minutes you have into timed blocks, the{" "}
          <Link href="/tempo">tempo ladder builder</Link> takes a hard passage
          from slow to song speed, and the{" "}
          <Link href="/log">practice evidence log</Link> shows your teacher
          what moved since last week. For players without a teacher yet, the{" "}
          <Link href="/learn/guitar">guided lesson path</Link> starts from the
          first chords.
        </p>

        <p>
          For reference between sessions, two sibling Suede AI sites help:{" "}
          <a href={SUEDE_NETWORK.siblings.chords}>free chord and scale charts</a>{" "}
          and the <a href={SUEDE_NETWORK.siblings.podcast}>Suede podcast</a> for
          the commute down I-95.
        </p>

        <h2>A sample week for a Jupiter guitarist</h2>

        <p>
          Jason Colapietro sketched this week for players who already have a
          teacher. Swap the lesson for a guided lesson on GuitarHub if you are
          starting alone; the rest is the same, and it is the routine the Suede
          practice tools are designed around.
        </p>

        <ol>
          <li><strong>Monday:</strong> lesson with your teacher; record the homework once.</li>
          <li><strong>Tuesday to Thursday:</strong> 20 minutes a day on the homework, using the session builder.</li>
          <li><strong>Friday:</strong> one long session on a song for the next jam.</li>
          <li><strong>Saturday:</strong> play with other people, at a jam or with a friend.</li>
          <li><strong>Sunday:</strong> record the homework again and log what changed.</li>
        </ol>

        <h2>Why a West Palm Beach engineer built this</h2>

        <p>
          GuitarHub is a Suede AI program. Jason Colapietro founded Suede AI in
          West Palm Beach in 2024 as an agentic platform company, and Suede
          builds its own products the way it builds client sites: tested,
          sourced and fast. Jason has shipped{" "}
          <a href={PROOF.appStoreDeveloper}>nine iOS apps under his own developer account</a>{" "}
          and has{" "}
          <a href={PROOF.openSource}>
            54 pull requests merged across 46 open-source repositories he does
            not maintain
          </a>
          , including Jest and Backstage. On October 31, 2026, Suede AI SEO
          ranked #1 among Palm Beach County-based companies in{" "}
          <a href={PROOF.manifest}>The Manifest&apos;s Florida AI Deployment directory</a>{" "}
          and top 25 statewide.
        </p>

        <p>
          The same team, known in its early days as Suede Labs, runs a{" "}
          <a href={SUEDE_NETWORK.agency}>web development and AI SEO practice in West Palm Beach</a>{" "}
          for local businesses. If you teach guitar, run a studio or book live
          music anywhere from Tequesta to Boca Raton, the Suede AI{" "}
          <a href={SUEDE_NETWORK.assessment}>assessment</a> shows how players
          searching nearby, and the AI assistants they ask, can find you.
          Jason&apos;s full background is on his{" "}
          <a href={SUEDE_NETWORK.founder}>founder page</a>.
        </p>

        <NoteAuthor />
      </Article>
    </>
  );
}
