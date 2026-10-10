import Image from "next/image";
import { FieldGuideShelf } from "@/components/FieldGuides";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import ApplyForm from "@/components/ApplyForm";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import LevelPicker from "@/components/LevelPicker";
import { DRILLS, SKILL_AREAS } from "@/lib/advanced/drills";
import { allLessons, curricula } from "@/lib/learning/curriculum";
import { APP_STORE, LIFETIME, STRUMLY, TOOLS, spellOut } from "@/lib/site";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { keywordsFor } from "@/lib/keywords";

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
  const word = spellOut(TOOLS.length);
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
 * The visitor's 30 days, in the order they live them. Each step names the
 * /method stage it runs, so the home page and the method page describe one
 * loop: baseline, isolate, reconnect, prove.
 */
const STEPS = [
  {
    step: "Pick a goal",
    stage: "Day 0",
    body: "Name one thing you can't play yet: a chord change that stalls, a solo that falls apart at tempo, a song you can't finish. One goal, written down.",
  },
  {
    step: "Record day 1",
    stage: "Baseline",
    body: "Play it once on your phone, mistakes included. That take is the baseline every later attempt is measured against.",
  },
  {
    step: "Run the plan",
    stage: "Isolate · Reconnect",
    body: "Repair the piece that breaks, then put it back into the full song, the click or the backing track. The free tools time, pace and log each session.",
  },
  {
    step: "Record day 30",
    stage: "Prove",
    body: "Play the same take again and listen beside day 1. The difference is your proof, and it sets the next goal.",
  },
] as const;

const ROOM_RULES = [
  {
    title: "8–12 players",
    body: "Matched by goal and a schedule that works, so your playing gets heard.",
  },
  {
    title: "Private by default",
    body: "Corrections stay private. Progress proof is shared only when you choose.",
  },
  {
    title: "One weekly studio",
    body: "Bring one recording, leave with one correction for the next session.",
  },
  {
    title: "No infinite feed",
    body: "Every check-in exists to change your next attempt.",
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
    body: "Voice lessons from first breath to first song, with all seven stages free.",
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

const FAQS = [
  {
    q: "Who is GuitarHub for?",
    a: `Any guitarist with one thing they can't play yet. New players follow the guided lesson path, unlocked with lifetime access for ${LIFETIME.oneTime} in GuitarHub for iPhone. Returning and intermediate players build the free 30-day plan and run it with the free tools. Experienced players go straight to the free Advanced Lab.`,
  },
  {
    q: "Can I use the planner without joining?",
    a: "Yes. The 30-day planner is free, needs no account, and stores progress only in your browser.",
  },
  {
    q: "Where does the GuitarHub community meet?",
    a: "On Suede AI Social, where players post rigs and talk guitar. The founding room's practice crew is formed from the applications we review personally.",
  },
  {
    q: "Does GuitarHub upload my playing?",
    a: "Microphone exercises analyze audio on your device. Raw audio is not recorded or uploaded. Practice history stays in this browser; the application form sends the details you choose to submit by email.",
  },
] as const;

export default function Home() {
  return (
    <>
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
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-pale sm:text-sm">
                GuitarHub · beginner to advanced
              </p>
              <h1 className="mx-auto mt-5 max-w-3xl text-4xl leading-tight text-cream sm:text-5xl md:text-6xl">
                Practice guitar with{" "}
                <em className="font-display italic text-peach">a plan you can prove.</em>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
                Pick one thing you can&apos;t play yet. Get a four-week plan, free
                tools to run it, and a recording on day 1 and day 30 that shows
                exactly what changed. Free in your browser, no account.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/breakthrough"
                  className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105 sm:w-auto"
                >
                  Build your free 30-day plan <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/diagnose"
                  className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-full px-7 py-3.5 font-semibold text-cream ring-1 ring-white/40 transition hover:bg-white/10 sm:w-auto"
                >
                  Take the 2-minute practice check
                </Link>
              </div>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/75">
                Brand new to guitar?{" "}
                <a href="#levels" className="font-semibold text-peach underline underline-offset-4">
                  Follow the {STAGE_LESSONS}-lesson path from stage 1
                </a>
                , unlocked with {LIFETIME.display} lifetime access in GuitarHub for iPhone.
              </p>
            </div>
          </div>
        </section>

        {/* How it works: the four steps of the 30-day plan */}
        <section id="how-it-works" aria-labelledby="how-it-works-title" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet">How it works</p>
            <h2 id="how-it-works-title" className="mx-auto mt-3 max-w-3xl text-center text-4xl leading-snug text-indigo-deep md:text-5xl">
              One goal, thirty days,{" "}
              <em className="font-display italic">two recordings.</em>
            </h2>
          </Reveal>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item, i) => (
              <Reveal key={item.step} as="li" delay={(i % 3) as 0 | 1 | 2}>
                <div className="h-full rounded-3xl bg-cream-soft p-7 ring-1 ring-ink/5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-violet">
                    {i + 1} · {item.stage}
                  </span>
                  <h3 className="mt-3 font-display text-2xl text-indigo-deep">{item.step}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <Link
              href="/breakthrough"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
            >
              Build your free 30-day plan <span aria-hidden>→</span>
            </Link>
            <Link href="/method" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet underline-offset-4 hover:underline">
              Read the four-stage method behind it
            </Link>
          </div>
        </section>

        {/* Free tools */}
        <section id="tools" aria-labelledby="tools-title" className="mx-auto max-w-6xl px-6 pb-20">
          <Reveal>
            <h2 id="tools-title" className="text-center text-4xl text-indigo-deep md:text-5xl">
              {TOOL_COUNT} free tools to run it.{" "}
              <em className="font-display italic">No account.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-4 max-w-xl text-center text-ink/70">
              Each one runs in your browser. Nothing is uploaded and nothing is
              emailed. What you type stays on the device you typed it on.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool, i) => (
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
          title="Free field guides for the music stand"
          intro="Every practice guide as a free PDF, from the method to clean tone. Pick the problem you have this week and keep the guide on your phone or the music stand."
          hrefs={["/guitar-practice-plateau", "/why-cant-i-play-guitar-fast", "/how-to-memorize-songs-on-guitar", "/resources/how-to-practice-clean-guitar-tone", "/guitar-practice-routine-intermediate"]}
          moreHref="/guides#field-guides"
        />

        {/* Guided lessons with lifetime access */}
        <section id="levels" aria-labelledby="levels-title" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet">Guided lessons · {LIFETIME.display} lifetime access</p>
            <h2 id="levels-title" className="mx-auto mt-3 max-w-3xl text-center text-4xl leading-snug text-indigo-deep md:text-5xl">
              Learning from scratch?{" "}
              <em className="font-display italic">Follow the lesson path.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-ink/70">
              {STAGE_LESSONS} guided lessons in {spellOut(STAGES)} stages take you
              from your first clean note to barre chords, the blues and your own
              solos, with {SONG_COMPANIONS} song companions along the way. Start
              the first module free in {APP_STORE.name} for iPhone, then
              unlock every lesson with lifetime access: {LIFETIME.oneTime}.
            </p>
          </Reveal>
          <div className="mt-12">
            <LevelPicker />
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <a
              href={APP_STORE.ios}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
            >
              {LIFETIME.cta} <span aria-hidden>↗</span>
            </a>
            <p className="text-sm leading-relaxed text-ink/70">
              Not sure where you fit?{" "}
              <Link href="/start" className="font-semibold text-violet underline-offset-4 hover:underline">
                Take the five-question level check
              </Link>
              {" · "}
              <Link href="/learn/guitar/routine" className="font-semibold text-violet underline-offset-4 hover:underline">
                Try the free A-to-D chord routine
              </Link>
            </p>
          </div>
        </section>

        {/* Advanced Lab */}
        <section id="advanced" aria-labelledby="advanced-title" className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet">Advanced Lab · free</p>
            <h2 id="advanced-title" className="mx-auto mt-3 max-w-3xl text-center text-4xl leading-snug text-indigo-deep md:text-5xl">
              Already good?{" "}
              <em className="font-display italic">Get clean at tempo.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-ink/70">
              {DRILLS.length} scored drills across the {SKILL_AREAS.length} skill areas a complete player needs. Practice mode waits for every note; Play mode scores the whole pass and tells you when to push the tempo.
            </p>
          </Reveal>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SKILL_AREAS.map((area, i) => (
              <li key={area.id}>
                <Reveal delay={(i % 3) as 0 | 1 | 2}>
                  <Link href={`/advanced#${area.id}`} className="block h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5 transition hover:ring-violet">
                    <span className="font-display text-xl text-indigo-deep">{area.name}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-ink/65">{area.blurb}</span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link href="/advanced" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid">
              Open the Advanced Lab <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* Founding room: the pitch, the rules and the application in one
            place. `#apply` is the anchor every "Apply to the room" link on the
            site points at, so it stays on the form. */}
        <section id="room" aria-labelledby="room-title" className="px-3">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-20 md:py-24">
            {/* alt="" is deliberate: an amp in low light, run under
                `hero-backdrop` at 0.92 opacity behind the copy. */}
            <Image
              src="/amp-glow.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="hero-backdrop absolute inset-0 opacity-[0.92]" aria-hidden />
            <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <Reveal>
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-pale">The founding room</p>
                  <h2 id="room-title" className="mt-3 text-4xl leading-snug text-cream md:text-5xl">
                    Want a coach&apos;s ear{" "}
                    <em className="font-display italic text-peach">on your playing?</em>
                  </h2>
                  <p className="mt-5 text-lg leading-relaxed text-white/80">
                    We&apos;re forming a group of 8–12 players. Each week you bring
                    one recording and get back one specific correction for your
                    next session. Applying is free, and you&apos;ll see the
                    schedule and price before you commit.
                  </p>
                </Reveal>
                <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                  {ROOM_RULES.map((rule, i) => (
                    <Reveal key={rule.title} as="li" delay={(i % 2) as 0 | 1}>
                      <div className="mentor-card-glow h-full rounded-2xl border border-white/10 p-5">
                        <h3 className="font-display text-lg text-cream">{rule.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">{rule.body}</p>
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </div>
              <div id="apply" className="scroll-mt-24">
                <Reveal>
                  <h3 className="font-display text-2xl text-cream md:text-3xl">
                    Apply to the founding room
                  </h3>
                  <p className="mt-3 text-white/75">
                    Tell us where your playing is and name one change you can prove in
                    30 days. No payment is taken here.
                  </p>
                </Reveal>
                <Reveal delay={1}>
                  <div className="mt-8">
                    <ApplyForm />
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
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
            {FAQS.map((faq, i) => (
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
