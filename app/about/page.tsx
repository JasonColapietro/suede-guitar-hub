import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { APP_STORE, GUIDES, LEARN, SITE_URL, STRUMLY, TOOLS, spellOut } from "@/lib/site";
import { DRILLS } from "@/lib/advanced/drills";
import { allLessons, curricula } from "@/lib/learning/curriculum";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import { keywordsFor } from "@/lib/keywords";

const CANONICAL = `${SITE_URL}/about`;
const PUBLISHED = "2026-09-04";
const UPDATED = "2026-10-10";

/**
 * Counted from the curriculum, never typed: the stage lessons and the
 * popular-song companions are reported separately because they are different
 * kinds of lesson.
 */
const GUITAR_LESSONS = allLessons("guitar");
const STAGE_LESSONS = GUITAR_LESSONS.filter((entry) => entry.level.stage).length;
const SONG_COMPANIONS = GUITAR_LESSONS.length - STAGE_LESSONS;
const STAGES = curricula.guitar.levels.filter((level) => level.stage).length;

/** Read by both the visible trail and the BreadcrumbList JSON-LD below. */
const CRUMBS = crumbTrail("About", CANONICAL);

const TITLE = "About GuitarHub: The Suede AI Guitar Lessons Site";
// Kept near 155 characters so Google prints the differentiating tail. No count
// of the tools or modules appears here: this string is also the openGraph
// description and the AboutPage JSON-LD description, so a hard-typed number
// becomes three contradictions of the registries at once.
const DESCRIPTION =
  "GuitarHub is the Suede AI guitar lessons site: a step-by-step curriculum, a practice method and free browser tools. Who built it and how it fits with Strumly.";

export const metadata: Metadata = {
  keywords: keywordsFor("/about"),
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
 * Pulled from the route registries by href so titles and blurbs stay in one
 * place. Listed explicitly rather than filtered: this is a reading order for
 * someone who has just finished the page. The lessons first, then the method
 * that keeps them honest, then the planner that runs it.
 */
const RELATED = [
  ...LEARN.filter((entry) => entry.href === "/learn/guitar"),
  ...GUIDES.filter((entry) => entry.href === "/method"),
  ...TOOLS.filter((entry) => entry.href === "/breakthrough"),
  ...GUIDES.filter(
    (entry) => entry.href === "/how-to-practice-guitar-effectively",
  ),
];

// The canonical estate @ids, copied from app/layout.tsx. Referenced rather
// than redefined: the Organization, Person, and WebSite nodes are declared
// once in the root layout, which renders on this page too, so Google resolves
// these within the page.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const WEBSITE_ID = `${SITE_URL}/#website`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${CANONICAL}#aboutpage`,
      url: CANONICAL,
      name: TITLE,
      description: DESCRIPTION,
      image: `${CANONICAL}/opengraph-image`,
      inLanguage: "en-US",
      isPartOf: { "@id": WEBSITE_ID },
      about: [{ "@id": SUEDE_ORG_ID }, { "@id": JASON_PERSON_ID }],
      mainEntity: { "@id": SUEDE_ORG_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
      datePublished: PUBLISHED,
      dateModified: UPDATED,
      breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <Article
        crumbs={CRUMBS}
        eyebrow="About"
        title={
          <>
            About <em className="font-display italic text-peach">GuitarHub.</em>
          </>
        }
        dek="The guitar lessons site from Suede AI: meet the founder, explore the lessons and practice method, and learn how your practice data stays private."
        updated={UPDATED}
        related={RELATED}
        relatedTitle="Start with one of these"
      >
        <p>
          GuitarHub is where Suede AI teaches guitar. The{" "}
          <Link href="/learn/guitar">guitar path</Link> starts at the first
          foundations, how to hold the instrument, tune it, and get one clean
          note, and works up through chords, reading, rhythm and the whole
          neck. The guided lessons open with lifetime access, a one-time
          purchase in <a href={APP_STORE.ios}>{APP_STORE.name}</a> for iPhone,
          and your place on the web is kept in this browser. The voice lessons
          moved to <a href={SING_VOICE_COURSE}>Suede Sing</a>, where all of
          them are free. Pricing, access and data questions are answered in{" "}
          <Link href="/faq">the GuitarHub FAQ</Link>.
        </p>

        <p>
          Lessons on their own tell you what to do next. They do not tell you
          whether the last one worked, so the site pairs the curriculum with a
          practice method and a set of tools built to answer that question.
          Choose one change you can prove in thirty days. Record where you are
          before you start fixing it. Find the single thing that breaks the
          result and repair that one thing. Put the repair back under real
          pressure. Then record the same performance again, put the two takes
          side by side, and let them settle whether anything moved. The full
          argument, with the exit test for each stage, is on{" "}
          <Link href="/method">the method page</Link>.
        </p>

        <h2>Who built this</h2>

        <p>
          GuitarHub is made by{" "}
          <a href={STRUMLY.suedeLabs}>Suede AI</a>, a studio founded by Jason
          Colapietro. Suede AI also builds{" "}
          <a href={STRUMLY.guides}>Strumly</a>, the AI guitar coach with its
          practice tools, its book and guides, and a music data API that AI
          agents pay for per call, and{" "}
          <a href={STRUMLY.social}>Suede AI Social</a>, where the guitar
          conversation happens. GuitarHub is the lessons site. It owns the
          curriculum, the practice method, and the job the other two leave
          open: deciding what to practice next, and proving it worked.
        </p>

        <p>
          The position behind the site is his. A player with
          a shelf of finished courses and no finished songs has not failed at
          practice. They were handed material and no way to check their own
          work, which is a different problem with a different fix. The fix is
          unglamorous: fewer goals, a recording at each end of the month, and a
          straight comparison of the two.
        </p>

        <p>
          The lesson paths and the practice tools serve different needs. A new
          player can follow the opening instruction and let the site keep the
          order. A returning player can skip the lessons and use the planner or
          the practice log alongside material they already follow.
        </p>

        <h2>What GuitarHub is</h2>

        <p>
          <strong>Guitar lessons, in order.</strong> {STAGE_LESSONS} guided
          lessons across {spellOut(STAGES)} stages, plus {SONG_COMPANIONS}{" "}
          popular-song practice companions. The opening lessons guide setup,
          tuning, and single-note practice; the wider curriculum covers chords,
          reading, rhythm and the whole neck, with a step for each and a place
          kept between visits. Listening demonstrations, self-reported
          practice, visual reading results, and microphone scores are labeled
          separately, so you always know which kind of check you are looking
          at.
        </p>

        <p>
          <strong>Voice lessons</strong>, built the same way, from the room you
          sing in and a steady tone, through registers and the break, to
          agility and a sound of your own, live on{" "}
          <a href={SING_VOICE_COURSE}>Suede Sing</a>, next to the rooms that
          measure them.
        </p>

        <p>
          <strong>A method.</strong> One loop, run against one goal at a time,
          in four stages: baseline, isolate, reconnect, prove. The site presents
          it as four weeks, one stage per week, but the week is a default rather
          than a rule. Each stage has a test that tells you it is finished.
        </p>

        <p>
          <strong>The Advanced Lab</strong>, {DRILLS.length} free scored drills
          for experienced players across technique, theory, rhythm, ear
          training, fretboard, improvisation, repertoire and tone.{" "}
          <Link href="/advanced">Open the Advanced Lab</Link>.
        </p>

        <p>
          <strong>{spellOut(TOOLS.length).replace(/^./, (c) => c.toUpperCase())} free tools</strong>, each running in your browser:
        </p>

        <ul>
          <li>
            <Link href="/practice">The guitar tuner and metronome</Link> checks
            each open string with pitch feedback and reference tones, then
            keeps a steady four-beat click at your tempo.
          </li>
          <li>
            <Link href="/breakthrough">The 30-day breakthrough planner</Link>{" "}
            turns one finish line into a four-week sequence you can start today.
          </li>
          <li>
            <Link href="/diagnose">The practice plateau diagnostic</Link> ends
            by naming the part of your practice that stopped producing change,
            rather than by giving you a score.
          </li>
          <li>
            <Link href="/session">The practice session builder</Link> turns the
            minutes you have into timed blocks, weighted toward the one thing
            you are fixing.
          </li>
          <li>
            <Link href="/tempo">The tempo ladder builder</Link> turns one
            difficult passage into a starting speed, a target, and the steps
            between them.
          </li>
          <li>
            <Link href="/readiness">The song readiness score</Link> checks a
            song against the parts that break under pressure, before you decide
            it is finished.
          </li>
          <li>
            <Link href="/log">The practice evidence log</Link> takes one line
            per session and reports what moved, with no streak counter and no
            direction drawn through fewer than three sessions.
          </li>
        </ul>

        <p>
          <strong>Written guides</strong>, covering the method itself, how to
          practice effectively, why progress plateaus once the beginner gains
          run out, what deliberate practice means at the instrument, how to run
          a 30-day challenge that ends in evidence, an intermediate weekly
          routine, how long to practice each day, a schedule that survives a
          real week, why speed has a ceiling, how to memorize a song, and how to
          work with a metronome. They are linked from the site footer.
        </p>

        <p>
          <strong>An application to a founding room</strong>, described below.
        </p>

        <h2>Make each practice count</h2>
        <p>
          Start with the opening module of a path and the free browser tools.
          Use the practice loop to choose one goal, capture a baseline on your
          phone, and bring a recording and a specific question to your next
          lesson. Apply for the founding room for a personal response about
          your playing goals.
        </p>

        <h2>How this fits with Strumly and Suede AI Social</h2>

        <p>
          GuitarHub teaches and runs your practice. Strumly coaches. Suede AI
          Social carries the wider conversation. All three are Suede AI
          products.
        </p>

        <p>
          In practice that means a lesson or a plan here decides <em>what</em>{" "}
          you work on this week, and GuitarHub&apos;s own tuner, metronome and
          Advanced Lab drills cover the daily work. Strumly adds the AI coach
          that listens to you play, along with chord references, scale maps and
          ear training. The{" "}
          <a href={STRUMLY.guides}>Strumly guides</a> go deep on gear, tone,
          signal chain and the rights to your music. Strumly also sells its music data to AI
          agents one call at a time. That is Strumly&apos;s business, and it
          runs on the same chord, key and song knowledge the lessons here are
          built on.
        </p>

        <p>
          The GuitarHub community meets on{" "}
          <a href={STRUMLY.social}>Suede AI Social</a>, where players post rigs
          and talk to each other.
        </p>

        <h2>Apply for the founding room</h2>

        <p>
          Applications for the founding room are open and reviewed personally.
          Tell us what you want to improve and what your practice week looks like.
        </p>

        <p>
          The intent is a small room, 8 to 12 players, assembled around one
          rule: a check-in has to change the next practice. Members would be
          matched by goal and by a schedule that works in a real week,
          corrections would stay private, and progress proof would be shared
          only when a player chooses to share it. The founding-room design puts focused practice and personal feedback
          at the center.
        </p>

        <p>
          Applying sends four things: your name, your email address, a line
          about your playing experience, and one sentence naming the change you
          want to prove in thirty days. It arrives as an email at
          info@suedeai.ai and it is read personally. It takes no payment, asks
          for no card, and creates no commitment on either side. You will receive a personal response about your goal and the next step.
        </p>

        <p>
          You see the schedule, review capacity, and price before you are asked
          to commit to anything.{" "}
          <Link href="/#apply">The application form is on the home page.</Link>
        </p>

        <h2>What happens to what you type</h2>

        <p>
          The lessons and the tools keep their state in your own browser, in
          local storage. Close the tab and the work is still there next time;
          clear your browser data and it is gone. The planning tools send
          nothing to a server. If you sign in on the account page and
          explicitly turn on practice sync, new lesson-attempt results are
          saved to your account; earlier records stay on your device.
        </p>

        <p>
          There is no analytics script and no third-party tracker on this
          site, which you can confirm from the page source. The tuner, lesson
          exercises and Advanced Lab drills listen through your microphone only
          after you start them and analyze the sound on your device; raw audio
          is never uploaded. When the method tells you to record a baseline,
          record it on your phone and keep it yourself.
        </p>

        <p>
          The application form sends the four fields you fill in through Resend
          to info@suedeai.ai. The website host also processes ordinary connection
          information to deliver and protect the site. The{" "}
          <Link href="/privacy">Privacy Policy</Link> explains microphone use,
          local records, purchases, hosting, and messages in more detail.
        </p>

        <h2>Corrections and contact</h2>

        <p>
          One address for everything, including press:{" "}
          <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.
        </p>

        <p>
          Corrections to the lessons or the method go to the same address and
          get a personal reply. The method is an argument about how playing
          gets learned, and it is built to be tested against your own
          recordings: run it for a month and compare the two takes.
        </p>
      </Article>
    </>
  );
}
