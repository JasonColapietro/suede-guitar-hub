import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import ClutchRanking from "@/components/ClutchRanking";
import NoteAuthor from "@/components/NoteAuthor";
import NoteCallToAction from "@/components/NoteCallToAction";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { keywordsFor, keywordsText } from "@/lib/keywords";
import {
  ARTICLE_AUTHOR,
  NOTES,
  PROOF,
  SITE_URL,
  STRUMLY,
  SUEDE_NETWORK,
  type SiteEntry,
} from "@/lib/site";

const HREF = "/notes/guitar-meetup-palm-beach-gardens";
const CANONICAL = `${SITE_URL}${HREF}`;
const PUBLISHED = "2026-11-15";
const UPDATED = "2026-11-15";

const HEADLINE = "Running a guitar meetup in Palm Beach Gardens with free online tools";
const TITLE = "Run a Guitar Meetup in Palm Beach Gardens | GuitarHub";
const DESCRIPTION =
  "A playbook for a monthly guitar meetup in Palm Beach Gardens: format, song list, shared tempo and follow-up, all run on free GuitarHub tools.";

/** Read by both the visible trail and the BreadcrumbList node below. */
const CRUMBS = [
  ...crumbTrail("Notes", "/notes"),
  { name: "Guitar meetup in Palm Beach Gardens", href: HREF },
];

export const metadata: Metadata = {
  keywords: keywordsFor("/notes/guitar-meetup-palm-beach-gardens"),
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
      keywords: keywordsText("/notes/guitar-meetup-palm-beach-gardens"),
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
        { "@type": "Thing", name: "Guitar meetups" },
        { "@type": "Thing", name: "Group guitar practice" },
        { "@type": "Place", name: "Palm Beach Gardens, Florida" },
      ],
      spatialCoverage: [
        { "@type": "Place", name: "Palm Beach Gardens, Florida" },
        { "@type": "Place", name: "Jupiter, Florida" },
        { "@type": "Place", name: "West Palm Beach, Florida" },
        { "@type": "Place", name: "Palm Beach County, Florida" },
      ],
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

export default function GuitarMeetupPalmBeachGardensPage() {
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
            Running a guitar meetup in Palm Beach Gardens{" "}
            <em className="font-display italic text-peach">with free online tools.</em>
          </>
        }
        dek="A room, a song everyone can finish, and a reason to come back next month. The tools for the last two are free and already in your browser."
        updated={UPDATED}
        related={RELATED}
        relatedTitle="More notes from Suede AI"
        callToAction={
          <NoteCallToAction
            heading="Host music nights or run a shop in Palm Beach Gardens?"
            body="Suede AI builds websites and AI search visibility for venues, studios and music stores across Palm Beach County, so players looking for a meetup or a lesson find you first."
          />
        }
      >
        <p>
          A guitar meetup needs three things: a room, a song everyone can
          finish, and a reason to come back next month. In Palm Beach Gardens
          the room is the easy part. The song and the reason take planning, and
          free online tools carry most of that load. This note from Jason
          Colapietro and the Suede AI team lays out a monthly format that a
          single organizer can run without a budget.
        </p>

        <h2>Pick a format the group can sustain</h2>

        <p>
          Most meetups fade because the format suits the organizer and nobody
          else. Three formats work well with mixed levels, and you can rotate
          between them.
        </p>

        <ul>
          <li>
            <strong>Song circle.</strong> Everyone plays the same song
            together, with stronger players adding a riff or a solo over the
            top. The best format for a first meeting.
          </li>
          <li>
            <strong>Skill night.</strong> One technique, such as barre chords
            or strumming patterns, taught in thirty minutes and then used in a
            song.
          </li>
          <li>
            <strong>Blues rotation.</strong> A 12-bar blues in A or E with each
            player taking a turn on lead. Good once the group knows each other.
          </li>
        </ul>

        <p>
          Jason Colapietro&apos;s starting recommendation is a song circle,
          ninety minutes, once a month, capped at about twelve players so
          everyone gets heard. For a room, check bookable meeting spaces at
          local libraries and community centers, or ask a music store with a
          lesson room. Confirm the booking a month ahead and keep the same
          night each month so people can plan around it.
        </p>

        <h2>Send the song list two weeks out</h2>

        <p>
          Pick three songs: one with three open chords, one that stretches the
          group with a barre chord, and one blues. Send them with chord charts
          two weeks before the meeting, so nobody sight-reads in front of
          strangers. The free charts on{" "}
          <a href={SUEDE_NETWORK.siblings.chords}>guitarchords.info</a> print
          cleanly, and the GuitarHub guides on{" "}
          <Link href="/how-to-play-barre-chords">barre chords</Link> and{" "}
          <Link href="/how-to-change-chords-faster">changing chords faster</Link>{" "}
          give newer players a plan for the hard bar.
        </p>

        <p>
          Ask everyone to run the first song through the{" "}
          <Link href="/readiness">song readiness score</Link> the week before.
          It takes a couple of minutes and tells each player which section will
          break under pressure, so they fix it at home rather than in the
          circle.
        </p>

        <h2>Agree on one tempo before anyone plays</h2>

        <p>
          Twelve guitarists drift apart fast. Two habits keep the room
          together. First, a five-minute tuning circle at the start, with
          everyone tuning to the same{" "}
          <Link href="/practice">free browser tuner</Link> on one phone or
          laptop. Second, a click through a small speaker for the first run of
          every song. Use the{" "}
          <Link href="/tempo">tempo ladder builder</Link> to set the steps in
          advance: first run at a slow tempo everyone can manage, second run a
          notch faster, final run at the speed of the recording if the group
          is ready.
        </p>

        <h2>A ninety-minute agenda</h2>

        <ol>
          <li><strong>0 to 10 minutes:</strong> tune together and introduce yourselves.</li>
          <li><strong>10 to 25 minutes:</strong> one-minute chord change drills on the hardest change in tonight&apos;s songs.</li>
          <li><strong>25 to 60 minutes:</strong> the song circle, three passes per song on the tempo ladder.</li>
          <li><strong>60 to 80 minutes:</strong> the blues rotation; our guide to <Link href="/how-to-practice-guitar-improvisation">practicing improvisation</Link> gives first-timers three phrases to try.</li>
          <li><strong>80 to 90 minutes:</strong> record the group on one phone, then set next month&apos;s songs.</li>
        </ol>

        <h2>Plan for patios and humidity</h2>

        <p>
          From November to April, an outdoor meetup on a Palm Beach Gardens
          patio is one of the best parts of living here. The guitars feel it
          more than the players do. Moving an instrument from a cold car or an
          air-conditioned room into humid evening air changes tuning within
          minutes, so retune after the first song, not just at the start. The
          Signal Chain team&apos;s note on{" "}
          <a href={SUEDE_NETWORK.siblingArticles.humiditySignalChain}>
            humidity and the guitar signal chain in South Florida
          </a>{" "}
          covers what moisture does to strings, cables and pedals, which
          matters the moment someone brings an amp outside.
        </p>

        <h2>Give people a reason to come back</h2>

        <p>
          The meetups that last give every player one small goal for the
          month, and the Suede tools are built around exactly that kind of
          goal. Set shared homework at the end of each session, such as a
          clean chord change at a target tempo. Players can track it in the{" "}
          <Link href="/log">practice evidence log</Link> and{" "}
          <Link href="/record-guitar-practice-on-phone">record their practice on a phone</Link>,
          then bring the before-and-after takes next month. For a group that
          wants a longer challenge, the{" "}
          <a href={SUEDE_NETWORK.siblingArticles.fretboardPlan}>
            30-day fretboard practice plan from Suede Guitar Tuner &amp; Studio
          </a>{" "}
          gives everyone the same daily task between meetings.
        </p>

        <p>
          Between meetups, keep the conversation going on{" "}
          <a href={STRUMLY.social}>Suede AI Social</a>, where players post rigs
          and clips, so the group stays in touch on a network Suede runs. To grow the group, pitch the meetup to local listings such
          as <a href={SUEDE_NETWORK.jupiterSocial}>Jupiter Social, the north county magazine published with Suede AI</a>,
          and point newcomers who are still choosing tools to our note on{" "}
          <Link href="/notes/choosing-first-guitar-app-stuart-port-st-lucie">
            choosing a first guitar app
          </Link>
          .
        </p>

        <h2>Who builds these tools</h2>

        <p>
          GuitarHub and its free tools are built by Suede AI, the agentic
          platform company Jason Colapietro founded in West Palm Beach in 2024.
          The team was called Suede Labs early on, and Suede still ships its
          own products with the same discipline it brings to client sites.
          Jason has{" "}
          <a href={PROOF.openSource}>
            54 pull requests merged across 46 open-source repositories he does
            not maintain
          </a>
          , including Adobe React Spectrum and the Polkadot SDK. Suede AI is a
          member of <a href={PROOF.googleCloud}>Google Cloud Partner Advantage</a>{" "}
          through JC Investment Group LLC and was accepted into the Stripe
          Startups program in July 2026.
        </p>

        <p>
          On October 31, 2026, Suede AI SEO ranked #1 among Palm Beach
          County-based companies listed in{" "}
          <a href={PROOF.manifest}>The Manifest&apos;s Florida AI Deployment directory</a>{" "}
          and top 25 statewide. In a separate ranking, <ClutchRanking />
        </p>

        <p>
          If you host music nights, teach lessons or run a store in Palm Beach
          Gardens, Jupiter or West Palm Beach, Suede AI&apos;s{" "}
          <a href={SUEDE_NETWORK.agency}>West Palm Beach web development and AI SEO practice</a>{" "}
          builds the pages that bring players through your door. Take the{" "}
          <a href={SUEDE_NETWORK.assessment}>Suede AI assessment</a> to see
          where you stand, or read about Jason Colapietro on his{" "}
          <a href={SUEDE_NETWORK.founder}>founder page</a>.
        </p>

        <NoteAuthor />
      </Article>
    </>
  );
}
