import Image from "next/image";
import Reveal from "@/components/Reveal";
import ApplyForm from "@/components/ApplyForm";

const NAV_LINKS = [
  { href: "#program", label: "Program" },
  { href: "#mentors", label: "Mentors" },
  { href: "#results", label: "Results" },
  { href: "#insights", label: "Insights" },
  { href: "#tuition", label: "Tuition" },
] as const;

const PILLARS = [
  {
    title: "A curriculum with a spine",
    body: "Technique, fretboard fluency, rhythm, and repertoire are sequenced so each week builds on the last — no more grab-bag lessons that never add up.",
  },
  {
    title: "Feedback on your actual playing",
    body: "You submit real practice clips and get specific, actionable notes on them. Progress comes from correction, not consumption.",
  },
  {
    title: "Practice software that compounds",
    body: "Suede Labs tooling tracks what you drill and resurfaces the right material at the right time, so practice minutes stop leaking.",
  },
] as const;

const PHASES = [
  {
    phase: "Phase 1",
    title: "Foundations that hold",
    body: "Audit and rebuild your technique, timing, and fretboard map so everything after sits on solid ground.",
  },
  {
    phase: "Phase 2",
    title: "Vocabulary and control",
    body: "Chord logic, scale fluency, and phrasing drills tied to the songs you actually want to play.",
  },
  {
    phase: "Phase 3",
    title: "Real repertoire, real time",
    body: "Full pieces performed end to end, recorded, reviewed, and refined until they hold up under pressure.",
  },
  {
    phase: "Phase 4",
    title: "Your sound",
    body: "Improvisation, writing, and tone work that turn the skills into a voice that's recognizably yours.",
  },
] as const;

const MENTOR_ROLES = [
  {
    role: "Lead curriculum mentor",
    focus: "Sequencing, technique rebuilds, and week-by-week practice design.",
  },
  {
    role: "Session-player mentor",
    focus: "Groove, feel, and the habits that make playing sit right in a band.",
  },
  {
    role: "Theory & fretboard mentor",
    focus: "Making the neck legible — chord logic and scale fluency without the jargon.",
  },
  {
    role: "Performance mentor",
    focus: "Recording, stage-readiness, and playing clean under pressure.",
  },
] as const;

const FAQS = [
  {
    q: "Who is GuitarHub for?",
    a: "Committed players — from advanced beginners to intermediates stuck on a plateau — who want structure and accountability rather than another pile of video courses.",
  },
  {
    q: "How much time does it take?",
    a: "Plan on 30–60 minutes of focused practice most days. The program is built around consistent, well-aimed practice rather than marathon sessions.",
  },
  {
    q: "Is it live or self-paced?",
    a: "Both: a structured curriculum you move through on your schedule, with regular feedback on your submitted playing and live check-ins along the way.",
  },
  {
    q: "What if it's not for me?",
    a: "Apply and tell us where you are. If we don't think the program fits your goals, we'll say so straight and point you somewhere better.",
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
      Apply Now <span aria-hidden>→</span>
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink/5 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="font-display text-2xl font-semibold tracking-wide text-indigo-deep">
            GUITARHUB
          </a>
          <nav className="hidden gap-8 text-sm font-medium text-ink/70 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-indigo-deep">
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
                Guitar Accelerator
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="mx-auto mt-8 max-w-3xl text-5xl leading-tight text-cream md:text-6xl">
                A structured path to{" "}
                <em className="font-display italic text-peach">real guitar mastery.</em>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
                Stop collecting lessons and start compounding. GuitarHub pairs a
                sequenced curriculum with mentor feedback on your actual playing and
                practice software that keeps every minute pointed at progress.
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <ApplyButton variant="light" />
                <span className="rounded-full bg-white/10 px-6 py-3.5 text-sm text-white/80">
                  Built by Suede Labs · the team behind Strumly
                </span>
              </div>
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
              almost play a hundred things and fully play none. The missing piece was
              never talent or gear — it&apos;s structure, feedback, and a practice
              system that remembers what you&apos;re building.
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
                The program,{" "}
                <em className="font-display italic">phase by phase.</em>
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

        {/* Mentors — dark section */}
        <section id="mentors" className="px-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-24">
            <Reveal>
              <h2 className="text-center text-4xl text-cream md:text-5xl">
                Learn with mentors,{" "}
                <em className="font-display italic text-peach">not algorithms.</em>
              </h2>
            </Reveal>
            <Reveal delay={1}>
              <p className="mx-auto mt-5 max-w-2xl text-center text-white/75">
                Every application is reviewed by a working player. Mentor bios and
                introductions land here as the founding cohort assembles.
                {/* TODO-JASON: replace role cards with real mentor names, photos, and bios */}
              </p>
            </Reveal>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {MENTOR_ROLES.map((mentor, i) => (
                <Reveal key={mentor.role} delay={(i % 3) as 0 | 1 | 2}>
                  <div className="mentor-card-glow h-full rounded-3xl border border-white/10 p-7">
                    <div className="h-12 w-12 rounded-full bg-violet-soft/30" aria-hidden />
                    <h3 className="mt-5 font-display text-xl text-cream">{mentor.role}</h3>
                    <p className="mt-3 text-sm text-white/70">{mentor.focus}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Results */}
        <section id="results" className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-4xl text-indigo-deep md:text-5xl">
              Progress you can <em className="font-display italic">hear.</em>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">
              The output of this program isn&apos;t a certificate — it&apos;s
              recordings of you playing full pieces cleanly, a fretboard you can
              actually navigate, and a practice habit that no longer depends on
              motivation. Founding-cohort recordings will live here as they&apos;re
              made.
            </p>
          </Reveal>
        </section>

        {/* Insights */}
        <section id="insights" className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <div className="rounded-[2rem] bg-cream-soft px-8 py-16 text-center ring-1 ring-ink/5">
              <h2 className="text-3xl text-indigo-deep md:text-4xl">
                Insights from <em className="font-display italic">the practice room.</em>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-ink/70">
                Essays and breakdowns on how skilled players actually get built —
                publishing alongside the founding cohort.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Tuition */}
        <section id="tuition" className="mx-auto max-w-4xl px-6 pb-24 text-center">
          <Reveal>
            <h2 className="text-4xl text-indigo-deep md:text-5xl">Tuition</h2>
          </Reveal>
          <Reveal delay={1}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70">
              Founding-cohort tuition is set when your application is reviewed —
              we&apos;d rather talk to you than post a number that doesn&apos;t fit
              your situation.
              {/* TODO-JASON: replace with real tuition/pricing once set */}
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
                  Apply to <em className="font-display italic text-peach">GuitarHub.</em>
                </h2>
              </Reveal>
              <Reveal delay={1}>
                <p className="mt-5 text-center text-white/75">
                  Tell us where your playing is and where you want it to go. Every
                  application gets a straight, personal answer.
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
            className="underline hover:text-indigo-deep"
          >
            Jason Colapietro
          </a>{" "}
          ·{" "}
          <a href="mailto:info@suedeai.ai" className="underline hover:text-indigo-deep">
            info@suedeai.ai
          </a>
        </span>
        <span>© {new Date().getFullYear()} Suede Labs AI</span>
      </footer>
    </>
  );
}
