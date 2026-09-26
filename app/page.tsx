import Image from "next/image";
import { FieldGuideShelf } from "@/components/FieldGuides";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import ApplyForm from "@/components/ApplyForm";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import LevelPicker from "@/components/LevelPicker";
import { DRILLS, SKILL_AREAS } from "@/lib/advanced/drills";
import { APP_STORE, STRUMLY, TOOLS, spellOut } from "@/lib/site";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";

/**
 * Written out from the registry, never typed. The heading below sat on a
 * hard-coded "Four tools." while `TOOLS` grew to six, which is the one kind of
 * claim this site cannot afford to get wrong on its own front page.
 */
const TOOL_COUNT = (() => {
  const word = spellOut(TOOLS.length);
  return word.charAt(0).toUpperCase() + word.slice(1);
})();



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
    a: "No native GuitarHub forum is being claimed. Suede AI Social carries the wider conversation; the founding practice crew will be formed after applications are reviewed.",
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
      <SiteNav />

      <main id="top">
        {/* Hero */}
        <section className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-24 text-center text-cream md:py-32">
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
            <Reveal>
              <span className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-violet-soft">
                Beginner to advanced
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mx-auto mt-8 max-w-3xl text-5xl leading-tight text-cream md:text-6xl">
                From your first chord{" "}
                <em className="font-display italic text-peach">to playing what you hear.</em>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
                Lessons in order, a coach that listens through your microphone,
                and scored drills for players who are already good. Tell us where you are.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mx-auto mt-10 max-w-4xl">
                <LevelPicker tone="dark" />
              </div>
              <p className="mt-6 text-sm text-white/80">
                Stages 1 and 2 and the Advanced Lab are free. No account needed.{" "}
                <a href={SING_VOICE_COURSE} className="font-semibold text-peach underline-offset-4 hover:underline">Voice lessons on Suede Sing</a>
                {" · "}
                <a href={APP_STORE.ios} className="font-semibold text-peach underline-offset-4 hover:underline">GuitarHub for iPhone <span aria-hidden>↗</span></a>
              </p>
            </Reveal>
            </div>
          </div>
        </section>

        {/* Advanced Lab */}
        <section id="advanced" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet">Advanced Lab · free</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-center text-4xl leading-snug text-indigo-deep md:text-5xl">
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

        <FieldGuideShelf
          title="Grab a field guide"
          intro="Every practice guide as a free PDF, from the method to clean tone. Pick the problem you have this week and keep the guide on your phone or the music stand."
          hrefs={["/guitar-practice-plateau", "/why-cant-i-play-guitar-fast", "/how-to-memorize-songs-on-guitar", "/resources/how-to-practice-clean-guitar-tone", "/guitar-practice-routine-intermediate"]}
          moreHref="/guides#field-guides"
        />

        {/* Founding room program */}
        <section id="program" className="mx-auto max-w-6xl px-6 pb-24">
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
              Essays and breakdowns on how skilled players actually get built,
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
                    {/* alt="" is deliberate. The card thumbnail is a mood
                        photograph inside a link that already carries the
                        kicker, title and blurb below, so alt text here would
                        double the link name rather than describe anything the
                        reader cannot already hear. */}
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
            {/* alt="" is deliberate, same reading as the hero: an amp in low
                light, run under `hero-backdrop` at 0.92 opacity behind the
                closing copy. */}
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
