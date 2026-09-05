import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import ApplyForm from "@/components/ApplyForm";
import SiteFooter from "@/components/SiteFooter";
import { STRUMLY, TOOLS, spellOut } from "@/lib/site";

/**
 * Written out from the registry, never typed. The heading below sat on a
 * hard-coded "Four tools." while `TOOLS` grew to six, which is the one kind of
 * claim this site cannot afford to get wrong on its own front page.
 */
const TOOL_COUNT = (() => {
  const word = spellOut(TOOLS.length);
  return word.charAt(0).toUpperCase() + word.slice(1);
})();

// Four links, matching components/SiteNav.tsx label for label so the header
// reads the same on every route. Deliberately capped at four: at the `md`
// breakpoint this row is brand + links + apply pill inside 720px, and a fifth
// label pushes the three groups into each other at exactly 768px.
const NAV_LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/method", label: "Method" },
  { href: "#tools", label: "Tools" },
  { href: "/guides", label: "Guides" },
] as const;

const PILLARS = [
  {
    title: "Learn the movement",
    body: "Start with your instrument in tune and your hands comfortable. Follow the written steps and diagrams, then check what you understand.",
  },
  {
    title: "Practice at your pace",
    body: "Repeat a short section, slow the tempo, listen to a reference, and return to a shape that needs more time.",
  },
  {
    title: "Come back to your place",
    body: "Save your practice in this browser and continue from an available lesson. Your own reflections stay separate from reading checks and microphone results.",
  },
] as const;

const PHASES = [
  {
    phase: "Week 1",
    title: "Diagnose honestly",
    body: "Choose the finish line and record a baseline before polishing, hiding, or restarting.",
  },
  {
    phase: "Week 2",
    title: "Repair the blocker",
    body: "Isolate the one transition, timing drift, map gap, or phrase that breaks the result.",
  },
  {
    phase: "Week 3",
    title: "Add real pressure",
    body: "Reconnect the repaired skill to a full song, steady click, backing track, or cold prompt.",
  },
  {
    phase: "Week 4",
    title: "Perform and compare",
    body: "Record the final attempt beside the baseline and name the change the evidence supports.",
  },
] as const;

const ROOM_RULES = [
  {
    title: "8–12 players",
    body: "Small enough for work to be noticed and matched by goal and workable schedule.",
  },
  {
    title: "Private by default",
    body: "Corrections stay private. Progress proof is shared only when the player chooses.",
  },
  {
    title: "One weekly studio",
    body: "Members arrive with evidence and leave with a next practice prescription.",
  },
  {
    title: "No infinite feed",
    body: "The crew conversation exists to change the next attempt, not compete for attention.",
  },
] as const;

// Two GuitarHub guides and one Strumly guide. The kicker travels with the
// entry instead of being hardcoded in the card, because two of these three no
// longer leave the site and labelling them "Strumly" would be false.
const INSIGHTS = [
  {
    title: "How to practice guitar effectively",
    kicker: "Guide · GuitarHub",
    img: "/insight-1.jpg",
    href: "/how-to-practice-guitar-effectively",
  },
  {
    title: "Why guitar practice plateaus, and what fixes it",
    kicker: "Guide · GuitarHub",
    img: "/insight-2.jpg",
    href: "/guitar-practice-plateau",
  },
  {
    title: "Signal chain topology: what actually goes where, and why",
    kicker: "Guide · Strumly",
    img: "/amp-glow.jpg",
    href: STRUMLY.signalChain,
  },
] as const;

// Pulled from the registry rather than retyped. `lib/site.ts` holds the only
// external URLs this site links to, and a hand-written copy of one of them is
// a second place for it to rot.
const SONG_LESSONS = [
  { song: "Purple Haze", href: STRUMLY.lessons.purpleHaze },
  { song: "Comfortably Numb", href: STRUMLY.lessons.comfortablyNumb },
  { song: "Pride and Joy", href: STRUMLY.lessons.prideAndJoy },
  { song: "Smells Like Teen Spirit", href: STRUMLY.lessons.teenSpirit },
] as const;

const FAQS = [
  {
    q: "Who is GuitarHub for?",
    a: "New guitarists can begin with the free opening lessons. Returning players can revisit the foundations and use the practice tools. The wider curriculum is visible as a preview while web access is being connected.",
  },
  {
    q: "Can I use the planner without joining?",
    a: "Yes. The four-week planner is free, needs no account, and stores progress only in your browser.",
  },
  {
    q: "Is the community already live inside GuitarHub?",
    a: "No native GuitarHub forum is being claimed. Suede Social carries the wider conversation; the founding practice crew will be formed after applications are reviewed.",
  },
  {
    q: "Does GuitarHub upload my playing?",
    a: "Microphone exercises analyze audio on your device. Raw audio is not recorded or uploaded. Practice history stays in this browser; the application form sends the details you choose to submit by email.",
  },
] as const;

function ApplyButton({
  variant = "dark",
  compact = false,
}: {
  variant?: "dark" | "light";
  /** Header sizing: matches the pill in components/SiteNav.tsx so the brand and
   *  the pill still share one row at 390px once the nav wraps beneath them. */
  compact?: boolean;
}) {
  const classes =
    variant === "dark"
      ? "bg-indigo-deep text-cream hover:bg-indigo-mid"
      : "bg-peach text-indigo-deep hover:brightness-105";
  const size = compact
    ? "min-h-11 shrink-0 whitespace-nowrap px-4 py-2.5 text-sm md:px-5"
    : "px-7 py-3.5";
  return (
    <a
      href="#apply"
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition ${size} ${classes}`}
    >
      Apply to the room <span aria-hidden>→</span>
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink/5 bg-cream/90 backdrop-blur">
        {/* Wraps below md instead of hiding the nav, matching
            components/SiteNav.tsx: the nav is `w-full order-last`, so it drops
            to a second row while the brand and the apply pill stay on the
            first. This page previously hid the nav outright below 768px, which
            left the site's highest-traffic page with no navigation at all on a
            phone. Wrapping also makes horizontal overflow structurally
            impossible; there is no hamburger, no toggle, and no state. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-6 py-4 md:gap-x-6">
          <a href="#top" className="inline-flex min-h-11 items-center whitespace-nowrap font-display text-2xl font-semibold tracking-wide text-indigo-deep">
            GUITARHUB
          </a>
          {/* gap-x-8 wrapped, gap-6 until lg on one row: at exactly 768px the
              brand, these links and the apply pill total 709px inside a 720px
              container, and gap-8 leaves only 6px between the three groups. */}
          <nav
            aria-label="Primary"
            className="order-last flex w-full flex-wrap items-center gap-x-6 text-sm font-medium text-ink/70 md:order-none md:w-auto lg:gap-x-8"
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="inline-flex min-h-11 items-center transition hover:text-indigo-deep">
                {link.label}
              </a>
            ))}
          </nav>
          <Link href="/learn/guitar" className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-indigo-deep px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-indigo-mid md:px-5">Start learning</Link>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-24 text-center text-cream md:py-32">
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
            <Reveal>
              <span className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-violet-soft">
                Guitar lessons · practice · progress
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mx-auto mt-8 max-w-3xl text-5xl leading-tight text-cream md:text-6xl">
                Pick up your guitar.{" "}
                <em className="font-display italic text-peach">Start with one note.</em>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
                Get comfortable, tune up, and learn your first sounds.
                Follow the lesson, try it yourself, and come back where you left off.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/learn/guitar"
                  className="inline-flex items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
                >
                  Start learning guitar <span aria-hidden>→</span>
                </Link>
                <Link href="/learn/voice" className="inline-flex min-h-11 items-center rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream hover:bg-white/5">Explore voice lessons</Link>
              </div>
              <p className="mt-5 text-sm text-white/80">Three opening lessons free. No account needed. Later modules are currently web previews.</p>
            </Reveal>
            <Reveal delay={3}>
              <Link
                href="/learn/guitar"
                className="mx-auto mt-16 grid max-w-3xl gap-px overflow-hidden rounded-3xl bg-white/15 text-left ring-1 ring-white/20 sm:grid-cols-4"
              >
                {[
                  ["01", "Get comfortable"],
                  ["02", "Tune up"],
                  ["03", "Try one note"],
                  ["04", "Repeat & review"],
                ].map(([number, label]) => (
                  <span key={number} className="bg-indigo-deep/70 p-6">
                    <span className="text-xs font-semibold tracking-widest text-violet-soft">{number}</span>
                    <span className="mt-2 block font-display text-xl text-cream">{label}</span>
                  </span>
                ))}
              </Link>
            </Reveal>
            </div>
          </div>
        </section>

        {/* Problem narrative */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-4xl leading-snug text-indigo-deep md:text-5xl">
              A little practice.{" "}
              <em className="font-display italic">A clearer next step.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">
              Learn one action, give your hands time to find it, and return to it
              tomorrow. The opening lessons guide your preparation before asking
              you to play. You can pause, revisit, and practice without chasing a perfect score.
            </p>
          </Reveal>
          <div className="strings-divider mx-auto mt-16 h-10 max-w-xs" aria-hidden />
        </section>

        {/* Pillars / program */}
        <section id="program" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={(i % 3) as 0 | 1 | 2}>
                <div className="h-full rounded-3xl bg-white p-8 shadow-sm ring-1 ring-ink/5">
                  <h3 className="font-display text-2xl text-indigo-deep">{pillar.title}</h3>
                  <p className="mt-4 text-ink/70">{pillar.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-24">
            <Reveal>
              <h2 className="text-center text-4xl text-indigo-deep md:text-5xl">
                Want personal feedback?{" "}
                <em className="font-display italic">Explore the founding room.</em>
              </h2>
            </Reveal>
            <ol className="mt-12 grid gap-6 md:grid-cols-2">
              {PHASES.map((item, i) => (
                <Reveal key={item.phase} as="li" delay={(i % 2) as 0 | 1}>
                  <div className="h-full rounded-3xl bg-cream-soft p-8 ring-1 ring-ink/5">
                    <span className="text-sm font-semibold uppercase tracking-widest text-violet">
                      {item.phase}
                    </span>
                    <h3 className="mt-3 font-display text-2xl text-indigo-deep">{item.title}</h3>
                    <p className="mt-3 text-ink/70">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Free tools */}
        <section id="tools" className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <h2 className="text-center text-4xl text-indigo-deep md:text-5xl">
              {TOOL_COUNT} tools.{" "}
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

        {/* Founding-room operating rules */}
        <section id="room" className="px-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-24">
            <Reveal>
              <h2 className="text-center text-4xl text-cream md:text-5xl">
                A practice crew,{" "}
                <em className="font-display italic text-peach">not another feed.</em>
              </h2>
            </Reveal>
            <Reveal delay={1}>
              <p className="mx-auto mt-5 max-w-2xl text-center text-white/75">
                The founding room is being assembled around one rule: every check-in
                must change the next practice. Applications are reviewed before the
                schedule, review capacity, or commitment is promised.
              </p>
            </Reveal>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ROOM_RULES.map((rule, i) => (
                <Reveal key={rule.title} delay={(i % 3) as 0 | 1 | 2}>
                  <div className="mentor-card-glow h-full rounded-3xl border border-white/10 p-6">
                    <span className="text-[11px] uppercase tracking-widest text-violet-soft">
                      Room rule {i + 1}
                    </span>
                    <h3 className="mt-3 font-display text-xl text-cream">{rule.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{rule.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Results */}
        <section id="evidence" className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-4xl text-indigo-deep md:text-5xl">
              Progress you can <em className="font-display italic">hear.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">
              The public planner does not call a checked box mastery. The proof is a
              baseline and final recording, a visible rubric, and the correction that
              changed the attempt. Cohort evidence will appear here only with player
              consent and honest completion denominators.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-14 text-sm font-semibold uppercase tracking-widest text-violet">
              Start with a real song
            </p>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SONG_LESSONS.map((lesson, i) => (
              <Reveal key={lesson.song} delay={(i % 3) as 0 | 1 | 2}>
                <a
                  href={lesson.href}
                  className="block h-full rounded-2xl bg-indigo-deep p-6 text-left transition hover:-translate-y-1 hover:bg-indigo-mid"
                >
                  <h3 className="font-display text-xl text-cream">{lesson.song}</h3>
                  <p className="mt-2 text-sm text-violet-soft">
                    The tone, the rig, and the lesson →
                  </p>
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Insights */}
        <section id="insights" className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <h2 className="text-center text-4xl text-indigo-deep md:text-5xl">
              Insights from <em className="font-display italic">the practice room.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-4 max-w-xl text-center text-ink/70">
              Essays and breakdowns on how skilled players actually get built —
              publishing alongside the founding cohort.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {INSIGHTS.map((post, i) => (
              <Reveal key={post.title} delay={(i % 3) as 0 | 1 | 2}>
                <a
                  href={post.href}
                  className="block h-full overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={post.img}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                      {post.kicker}
                    </span>
                    <h3 className="mt-2 font-display text-xl leading-snug text-indigo-deep">
                      {post.title}
                    </h3>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
          <Reveal delay={2}>
            <div className="mt-10 text-center">
              <a
                href={STRUMLY.guides}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
              >
                Browse the Strumly guides <span aria-hidden>→</span>
              </a>
            </div>
          </Reveal>
        </section>

        {/* Founding-room status */}
        <section id="founding-room" className="mx-auto max-w-4xl px-6 pb-24 text-center">
          <Reveal>
            <h2 className="text-4xl text-indigo-deep md:text-5xl">The founding room</h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">
              We are qualifying the first 8–12 player room before setting schedule,
              review capacity, or price. Applying starts a fit conversation. It does
              not charge you or create a commitment.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <div className="mt-8">
              <ApplyButton />
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 pb-24">
          <Reveal>
            <h2 className="text-center text-4xl text-indigo-deep">
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

        {/* Application — dark closer */}
        <section id="apply" className="px-3 pb-3">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-24">
            <Image
              src="/amp-glow.jpg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="hero-backdrop absolute inset-0 opacity-[0.92]" aria-hidden />
            <div className="relative mx-auto max-w-xl">
              <Reveal>
                <h2 className="text-center text-4xl text-cream md:text-5xl">
                  Apply to the <em className="font-display italic text-peach">founding room.</em>
                </h2>
              </Reveal>
              <Reveal delay={1}>
                <p className="mt-5 text-center text-white/75">
                  Tell us where your playing is and name one change you can prove in
                  30 days. No payment is taken here.
                </p>
              </Reveal>
              <Reveal delay={2}>
                <div className="mt-10">
                  <ApplyForm />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      {/* The site-wide footer, built from lib/site.ts: it links every tool and
          every guide, so the homepage reaches every page on the site. */}
      <SiteFooter />
    </>
  );
}
