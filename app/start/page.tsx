import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import LevelCheck from "@/components/LevelCheck";
import { DRILLS, SKILL_AREAS } from "@/lib/advanced/drills";
import { curricula } from "@/lib/learning/curriculum";
import { PLAYER_LEVELS } from "@/lib/levels";
import { PLACEMENT_QUESTIONS } from "@/lib/placement";
import { FREE_MODULES } from "@/lib/learning/free-module";
import { LIFETIME, OFFER, OG_IMAGE, SITE_URL, spellOut } from "@/lib/site";
import { FUNNEL_PRIMARY } from "@/lib/funnel";
import { keywordsFor } from "@/lib/keywords";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { webPageNode } from "@/lib/page-schema";

const url = `${SITE_URL}/start`;
const title = "Find Your Guitar Level in Five Questions | GuitarHub";
const description =
  "Five quick questions about chords, changes, barre chords and soloing pick your free guitar module, D and A, Box One or First Solo, and your first step.";
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

/** Each free module's name, read off the curriculum for the placement's start button. */
const FREE_MODULE_NAMES: Record<string, string> = Object.fromEntries(
  curricula.guitar.levels
    .flatMap((level) => level.modules)
    .filter((module) => Object.values(FREE_MODULES).includes(module.id))
    .map((module) => [module.id, module.name]),
);

const CRUMBS = crumbTrail("Find your level", "/start");
const PAGE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [webPageNode({ canonical: url, name: title, description, crumbs: CRUMBS }), breadcrumbList(url, CRUMBS)],
};

export default function StartPage() {
  const [beginner, intermediate, advanced] = PLAYER_LEVELS;
  const destinations = [
    { level: beginner, stages: stagesFor(beginner.stages[0], beginner.stages[1]) },
    { level: intermediate, stages: stagesFor(intermediate.stages[0], intermediate.stages[1]) },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_JSON_LD) }} />
      <SiteNav />
      <Breadcrumbs crumbs={CRUMBS} />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet">Find your level</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-indigo-deep sm:text-5xl">
          Find your guitar level in {QUESTION_WORD} questions.
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-indigo-deep">
          {OFFER.promise}
        </p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
          Answer for what your hands can do on an ordinary practice day. Your
          answers pick the free module that starts you on the 30-day path, D
          and A, Box One or First Solo, and the first thing to work on when
          you get there. Your result is saved in this browser so your
          free module stays yours.
        </p>

        <div className="mt-10">
          <LevelCheck moduleNames={FREE_MODULE_NAMES} />
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
                <p className="mt-1 text-sm font-semibold text-violet">
                  Free module: {FREE_MODULE_NAMES[FREE_MODULES[level.id]]}
                </p>
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
              <h3 className="font-display text-xl text-indigo-deep">Advanced players</h3>
              <p className="mt-1 text-sm font-semibold text-violet">
                Free module: {FREE_MODULE_NAMES[FREE_MODULES[advanced.id]]}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Lifetime access adds the Advanced Lab: {DRILLS.length} scored
                drills across {spellOut(SKILL_AREAS.length)} skill
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
            The placement picks one module, and it opens in your browser with
            no purchase. Every
            other lesson, the Advanced Lab and the{" "}
            <Link href="/learn/guitar/routine" className="font-semibold text-violet underline underline-offset-4">A-to-D chord routine</Link>{" "}
            unlock with lifetime access, {LIFETIME.oneTime} on guitarhub.org
            or in GuitarHub for iPhone. The tuner, metronome and the other{" "}
            <Link href="/tools" className="font-semibold text-violet underline underline-offset-4">free practice tools</Link>{" "}
            are yours to use any day.
          </p>
          <div className="mt-8">
            <Link
              href={FUNNEL_PRIMARY.magnet.href}
              data-funnel-primary
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
            >
              {FUNNEL_PRIMARY.magnet.label} <span aria-hidden>→</span>
            </Link>
          </div>
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
              Want the whole month mapped first?{" "}
              <Link href="/breakthrough" className="font-semibold text-violet underline underline-offset-4">The free 30-day plan</Link>{" "}
              lays out four weeks from D and A to your first solo.
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
