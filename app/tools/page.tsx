import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import {
  GUIDES,
  OG_IMAGE,
  SITE_URL,
  STRUMLY,
  TOOLS,
  type SiteEntry,
} from "@/lib/site";

const CANONICAL = `${SITE_URL}/tools`;

/** Read by both the visible trail and the BreadcrumbList JSON-LD below. */
const CRUMBS = crumbTrail("Tools", CANONICAL);
const PUBLISHED = "2026-08-29";

const TITLE = "Free Guitar Practice Tools | GuitarHub";
// 143 characters. No count of the tools, and no list of them, appears here, in
// the openGraph description, or anywhere in the body copy: this page is
// generated from the registry, and a hard-typed "four" — or a hand-kept list of
// five — becomes a lie the moment another entry is added to `TOOLS`.
const DESCRIPTION =
  "The free guitar practice tools on GuitarHub in one place: what each one is for, who it helps, and why they run in your browser with no account.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    // Under the same rule as DESCRIPTION above, and for the same reason: the
    // line this replaced named the tools one by one, which meant it was a
    // list to maintain by hand. It had already fallen a tool behind.
    description:
      "What each free GuitarHub practice tool is for, who it helps, and which one to open first. No account, and nothing you type leaves your browser.",
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
  "/practice": {
    purpose: "Check the pitch and octave of one open guitar string at a time, hear synthesized standard tuning references, and use a four-beat metronome at your chosen tempo. The microphone stays off until you start the tuner.",
    audience: "Players tuning up before a lesson or practicing chord changes, scales, and short passages with a steady click.",
  },
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
  "/session": {
    purpose:
      "You give it the minutes you actually have and the one thing the session is for. It returns ordered, whole-minute blocks that add up exactly, drops anything too short to be useful, and keeps completed blocks in this browser.",
    audience:
      "Players who already know what needs work but lose the session deciding what to do next, or whose available time rarely matches a canned routine.",
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
  "/log": {
    purpose:
      "You record the date, one focus, a tempo or clean-pass rate, and one honest note. It compares like with like over 7 and 30 days, and refuses to claim a direction until one focus has at least three sessions.",
    audience:
      "Players who can say how often they practised but cannot show whether the passage, transition, or song they chose is actually moving.",
  },
  "/tools/chord-detector": {
    purpose:
      "Strum one chord into your microphone. It shows the chord the sounding notes fit best, with a confidence, the closest alternatives and the pitch classes it heard.",
    audience:
      "Players working out a chord by ear, or checking that a shape they found really spells the chord they think it does.",
  },
  "/tools/intonation-checker": {
    purpose:
      "Play each string's 12th-fret harmonic, or the open string, then the fretted 12th-fret note. It shows the difference in cents and which way to move the saddle.",
    audience:
      "Players whose guitar is in tune open but sounds out of tune higher up the neck, especially after a string gauge change or a new setup.",
  },
  "/tools/pedal-lab": {
    purpose:
      "Play the built-in riff or your own guitar through a pedalboard you build: add, remove, bypass and reorder pedals ahead of an amp and cab, and hear each change as you make it. Presets match the tone course recipes.",
    audience:
      "Players who have read about pedals and pedal order and have never heard the differences side by side.",
  },
  "/tools/slow-downer": {
    purpose:
      "Open a song from your own device and play it at 25 to 125 per cent speed, with the pitch kept or, in tape mode, allowed to drop. Mark an A–B loop on the waveform, and let the speed-up loop add a few per cent after each pass.",
    audience:
      "Players learning a solo or riff by ear from a recording that is too fast to hear clearly.",
  },
  "/tools/speed-trainer": {
    purpose:
      "You give it a clean starting tempo, a target, a step size and the bars per step. The click climbs by itself within one session and lands exactly on the target, with climb, climb-and-reset and burst modes.",
    audience:
      "Players who can play a passage cleanly at one tempo and keep stopping to nudge the metronome up.",
  },
  "/tools/fretboard": {
    purpose:
      "Choose a root, a scale, mode or arpeggio, and a tuning, and every note it uses appears on the neck, labelled by note name or degree, one position at a time if you like. Tap a note to hear it, or switch to the quiz and find notes without the map.",
    audience:
      "Players who know a few shapes and lose track of the notes and intervals once they leave them.",
  },
  "/tools/eq-ear-trainer": {
    purpose:
      "A guitar loop or pink noise plays through one hidden EQ boost or cut. You switch between flat and EQ, name the band, then hear the answer with a note on what that band does to a guitar.",
    audience:
      "Players who turn tone knobs by trial and error and want to hear what 250 Hz, 800 Hz or 3 kHz actually sound like.",
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
    href: "/practice",
    sentence: "I have my guitar ready and need to tune up or set a steady tempo.",
    stage: "During practice. Open the tuner and metronome without starting a lesson.",
  },
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
    href: "/session",
    sentence: "I know what to work on and need it to fit the time I have today.",
    stage: "Prescribe and practise. It turns the target into blocks you can run now.",
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
  {
    href: "/log",
    sentence: "I finished the session and need to know whether the work is moving.",
    stage: "Prove and correct. It carries the evidence into the next diagnosis.",
  },
  {
    href: "/tools/chord-detector",
    sentence: "I found a shape that sounds right, and I do not know what chord it is.",
    stage: "While learning a song. It names the chord you are holding as you work the song out.",
  },
  {
    href: "/tools/intonation-checker",
    sentence: "My guitar is in tune on the open strings, and chords up the neck still sound sour.",
    stage: "Before practice, as setup. It checks each string before you touch a saddle.",
  },
  {
    href: "/tools/pedal-lab",
    sentence: "I do not know what a compressor actually changes, or whether my fuzz goes before the wah.",
    stage: "Away from the instrument, or with it plugged in. It lets you hear what each effect family and each order does.",
  },
  {
    href: "/tools/slow-downer",
    sentence: "I cannot hear the solo clearly enough at full speed to learn it.",
    stage: "Isolate. It slows one passage down and repeats it until you can play it.",
  },
  {
    href: "/tools/speed-trainer",
    sentence: "I can play it clean at 80, and I keep stopping to move the metronome up.",
    stage: "Isolate, inside one session. The tempo ladder plans across days; this runs the climb today.",
  },
  {
    href: "/tools/fretboard",
    sentence: "I know the pentatonic box, and I cannot say which note I am on or where the next position starts.",
    stage: "Away from the guitar or before practice. It maps the neck and tests note recall.",
  },
  {
    href: "/tools/eq-ear-trainer",
    sentence: "My tone sounds wrong in the mix, and I cannot tell whether it needs less mud, less honk or less fizz.",
    stage: "Away from the amp. It trains your ear to name frequency bands.",
  },
];

/**
 * The pro tools live under `/tools/`; everything else is a practice planner or
 * the tuner. Split by path rather than by a second list, so a tool is in
 * exactly one group without anyone maintaining the grouping.
 */
const PRO_TOOLS = TOOLS.filter((tool) => tool.href.startsWith("/tools/"));
const PRACTICE_TOOLS = TOOLS.filter((tool) => !tool.href.startsWith("/tools/"));

const ROUTING_ROWS = ROUTING.flatMap((row) => {
  const tool = TOOLS.find((entry) => entry.href === row.href);
  return tool ? [{ ...row, tool }] : [];
});

const COMMON = [
  {
    title: "Free, with nothing behind it",
    body: "These practice tools are free. They have no payment step, trial, or locked second half.",
  },
  {
    title: "No account",
    body: "Open any tool and use it without signing in or entering an email address.",
  },
  {
    title: "Runs in your browser",
    body: "Plans, diagnoses, ladders, and summaries are computed on the page. The tools that listen, the tuner, chord detector, intonation checker and the pedal lab's live input, process microphone sound on your device and do not upload it. A song you open in the slow-downer is played from your device and never sent anywhere.",
  },
  {
    title: "Stores no data on a server",
    body: "Plans, logs, settings and quiz scores stay in this browser's local storage. Readings, audio files and playback are temporary and stop when you leave. These standalone tools do not upload practice history.",
  },
];

const LIMITS = [
  "The tuner, chord detector, intonation checker and the pedal lab's live input listen only after you start them and allow microphone access. The tuner and intonation checker read one note at a time, and none of them awards a lesson score.",
  "The metronome, speed trainer, fretboard sounds, EQ ear trainer, slow-downer and the pedal lab's built-in riffs do not need microphone permission. Starting another audio tool stops the current one, and hiding or leaving the page stops playback and listening.",
  "State does not follow you between devices or browsers. No account carries it. A plan built on your laptop is not on your phone.",
  "Clearing your browser data deletes what you entered, and it cannot be restored from here.",
  "They need JavaScript. The results are computed on the page rather than fetched, so the tools produce no results without it.",
  "Planning tools depend on your own answers. The listening tools report pitch and pitch classes; they cannot assess your posture, which strings you fretted, or overall playing technique.",
  "The chord detector estimates the chord the sounding notes fit. It cannot tell voicings apart, and it confuses chords that share notes, such as Am7 and C6.",
  "The intonation checker compares pitch only. It does not measure neck relief or action, and it cannot rescue a worn string.",
  "The pedal lab's effects and amp are teaching approximations of each family, not models of any product. Its live input adds a little delay, needs headphones, and records nothing.",
  "The slow-downer does not separate the guitar from the mix, and it only opens files already on your device. How clean a very slow setting sounds depends on your browser.",
  "The speed trainer does not listen to you, so it cannot tell whether a tempo was clean. Tempo changes land on bar lines rather than ramping smoothly.",
  "The fretboard explorer shows where notes are, not how to finger them, and its quiz checks the fret you tap, not what you play.",
  "The EQ ear trainer works on one peaking band at a time on a synthesised loop, and it cannot hear what your speakers leave out.",
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
    a: "Yes. The standalone practice tools are free to use, with no trial, card, or paid upgrade required.",
  },
  {
    q: "Do I need an account?",
    a: "No. These tools work without signing in. Learning accounts, where available, are separate and are not required for the tuner, metronome, pro tools, or planning tools.",
  },
  {
    q: "Where does what I type go?",
    a: "Plans, logs and settings stay in this browser's local storage. Readings from the listening tools are temporary; microphone samples are processed on your device and are not uploaded or saved. A song opened in the slow-downer is read from your device and never sent anywhere. The standalone tools do not send your practice entries to a server.",
  },
  {
    q: "Which tool should I open first?",
    a: "Use the tuner and metronome when your guitar is in hand. If you cannot name what stopped working, start with the practice plateau diagnostic. If you know the goal but need a month, use the 30-day planner; if you know today's target and time, build the session. Log what happened afterwards. The pro tools are for a specific job: learning a recording, pushing a tempo, mapping the neck, checking a setup, or hearing what a pedal or an EQ band does.",
  },
  {
    q: "Can I use them without JavaScript?",
    a: "No. The plans, diagnoses, ladders, scores, and summaries are computed by code running in your browser rather than fetched from a server. That is the same design decision that keeps your answers off a server, and the cost of it is that the tools produce no results with JavaScript switched off.",
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
            "Requires JavaScript. No account, and no data is uploaded.",
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
    breadcrumbList(CANONICAL, CRUMBS),
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

      <Breadcrumbs crumbs={CRUMBS} />

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
              The tools GuitarHub publishes, in one place: what each one is for,
              who it helps, and which part of the practice loop it belongs to.
              None of them ask for an account, and what you type into them stays
              in your browser.
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
              <em className="font-display italic">on each one of them.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-ink/70">
              These are not a funnel with the good part behind a form. They are
              small, finished tools, and the conditions below are the same for
              each of them.
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
              records audio or accepts an upload. The tools that listen do so
              only after you press start and allow the microphone, and they
              analyse the sound on your device. When a tool tells you to record
              a baseline, it means on your phone, kept by you.
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
            {PRACTICE_TOOLS.map((tool) => (
              <li key={tool.href}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>

        {PRO_TOOLS.length > 0 ? (
          <section id="pro-tools" className="mx-auto max-w-6xl scroll-mt-32 px-6 pb-20">
            <>
              <h2 className="max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
                Pro tools.{" "}
                <em className="font-display italic">For one specific job.</em>
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-ink/70">
                Learning a part from a recording, pushing a tempo, mapping the
                neck, checking a setup, and hearing what a pedal or an EQ band
                actually does. The tone course uses the last two throughout.
              </p>
              <p className="mt-6">
                <Link href="/tone" className={LINK_PILL}>
                  The guitar tone course <span aria-hidden>→</span>
                </Link>
              </p>
              <ul className="mt-10 grid gap-6 md:grid-cols-2">
                {PRO_TOOLS.map((tool) => (
                  <li key={tool.href}>
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </>
          </section>
        ) : null}

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
            The limits are the other half of the privacy claim. The tools above
            are not free in exchange for something taken from you. They are free
            in the ordinary way: they are small, and they do less than a product
            would.
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
            Use GuitarHub’s lessons, tuner, and metronome alongside your practice
            plan. These related Strumly guides offer more help with routines and
            chord transitions:
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
            {/* Headings, not a description list. The FAQPage JSON-LD below
                declares each of these as a Question, and a <dt> is not a
                heading, so a retrievability pass counted zero visible
                questions against five in the markup. `/faq` and `/method`
                already render their questions as <h3>; this matches them. */}
            <div className="mt-10 grid gap-8">
              {FAQS.map((item) => (
                <article
                  key={item.q}
                  className="rounded-3xl bg-cream p-7 ring-1 ring-ink/5"
                >
                  <h3 className="font-display text-2xl leading-snug text-indigo-deep">
                    {item.q}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-ink/70">
                    {item.a}
                  </p>
                </article>
              ))}
            </div>
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
