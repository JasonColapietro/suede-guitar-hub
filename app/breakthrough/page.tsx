import type { Metadata } from "next";
import Link from "next/link";
import BreakthroughPlanner from "@/components/BreakthroughPlanner";

export const metadata: Metadata = {
  title: "Build Your 30-Day Guitar Plan | GuitarHub",
  description:
    "Choose one guitar breakthrough, get a four-week practice sequence, launch the right Strumly tools, and track evidence in your browser.",
  alternates: { canonical: "https://guitarhub.org/breakthrough" },
};

const LOOP = [
  ["Diagnose", "Start from an honest attempt, not a placement quiz you can game."],
  ["Prescribe", "One finish line and one weekly path replace the lesson pile."],
  ["Practice", "Launch the exact Strumly tool, song, or coach session the week needs."],
  ["Prove", "End each week with a recording and a self-diagnosis, not watch time."],
  ["Correct", "Founding-room members receive one highest-leverage correction and next action."],
  ["Share", "Progress proof is learner-controlled; private corrections stay private."],
] as const;

export default function BreakthroughPage() {
  return (
    <main>
      <header className="border-b border-ink/10 bg-cream/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex min-h-11 items-center font-display text-2xl font-semibold tracking-wide text-indigo-deep">
            GUITARHUB
          </Link>
          <Link href="/#apply" className="inline-flex min-h-11 items-center rounded-full bg-indigo-deep px-5 py-2.5 text-sm font-semibold text-cream">
            Founding room
          </Link>
        </div>
      </header>

      <section className="px-3 pt-3">
        <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
          <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
            The Breakthrough Room
          </span>
          <h1 className="mx-auto mt-7 max-w-4xl text-5xl leading-tight md:text-6xl">
            Stop browsing. <em className="font-display italic text-peach">Prove one change.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            Turn one guitar goal into four weeks of practice, evidence, correction, and the next right move. The planner is free and stays in your browser.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <BreakthroughPlanner />
      </section>

      <section className="bg-cream-soft px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">The learning loop</p>
          <h2 className="mt-4 max-w-3xl text-4xl text-indigo-deep md:text-5xl">
            Community becomes useful when every conversation changes the next practice.
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-3">
            {LOOP.map(([title, body]) => (
              <article key={title} className="bg-cream p-7">
                <h3 className="font-display text-2xl text-indigo-deep">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-indigo-deep px-6 py-10 text-center text-sm text-white/60">
        GuitarHub orchestrates the practice. Strumly powers the tools. Suede Social carries the wider conversation.
      </footer>
    </main>
  );
}
