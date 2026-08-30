import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { GUIDES, OG_IMAGE, SITE_URL, STRUMLY, TOOLS } from "@/lib/site";

const CANONICAL = `${SITE_URL}/about`;
const PUBLISHED = "2026-08-29";

const TITLE = "About GuitarHub: Who Built It and What It Actually Does";
// Kept near 155 characters. The longer version ran to 189 and Google truncated
// the differentiating tail, which is the half worth reading.
const DESCRIPTION =
  "GuitarHub is a guitar practice method and four free browser tools, built by Suede Labs. What it is, what it is not, and how it relates to Strumly.";

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
 * Pulled from the route registry by href so titles and blurbs stay in one
 * place. Listed explicitly rather than filtered, because this is a reading
 * order for someone who has just finished the page: the method first, then the
 * planner that runs it.
 */
const RELATED = [
  ...GUIDES.filter((entry) => entry.href === "/method"),
  ...TOOLS.filter((entry) => entry.href === "/breakthrough"),
  ...TOOLS.filter((entry) => entry.href === "/diagnose"),
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
      image: OG_IMAGE.url,
      inLanguage: "en-US",
      isPartOf: { "@id": WEBSITE_ID },
      about: [{ "@id": SUEDE_ORG_ID }, { "@id": JASON_PERSON_ID }],
      mainEntity: { "@id": SUEDE_ORG_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      breadcrumb: { "@id": `${CANONICAL}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${CANONICAL}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "GuitarHub",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "About",
          item: CANONICAL,
        },
      ],
    },
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
        eyebrow="About"
        title={
          <>
            About <em className="font-display italic text-peach">GuitarHub.</em>
          </>
        }
        dek="Who built this, what it does, what it does not do, and what happens to anything you type into it."
        updated={PUBLISHED}
        related={RELATED}
        relatedTitle="Start with one of these"
      >
        <p>
          GuitarHub is a guitar practice method and four free tools that run it.
          It exists because of one gap: guitar education is very good at
          supplying lessons and close to silent on how you would ever know
          whether a lesson worked. You can spend a year on tabs, videos, and
          courses, arrive at the end of it able to almost play a hundred things,
          and have no way to tell which of those hours were the useful ones.
        </p>

        <p>
          Everything on this site follows from that. Choose one change you can
          prove in thirty days. Record where you are before you start fixing it.
          Find the single thing that actually breaks the result and repair that
          one thing. Put the repair back under real pressure. Then record the
          same performance again, put the two takes side by side, and let them
          settle whether anything moved. The full argument, with the exit test
          for each stage, is on <Link href="/method">the method page</Link>.
        </p>

        <h2>Who built this</h2>

        <p>
          GuitarHub is made by{" "}
          <a href={STRUMLY.suedeLabs}>Suede Labs</a>, a studio founded by Jason
          Colapietro, who also publishes as Johnny Suede. Suede Labs builds{" "}
          <a href={STRUMLY.guides}>Strumly</a>, an AI guitar coach, and{" "}
          <a href={STRUMLY.social}>Suede Social</a>, where the guitar
          conversation happens. GuitarHub is the third surface, and it handles
          the part the other two do not: deciding what to practice next, and
          proving it worked.
        </p>

        <p>
          The position behind the site is his, and it is arguable. A player with
          a shelf of finished courses and no finished songs has not failed at
          practice. They were handed material and no way to check their own
          work, which is a different problem with a different fix. The fix is
          unglamorous: fewer goals, a recording at each end of the month, and an
          honest look at the two.
        </p>

        <p>
          That is also why this site is small. It has four tools instead of a
          library, because a library is the thing that caused the problem.
        </p>

        <h2>What GuitarHub is</h2>

        <p>
          <strong>A method.</strong> One loop, run against one goal at a time,
          in four stages: baseline, isolate, reconnect, prove. The site presents
          it as four weeks, one stage per week, but the week is a default rather
          than a rule. Each stage has a test that tells you it is finished.
        </p>

        <p>
          <strong>Four free tools</strong>, all of which run in your browser:
        </p>

        <ul>
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
            <Link href="/tempo">The tempo ladder builder</Link> turns one
            difficult passage into a starting speed, a target, and the steps
            between them.
          </li>
          <li>
            <Link href="/readiness">The song readiness score</Link> checks a
            song against the parts that break under pressure, before you decide
            it is finished.
          </li>
        </ul>

        <p>
          <strong>Six written guides</strong>, covering the method itself, how
          to practice effectively, why progress plateaus once the beginner gains
          run out, what deliberate practice means at the instrument, how to run
          a 30-day challenge that ends in evidence, and a weekly routine for
          intermediate players. They are linked from the footer of every page.
        </p>

        <p>
          <strong>An application to a founding room</strong>, described below.
        </p>

        <h2>What GuitarHub is not</h2>

        <p>
          This list is here because the category is full of things GuitarHub is
          not, and it is easier to say so plainly than to let you find out.
        </p>

        <ul>
          <li>
            <strong>Not a video course or a lesson library.</strong> There are no
            lesson videos here.
          </li>
          <li>
            <strong>Not an app.</strong> There is nothing to download and nothing
            to install.
          </li>
          <li>
            <strong>Not an account system.</strong> There is no sign-up, no
            login, and no password, because there are no accounts.
          </li>
          <li>
            <strong>Not a streak tracker.</strong> A kept streak and a changed
            performance are different things, and only one of them is the point.
          </li>
          <li>
            <strong>Not a model trained on your playing.</strong> Nothing here
            uploads, stores, or listens to audio. GuitarHub prescribes practice.
            It does not ingest performances.
          </li>
          <li>
            <strong>Not a running cohort, yet.</strong> The founding room is an
            open application under review. No schedule, no review capacity, and
            no price has been set.
          </li>
          <li>
            <strong>Not a teacher marketplace.</strong> There are no mentors on
            call, no booking, and no live chat.
          </li>
          <li>
            <strong>Not a replacement for a teacher.</strong> A good teacher can
            do the isolate stage for you in about a minute. The loop is a
            structure for the other six days, and it makes a lesson worth more,
            because you arrive with a recording and a specific question.
          </li>
          <li>
            <strong>Not a free trial.</strong> No payment is taken anywhere on
            this site and no card is collected. The tools are not a sample of a
            paid product.
          </li>
        </ul>

        <h2>How this fits with Strumly and Suede Social</h2>

        <p>
          GuitarHub orchestrates the practice. Strumly powers the tools. Suede
          Social carries the wider conversation. All three are Suede Labs.
        </p>

        <p>
          In practice that means the planner here decides <em>what</em> you work
          on this week and sends you to Strumly for the thing that does it: a
          metronome, a chord reference, a scale map, an ear trainer, the coach.
          Rebuilding those inside GuitarHub would produce a second, worse copy
          of a tool that already exists, so the planner links out instead. The{" "}
          <a href={STRUMLY.guides}>Strumly guides</a> cover the material this
          site deliberately leaves alone, including gear, tone, and signal chain.
        </p>

        <p>
          GuitarHub has no forum of its own and is not claiming one.{" "}
          <a href={STRUMLY.social}>Suede Social</a> is where players post rigs
          and talk to each other, and it is a separate place with separate
          rules.
        </p>

        <h2>What the founding room actually is</h2>

        <p>
          It is an application, and it is being reviewed. That is the honest
          description, and the reason to state it that carefully is that the
          alternative reading, a cohort you can join today, is not true.
        </p>

        <p>
          The intent is a small room, 8 to 12 players, assembled around one
          rule: every check-in must change the next practice. Members would be
          matched by goal and by a schedule that actually works, corrections
          would stay private, and progress proof would be shared only when a
          player chooses to share it. Those are the design commitments. They are
          not a description of something already running.
        </p>

        <p>
          Applying sends four things: your name, your email address, a line
          about your playing experience, and one sentence naming the change you
          want to prove in thirty days. It arrives as an email at
          info@suedeai.ai and it is read personally. It takes no payment, asks
          for no card, and creates no commitment on either side. If the room is
          not a fit for what you named, the honest answer is the one you will
          get.
        </p>

        <p>
          Schedule, review capacity, and price are not set. When they are, they
          will be stated before anyone is asked to commit to anything.{" "}
          <Link href="/#apply">The application form is on the home page.</Link>
        </p>

        <h2>What happens to what you type</h2>

        <p>
          The four tools keep their state in your own browser, in local storage,
          and nowhere else. Nothing you enter is sent to a server. Close the tab
          and the work is still there next time; clear your browser data and it
          is gone, and we cannot recover it, because we never had it.
        </p>

        <p>
          There are no accounts, so there is no profile to fill in, nothing to
          sign in to, and nothing for us to lose. There is no analytics script
          and no third-party tracker on this site, which you can confirm from
          the page source rather than take on trust. There is no uploaded audio
          and no recording feature. When the method tells you to record a
          baseline, it means on your phone, kept by you.
        </p>

        <p>
          The one exception is the application form, which is the only place on
          the site that transmits anything. It sends exactly the four fields you
          filled in, by email, to info@suedeai.ai. If any evidence workflow ever
          becomes part of the founding room, it will be described in full before
          anyone is asked to use it.
        </p>

        <h2>Corrections and contact</h2>

        <p>
          One address for everything, including press:{" "}
          <a href="mailto:info@suedeai.ai">info@suedeai.ai</a>.
        </p>

        <p>
          If something on this site is wrong, say so and it gets fixed. That
          includes the method. The claims here are arguments about how practice
          works, not findings, and an argument that survives contact with your
          actual playing is the only kind worth keeping.
        </p>
      </Article>
    </>
  );
}
