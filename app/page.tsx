import Image from "next/image";
import Reveal from "@/components/Reveal";
import ApplyForm from "@/components/ApplyForm";

const NAV_LINKS = [
  { href: "#program", label: "Method" },
  { href: "/breakthrough", label: "Build a plan" },
  { href: "#evidence", label: "Evidence" },
  { href: "#apply", label: "Founding room" },
] as const;

const PILLARS = [
  {
    title: "One finish line",
    body: "Choose one change you can prove in 30 days. GuitarHub removes everything that does not move that specific performance.",
  },
  {
    title: "Evidence every week",
    body: "A short recording, self-diagnosis, and visible practice action replace watch time, vague streaks, and hoping it sounds better.",
  },
  {
    title: "One next correction",
    body: "The founding room is designed to return the highest-leverage correction and the exact Strumly routine to run next.",
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

const INSIGHTS = [
  {
    title: "How to design a guitar practice routine",
    img: "/insight-1.jpg",
    href: "https://strumly.suedeai.ai/guides/designing-a-practice-routine",
  },
  {
    title: "How to learn guitar for beginners: a step-by-step path",
    img: "/insight-2.jpg",
    href: "https://strumly.suedeai.ai/guides/beginner-guitar-learning-path",
  },
  {
    title: "Signal chain topology: what actually goes where, and why",
    img: "/amp-glow.jpg",
    href: "https://strumly.suedeai.ai/guides/signal-chain-topology",
  },
] as const;

const SONG_LESSONS = [
  {
    song: "Purple Haze",
    href: "https://strumly.suedeai.ai/book/lessons/lesson-purple-haze",
  },
  {
    song: "Comfortably Numb",
    href: "https://strumly.suedeai.ai/book/lessons/lesson-comfortably-numb",
  },
  {
    song: "Pride and Joy",
    href: "https://strumly.suedeai.ai/book/lessons/lesson-pride-and-joy",
  },
  {
    song: "Smells Like Teen Spirit",
    href: "https://strumly.suedeai.ai/book/lessons/lesson-smells-like-teen-spirit",
  },
] as const;

const FAQS = [
  {
    q: "Who is GuitarHub for?",
    a: "Advanced beginners, intermediates, and returning players who already have lessons but need one measurable goal, a sequence, and accountability.",
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
    q: "Does GuitarHub upload my recordings?",
    a: "Not in this release. The public planner stores only your profile and checked actions in your browser. Any founding-room evidence workflow will be disclosed before you commit.",
  },
] as const;

function ApplyButton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const classes =
    variant === "dark"
      ? "bg-indigo-deep text-cream hover:bg-indigo-mid"
      : "bg-peach text-indigo-deep hover:brightness-105";
  return (
    <a
      href="#apply"
      className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold transition ${classes}`}
    >
      Apply to the room <span aria-hidden>→</span>
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink/5 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="inline-flex min-h-11 items-center font-display text-2xl font-semibold tracking-wide text-indigo-deep">
            GUITARHUB
          </a>
          <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="inline-flex min-h-11 items-center transition hover:text-indigo-deep">
                {link.label}
              </a>
            ))}
          </nav>
          <ApplyButton />
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
                30-Day Breakthrough Room
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mx-auto mt-8 max-w-3xl text-5xl leading-tight text-cream md:text-6xl">
                Stop collecting lessons.{" "}
                <em className="font-display italic text-peach">Prove one change.</em>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
                Choose one finish line. Practice the right thing. End every week with
                evidence and one next move instead of another saved video.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="/breakthrough"
                  className="inline-flex items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
                >
                  Build my 30-day plan <span aria-hidden>→</span>
                </a>
                <ApplyButton variant="light" />
                <span className="rounded-full bg-white/10 px-6 py-3.5 text-sm text-white/80">
                  Built by Suede Labs · the team behind Strumly
                </span>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <a
                href="/breakthrough"
                className="mx-auto mt-16 grid max-w-3xl gap-px overflow-hidden rounded-3xl bg-white/15 text-left ring-1 ring-white/20 sm:grid-cols-4"
              >
                {[
                  ["01", "Baseline"],
                  ["02", "Repair"],
                  ["03", "Pressure"],
                  ["04", "Proof"],
                ].map(([number, label]) => (
                  <span key={number} className="bg-indigo-deep/70 p-6">
                    <span className="text-xs font-semibold tracking-widest text-violet-soft">{number}</span>
                    <span className="mt-2 block font-display text-xl text-cream">{label}</span>
                  </span>
                ))}
              </a>
            </Reveal>
            </div>
          </div>
        </section>

        {/* Problem narrative */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-4xl leading-snug text-indigo-deep md:text-5xl">
              Most guitarists don&apos;t quit.{" "}
              <em className="font-display italic">They plateau.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">
              Years of tabs, videos, and scattered lessons produce players who can
              almost play a hundred things and fully play none. The missing piece is
              a closed loop: diagnose, prescribe, practice, prove, correct, repeat.
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
                One room. Four weeks.{" "}
                <em className="font-display italic">Evidence at every turn.</em>
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
                      Guide · Strumly
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
                href="https://strumly.suedeai.ai/guides"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
              >
                Browse all guides <span aria-hidden>→</span>
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
                  <summary className="cursor-pointer list-none font-semibold text-indigo-deep">
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

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-ink/50 md:flex-row">
        <span className="font-display text-lg text-indigo-deep">GUITARHUB</span>
        <span>
          A Suede Labs program by{" "}
          <a
            href="https://suedeai.ai/founder"
            className="inline-flex min-h-11 items-center underline hover:text-indigo-deep"
          >
            Jason Colapietro
          </a>{" "}
          ·{" "}
          <a href="mailto:info@suedeai.ai" className="inline-flex min-h-11 items-center underline hover:text-indigo-deep">
            info@suedeai.ai
          </a>
        </span>
        <span>© {new Date().getFullYear()} Suede Labs</span>
      </footer>
    </>
  );
}
