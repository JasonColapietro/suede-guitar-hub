import Image from "next/image";
import { FieldGuideShelf } from "@/components/FieldGuides";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import LevelPicker from "@/components/LevelPicker";
import PracticeWorkspace from "@/components/PracticeWorkspace";
import { BuyButton } from "@/components/paywall/BuyButton";
import { DRILLS } from "@/lib/advanced/drills";
import { checkoutAvailable } from "@/lib/checkout/config";
import { FUNNEL_PRIMARY } from "@/lib/funnel";
import { allLessons, curricula } from "@/lib/learning/curriculum";
import { APP_STORE, FREE_TOOLS, OFFER, STRUMLY, lifetimeOfferAt, spellOut, type LifetimeOffer } from "@/lib/site";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { keywordsFor } from "@/lib/keywords";
import { pageJsonLd } from "@/lib/page-schema";

/**
 * Title, description and share card come from the root layout. The canonical
 * is set here because the layout no longer declares one: every page without
 * its own inherited it and pointed at the home page.
 */
export const metadata: Metadata = {
  keywords: keywordsFor("/"),
  alternates: { canonical: SITE_URL },
};

/**
 * Written out from the registry, never typed. The heading below sat on a
 * hard-coded "Four tools." while `TOOLS` grew to six, which is the one kind of
 * claim this site cannot afford to get wrong on its own front page.
 */
const TOOL_COUNT = (() => {
  const word = spellOut(FREE_TOOLS.length);
  return word.charAt(0).toUpperCase() + word.slice(1);
})();

/**
 * Counted from the catalog for the same reason. Stage lessons and song
 * companions are different kinds of lesson, so they are stated separately, as
 * /learn does.
 */
const GUITAR_LESSONS = allLessons("guitar");
const STAGE_LESSONS = GUITAR_LESSONS.filter((entry) => entry.level.stage).length;
const SONG_COMPANIONS = GUITAR_LESSONS.length - STAGE_LESSONS;
const STAGES = curricula.guitar.levels.filter((level) => level.stage).length;

/**
 * The 30-day path, one existing module a week: chords (stages 2 and 3), then
 * the pentatonic scale (stage 4), then a first solo (stage 5). The same four
 * modules the free 30-day plan opens, week by week (lib/breakthrough.ts).
 */
const PATH = [
  {
    week: "Week 1 · Chords",
    module: "D and A",
    body: "Fret clean D and A chords, check that every string rings, and switch between them on the beat.",
  },
  {
    week: "Week 2 · Chords",
    module: "E, C and G",
    body: "Add E, C and G to fill out the open eight, then play an original turnaround study with every string ringing.",
  },
  {
    week: "Week 3 · The scale",
    module: "Box One",
    body: "Learn the minor pentatonic box, the five notes that always work over a blues, and play it up and down cleanly.",
  },
  {
    week: "Week 4 · Your first solo",
    module: "First Solo",
    body: "Improvise four bars in key over a twelve-bar blues and play them through without stopping.",
  },
] as const;

/** One compact row for the sister products, one link each. */
const MORE_FROM_SUEDE = [
  {
    name: "Strumly",
    body: "Guitar guides on tone, rigs and the signal chain, plus song lessons with the gear behind them.",
    href: STRUMLY.guides,
    cta: "Browse Strumly",
  },
  {
    name: "Suede Sing",
    body: "The home for voice on the web: lessons from first breath to first song, with rooms that measure range, pitch and breath.",
    href: SING_VOICE_COURSE,
    cta: "Open Suede Sing",
  },
  {
    name: "The Signal Chain",
    body: "The book: the history of guitar tone and 111 song lessons with full tablature.",
    href: STRUMLY.book,
    cta: "See the book",
  },
] as const;

function faqs(offer: LifetimeOffer) {
  return [
    {
      q: "Who is GuitarHub for?",
      a: `Beginner and intermediate guitarists who want to play real chords and improvise. A five-question placement picks your free module: D and A if you are starting out, Box One if you already change between open chords, First Solo if barre chords and the pentatonic box are under your fingers. Lifetime access opens every lesson for ${offer.oneTime}.`,
    },
    {
      q: "What comes with the free 30-day plan?",
      a: "Four weeks from D and A to your first solo, a practice action for every practice day, and a printable chord and pentatonic chart pack. Enter your email and the full plan and the chart pack arrive in your inbox, followed by practice tips. Every email carries an unsubscribe link.",
    },
    {
      q: "How does the 90-day guarantee work?",
      a: `${OFFER.guarantee} It covers lifetime access bought on guitarhub.org: email info@suedeai.ai from the address on your receipt. Apple handles refunds for purchases made in the iPhone app.`,
    },
    {
      q: "Does one purchase cover the website and the iPhone app?",
      a: `Yes. Buy lifetime access on guitarhub.org or in ${APP_STORE.name}, then sign in with the same email on both to open every lesson in each.`,
    },
    {
      q: "Does GuitarHub upload my playing?",
      a: "Microphone exercises analyze audio on your device. Raw audio is never recorded or uploaded. Practice history stays in this browser, and syncs to your account only when you sign in and turn sync on.",
    },
  ] as const;
}

/** The home page as its own node; the WebSite it belongs to is in app/layout.tsx. */
const PAGE_JSON_LD = pageJsonLd({
  canonical: SITE_URL,
  name: "Guitar Lessons: Chords to First Solo in 30 Days | GuitarHub",
  description:
    "Play real chords and improvise your first solo in 30 days. Get the free 30-day plan, start your free module, and unlock every lesson with lifetime access.",
});

export default function Home() {
  // A static page: priced from the offer in force when it is built.
  const offer = lifetimeOfferAt(new Date());
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSON_LD) }} />
      <SiteNav />

      <main id="main-content" tabIndex={-1}>
        {/* Hero. Not wrapped in Reveal: the headline and the primary action
            have to be on screen at first paint, not after a scroll observer. */}
        <section className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-[2rem] px-5 pb-14 pt-12 text-center text-cream sm:px-6 md:py-28">
            {/* alt="" is deliberate. Reviewed against the artwork: this is a
                room photograph carrying mood, and it sits under
                `hero-backdrop` at 0.86 opacity with the headline on top of it.
                It states nothing the heading does not, so naming it would only
                add noise ahead of the copy a screen reader is here for. */}
            <Image
              src="/hero-studio.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="hero-backdrop absolute inset-0 opacity-[0.86]" aria-hidden />
            <div className="relative">
              <p className="mb-5 text-xs font-semibold uppercase leading-normal tracking-widest text-violet-pale sm:text-sm">
                Guitar lessons for beginner and intermediate players
              </p>
              <h1 className="mx-auto max-w-3xl text-4xl leading-tight text-cream sm:text-5xl md:text-6xl">
                {OFFER.promise}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
                One module a week: D and A, then E, C and G, then the minor
                pentatonic box, then four bars of your own over a twelve-bar
                blues. Get the free plan and a printable chord and scale chart
                pack, then start the module your placement picks, free.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={FUNNEL_PRIMARY.magnet.href}
                  data-funnel-primary
                  className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105 sm:w-auto"
                >
                  {FUNNEL_PRIMARY.magnet.label} <span aria-hidden>→</span>
                </Link>
                <Link
                  href={FUNNEL_PRIMARY.freeModule.href}
                  className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-full px-7 py-3.5 font-semibold text-cream ring-1 ring-white/40 transition hover:bg-white/10 sm:w-auto"
                >
                  {FUNNEL_PRIMARY.freeModule.label}
                </Link>
              </div>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/75">
                Ready for every lesson?{" "}
                <a href="#levels" className="font-semibold text-peach underline underline-offset-4">
                  Lifetime access is {offer.oneTime}
                </a>
                , on the web or in GuitarHub for iPhone.
              </p>
            </div>
          </div>
        </section>

        <PracticeWorkspace compact />

        {/* How it works: the 30-day path through the lessons */}
        <section id="how-it-works" aria-labelledby="how-it-works-title" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet">The 30-day path</p>
            <h2 id="how-it-works-title" className="mx-auto mt-3 max-w-3xl text-center text-4xl leading-snug text-indigo-deep md:text-5xl">
              Chords, then the pentatonic scale,{" "}
              <em className="font-display italic">then your first solo.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-ink/70">
              Four modules from the GuitarHub curriculum, one a week. Each
              lesson pairs written instruction with an exercise you play and a
              checkpoint that tells you when to move on.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PATH.map((item, i) => (
              <Reveal key={item.module} as="li" delay={(i % 3) as 0 | 1 | 2}>
                <div className="h-full rounded-3xl bg-cream-soft p-7 ring-1 ring-ink/5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-violet">
                    {item.week}
                  </span>
                  <h3 className="mt-3 font-display text-2xl text-indigo-deep">{item.module}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <Link href="/method" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet underline-offset-4 hover:underline">
              Read the method behind each week
            </Link>
          </div>
        </section>

        {/* Free tools */}
        <section id="tools" aria-labelledby="tools-title" className="mx-auto max-w-6xl px-6 pb-20">
          <Reveal>
            <h2 id="tools-title" className="text-center text-4xl text-indigo-deep md:text-5xl">
              {TOOL_COUNT} free tools{" "}
              <em className="font-display italic">for every practice day.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-4 max-w-xl text-center text-ink/70">
              Tune up, keep time, map your month and work a hard passage up to
              tempo. Each one opens in your browser with no account.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FREE_TOOLS.map((tool, i) => (
              <Reveal key={tool.href} delay={(i % 3) as 0 | 1 | 2}>
                <Link
                  href={tool.href}
                  className="flex h-full flex-col rounded-3xl bg-white p-7 ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <h3 className="font-display text-xl leading-snug text-indigo-deep">
                    {tool.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {tool.blurb}
                  </p>
                  <span className="mt-5 text-sm font-semibold text-violet">
                    Open it <span aria-hidden>→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <FieldGuideShelf
          title="Field guides for the music stand"
          intro="Every practice guide as a PDF, from the method to clean tone. Pick the problem you have this week and keep the guide on your phone or the music stand."
          hrefs={["/guitar-practice-plateau", "/why-cant-i-play-guitar-fast", "/how-to-memorize-songs-on-guitar", "/resources/how-to-practice-clean-guitar-tone", "/guitar-practice-routine-intermediate"]}
          moreHref="/guides#field-guides"
        />

        {/* Every lesson with lifetime access, and the web buy path */}
        <section id="levels" aria-labelledby="levels-title" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet">Lifetime access · {offer.oneTime}</p>
            <h2 id="levels-title" className="mx-auto mt-3 max-w-3xl text-center text-4xl leading-snug text-indigo-deep md:text-5xl">
              Every lesson,{" "}
              <em className="font-display italic">one purchase.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-ink/70">
              {STAGE_LESSONS} guided lessons in {spellOut(STAGES)} stages take you
              from your first clean note to barre chords, the blues and your own
              solos, with {SONG_COMPANIONS} song companions, the{" "}
              {DRILLS.length}-drill Advanced Lab and the daily practice routine.
              Your first module is free. Lifetime access opens the rest for{" "}
              {offer.oneTime}, and one purchase covers guitarhub.org and{" "}
              {APP_STORE.name} for iPhone when you sign in with the same email.
            </p>
          </Reveal>
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            {offer.launchNote && <p className="text-sm font-semibold text-indigo-deep">{offer.launchNote}</p>}
            <BuyButton
              checkoutAvailable={checkoutAvailable()}
              offer={offer}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
            />
            <p className="max-w-xl text-sm leading-relaxed text-ink/70">{OFFER.guarantee}</p>
          </div>
          <div className="mt-12">
            <LevelPicker />
          </div>
          <p className="mt-10 text-center text-sm leading-relaxed text-ink/70">
            Not sure where you fit?{" "}
            <Link href="/start" className="font-semibold text-violet underline-offset-4 hover:underline">
              Take the five-question placement
            </Link>
          </p>
        </section>

        {/* More from Suede AI */}
        <section id="more" aria-labelledby="more-title" className="mx-auto max-w-6xl px-6 py-20">
          <h2 id="more-title" className="text-center text-3xl text-indigo-deep md:text-4xl">
            More from <em className="font-display italic">Suede AI</em>
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {MORE_FROM_SUEDE.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className="flex h-full flex-col rounded-3xl bg-white p-6 ring-1 ring-ink/5 transition hover:ring-violet"
                >
                  <h3 className="font-display text-xl text-indigo-deep">{item.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">{item.body}</p>
                  <span className="mt-auto pt-4 text-sm font-semibold text-violet">
                    {item.cta} <span aria-hidden>↗</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-6 pb-24">
          <Reveal>
            <h2 id="faq-title" className="text-center text-4xl text-indigo-deep">
              Questions, <em className="font-display italic">answered.</em>
            </h2>
          </Reveal>
          <div className="mt-10 space-y-4">
            {faqs(offer).map((faq, i) => (
              <Reveal key={faq.q} delay={(i % 2) as 0 | 1}>
                <details className="group rounded-2xl bg-white p-6 ring-1 ring-ink/5">
                  {/* py-2.5 puts the toggle at 44px (10 + a 24px line box +
                      10); the matching -my-2.5 keeps the visual spacing the
                      design had before the tap target grew. */}
                  <summary className="-my-2.5 cursor-pointer list-none py-2.5 font-semibold text-indigo-deep">
                    {faq.q}
                  </summary>
                  <p className="mt-3 text-ink/70">{faq.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* The site-wide footer, built from lib/site.ts: it links every tool and
          every guide, so the homepage reaches every page on the site. */}
      <SiteFooter />
    </>
  );
}
