import Link from "next/link";
import Reveal from "@/components/Reveal";
import ToneArt from "@/components/tone/ToneArt";
import GuideShelf from "@/components/tone/GuideShelf";
import { TONE_LESSONS, toneHref } from "@/lib/tone/course";

/**
 * The hook section for the Tone course: illustrated lesson cards that lead
 * with the question a guitarist already has, then the free guide shelf.
 */
const FEATURED = ["eq-and-the-mix", "amps", "signal-chain", "pickups", "power-and-noise", "tone-recipes"];

export default function ToneTeaser({ withShelf = true }: { withShelf?: boolean }) {
  const lessons = FEATURED.flatMap(slug => TONE_LESSONS.filter(lesson => lesson.slug === slug));
  return (
    <section id="tone" className="px-3 pb-24">
      <div className="hero-backdrop rounded-[2rem] px-6 py-20 md:py-24">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">The Tone course · free</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-center text-4xl leading-snug text-cream md:text-5xl">
            Why does your guitar sound worse{" "}
            <em className="font-display italic text-peach">than the record?</em>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-white/75">
            Pickups, amps, pedals, pedal order, power, EQ and recording, in {TONE_LESSONS.length} short lessons. Each one ends with something to hear or try.
          </p>
        </Reveal>
        <ul className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, i) => (
            <li key={lesson.slug}>
              <Reveal delay={(i % 3) as 0 | 1 | 2}>
                <Link href={toneHref(lesson.slug)} className="group block h-full overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-peach/60">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <ToneArt art={lesson.art} className="h-full w-full transition duration-700 group-hover:scale-105" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-peach backdrop-blur">Lesson {lesson.number} · {lesson.minutes} min</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl leading-snug text-cream">{lesson.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">{lesson.hook}</p>
                    <span className="mt-4 inline-block text-sm font-semibold text-peach">Read the lesson <span aria-hidden>→</span></span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <Link href="/tone" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105">
            See the whole Tone course <span aria-hidden>→</span>
          </Link>
        </div>
        {withShelf && (
          <div className="mx-auto mt-20 max-w-6xl">
            <Reveal>
              <h3 className="text-center font-display text-3xl text-cream md:text-4xl">Free field guides. <em className="italic text-peach">Print them, pin them up.</em></h3>
              <p className="mx-auto mt-3 max-w-xl text-center text-white/75">No email, no account. Click a book and the PDF downloads.</p>
            </Reveal>
            <div className="mt-12"><GuideShelf dark /></div>
          </div>
        )}
      </div>
    </section>
  );
}
