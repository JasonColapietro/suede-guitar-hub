import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import LevelCheck from "@/components/LevelCheck";
import { DRILLS, SKILL_AREAS } from "@/lib/advanced/drills";
import { curricula } from "@/lib/learning/curriculum";
import { PLAYER_LEVELS } from "@/lib/levels";
import { PLACEMENT_QUESTIONS } from "@/lib/placement";
import { OG_IMAGE, SITE_URL, spellOut } from "@/lib/site";
import { keywordsFor } from "@/lib/keywords";

const url = `${SITE_URL}/start`;
const title = "Find Your Guitar Level in Five Questions | GuitarHub";
const description =
  "Five quick questions about chords, changes, barre chords and soloing place you at stage 1, stage 3 or the free Advanced Lab, with the first thing to practice there.";
export const metadata: Metadata = {
  keywords: keywordsFor("/start"),
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
};

/**
 * What each result covers, read off the curriculum rather than retyped, so the
 * stage names and their one-line summaries here are the ones on /learn/guitar.
 */
const STAGES = curricula.guitar.levels.filter((level) => level.stage);
const stagesFor = (from: number, to: number) =>
  STAGES.filter((level) => level.stage! >= from && level.stage! <= to);

const QUESTION_WORD = spellOut(PLACEMENT_QUESTIONS.length);

export default function StartPage() {
  const [beginner, intermediate, advanced] = PLAYER_LEVELS;
  const destinations = [
    { level: beginner, stages: stagesFor(beginner.stages[0], beginner.stages[1]) },
    { level: intermediate, stages: stagesFor(intermediate.stages[0], intermediate.stages[1]) },
  ];
  return (
    <>
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">Find your level</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-indigo-deep sm:text-5xl">
          {QUESTION_WORD.charAt(0).toUpperCase() + QUESTION_WORD.slice(1)} questions. One place to start.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
          Answer for what your hands can do on an ordinary practice day. Your
          answers point to one starting point, stage 1 of the lesson path,
          stage 3, or the free Advanced Lab, and the first thing to work on
          when you get there. Nothing you choose here is saved or sent.
        </p>

        <div className="mt-10">
          <LevelCheck />
        </div>

        <section aria-labelledby="destinations-title" className="mt-20">
          <h2 id="destinations-title" className="font-display text-3xl text-indigo-deep">
            Where each answer sends you
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {destinations.map(({ level, stages }) => (
              <div key={level.id} className="rounded-3xl bg-white p-6 ring-1 ring-ink/10">
                <h3 className="font-display text-xl text-indigo-deep">
                  Stages {level.stages[0]}–{level.stages[1]}
                </h3>
                <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink/70">
                  {stages.map((stage) => (
                    <li key={stage.id}>
                      <strong className="text-ink">Stage {stage.stage} · {stage.name}.</strong>{" "}
                      {stage.subtitle}.
                    </li>
                  ))}
                </ul>
                <Link href={level.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet underline-offset-4 hover:underline">
                  {level.cta} <span aria-hidden className="ml-1">→</span>
                </Link>
              </div>
            ))}
            <div className="rounded-3xl bg-white p-6 ring-1 ring-ink/10">
              <h3 className="font-display text-xl text-indigo-deep">Advanced Lab · free</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                {DRILLS.length} scored drills across {spellOut(SKILL_AREAS.length)} skill
                areas: {SKILL_AREAS.map((area) => area.name.toLowerCase()).join(", ")}.
                Each drill listens through your microphone, waits for every
                note in Practice mode and scores the whole pass in Play mode.
              </p>
              <Link href={advanced.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet underline-offset-4 hover:underline">
                {advanced.cta} <span aria-hidden className="ml-1">→</span>
              </Link>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink/70">
            The guided lessons in every stage unlock with lifetime access, a
            one-time purchase in GuitarHub for iPhone. The Advanced Lab, the{" "}
            <Link href="/learn/guitar/routine" className="font-semibold text-violet underline underline-offset-4">A-to-D chord routine</Link>{" "}
            and the <Link href="/tools" className="font-semibold text-violet underline underline-offset-4">practice tools</Link>{" "}
            are free.
          </p>
        </section>

        <section aria-labelledby="answering-title" className="mt-16 max-w-2xl">
          <h2 id="answering-title" className="font-display text-3xl text-indigo-deep">
            Getting an accurate answer
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 leading-relaxed text-ink/75">
            <li>
              Answer for a normal day, cold, without warming up on the thing
              you are being asked about. Your best take on a good night is not
              where your next lesson should start.
            </li>
            <li>
              Count &ldquo;on a good day&rdquo; as partly. A skill that works
              half the time still needs the lessons that make it automatic.
            </li>
            <li>
              Between two results, take the lower one. Starting low costs you
              a few quick sessions; starting high means practicing on top of a
              gap for weeks.
            </li>
            <li>
              Already know the one thing you want to fix? Skip placement and{" "}
              <Link href="/breakthrough" className="font-semibold text-violet underline underline-offset-4">build a 30-day plan around it</Link>.
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
