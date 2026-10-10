import type { Metadata } from "next";
import Link from "next/link";
import { allLessons, curricula } from "@/lib/learning/curriculum";
import { isLessonReady } from "@/lib/learning/access";
import { defaultRoutineSeconds } from "@/lib/learning/routine";
import { DRILLS, SKILL_AREAS } from "@/lib/advanced/drills";
import { APP_STORE, LIFETIME, OG_IMAGE, SITE_URL, spellOut } from "@/lib/site";
import styles from "@/components/learning/Learning.module.css";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import { keywordsFor } from "@/lib/keywords";

const CANONICAL = `${SITE_URL}/learn`;

// Stage lessons and popular-song companions are different kinds of lesson,
// so the page counts them separately instead of adding them into one total.
const GUITAR_LESSONS = allLessons("guitar");
const STAGE_LESSONS = GUITAR_LESSONS.filter(entry => entry.level.stage).length;
const SONG_COMPANIONS = GUITAR_LESSONS.length - STAGE_LESSONS;
const STAGES = curricula.guitar.levels.filter(level => level.stage);

const TITLE = "Learn Guitar: Lesson Path, Free Routine & Advanced Lab | GuitarHub";
const DESCRIPTION =
  `The ${STAGE_LESSONS}-lesson GuitarHub guitar curriculum in ${spellOut(STAGES.length)} stages with ${LIFETIME.display} lifetime access, plus the free A-to-D chord routine, the free Advanced Lab and voice lessons on Suede Sing.`;

/**
 * The `openGraph` and `twitter` blocks are the point of this object, not
 * decoration. Without them Next resolves the root layout's, so a share of this
 * page previewed as the home page: same title, same description, same card.
 *
 * `images` is required alongside them. A page-level `openGraph` key replaces
 * the layout's resolved object wholesale, taking the file-convention card with
 * it, so a block without `images` ships no `og:image` at all. See OG_IMAGE in
 * lib/site.ts.
 */
export const metadata: Metadata = {
  keywords: keywordsFor("/learn"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const FREE_PATHS = [
  {
    eyebrow: "Free · daily practice",
    title: "The A-to-D chord routine",
    body: `Seven timed blocks, ${defaultRoutineSeconds / 60} minutes by default, for the first chord change most players learn: tune, check A and D string by string, practice the silent anchor move, count changes starting from each chord and finish on two-chord songs. Edit any block to fit the time you have; your history stays in this browser.`,
    href: "/learn/guitar/routine",
    cta: "Start today's routine",
  },
  {
    eyebrow: "Free · experienced players",
    title: "The Advanced Lab",
    body: `${DRILLS.length} scored drills across ${spellOut(SKILL_AREAS.length)} skill areas, from modes and arpeggios to bends, legato and rhythm feels. Practice mode waits for every note; Play mode scores the whole pass and tells you when to raise the tempo.`,
    href: "/advanced",
    cta: "Open the Advanced Lab",
  },
  {
    eyebrow: "Free · any goal",
    title: "The 30-day plan",
    body: "Name one thing you can't play yet and get four weeks of focused practice around it, with a recording on day 1 and day 30 so you can hear what changed.",
    href: "/breakthrough",
    cta: "Build your 30-day plan",
  },
] as const;

export default function LearnPage() {
  const hasOutlines = (["guitar", "voice"] as const).some(track => allLessons(track).some(entry => !isLessonReady(track, entry.lesson.id)));
  return <>
    <div className={styles.hero}>
      <h1>Learn guitar in order, and practice it every day.</h1>
      <p>GuitarHub teaches guitar as a path: {STAGE_LESSONS} guided lessons in {spellOut(STAGES.length)} stages, each one building on the last, with free tools for the days between lessons. Start with the curriculum if you are new, run the free routine on any day you pick up the guitar, and move to the Advanced Lab when the fundamentals are under your fingers. Not sure which fits? <Link href="/start">Find your level in five questions</Link>.</p>
    </div>

    <section aria-labelledby="curriculum-title" className="rounded-[1.75rem] bg-indigo-deep p-6 text-cream sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-pale">Guitar curriculum · {LIFETIME.display} lifetime access</p>
      <h2 id="curriculum-title" className="mt-3 font-display text-3xl leading-tight sm:text-4xl">From your first clean note to songs you can play for anyone.</h2>
      <p className={`${styles.small} mt-3 text-white/80`}>{STAGE_LESSONS} lessons in {spellOut(STAGES.length)} stages · {SONG_COMPANIONS} song companions · Lifetime access {LIFETIME.oneTime}</p>
      <ol className="mt-8 grid gap-3 sm:grid-cols-2">
        {STAGES.map(stage => <li key={stage.id} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-pale">Stage {stage.stage}</span>
          <span className="mt-1 block font-display text-xl text-cream">{stage.name}</span>
          <span className="mt-1 block text-sm leading-relaxed text-white/75">{stage.subtitle}.</span>
        </li>)}
      </ol>
      <p className="mt-8 max-w-3xl leading-relaxed text-white/85">Every stage pairs written instruction with practice you can check: chord diagrams, timed change counts, studies to play through and, where a lesson has one, a microphone exercise that listens to your attempt. The {SONG_COMPANIONS} song companions sit beside the stages with original studies for recognizable songs. Start the first module free in <a href={APP_STORE.ios} className="underline underline-offset-4">{APP_STORE.name}</a> for iPhone, then unlock every lesson with lifetime access for {LIFETIME.oneTime}.</p>
      <div className={styles.actions}>
        <a className={styles.primary} href={APP_STORE.ios}>{LIFETIME.cta}</a>
        <Link className="inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 font-semibold text-cream ring-1 ring-white/40 hover:bg-white/10" href="/learn/guitar">Explore the guitar path</Link>
      </div>
    </section>

    <section aria-labelledby="free-title" className="mt-16">
      <h2 id="free-title" className="font-display text-3xl text-indigo-deep sm:text-4xl">Free to use today</h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink/70">No account and no purchase: each of these runs in your browser and keeps its history on your device.</p>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {FREE_PATHS.map(path => <li key={path.href} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink/10">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet">{path.eyebrow}</span>
          <h3 className="mt-2 font-display text-xl text-indigo-deep">{path.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">{path.body}</p>
          <Link href={path.href} className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-semibold text-violet underline-offset-4 hover:underline">{path.cta} <span aria-hidden className="ml-1">→</span></Link>
        </li>)}
      </ul>
      <div className={styles.actions}><Link className={styles.secondary} href="/practice">Open the tuner and metronome</Link><Link className={styles.secondary} href="/tools">See every practice tool</Link></div>
    </section>

    <section aria-labelledby="voice-title" className="mt-16 rounded-[1.75rem] bg-cream-soft p-6 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">Voice</p>
      <h2 id="voice-title" className="mt-2 font-display text-3xl text-indigo-deep sm:text-4xl">Singing lives on Suede Sing.</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-ink/75">The voice path, from an easy breath to a steady tone, comfortable pitch matching and your first song, is on Suede Sing, where all seven stages are free. Two pages stay here for players who started voice on GuitarHub: your <Link href="/learn/voice/recordings" className="font-semibold underline underline-offset-4">saved voice takes</Link>, which this browser kept and never uploaded, and the lifetime <Link href="/learn/voice/materials" className="font-semibold underline underline-offset-4">voice practice library</Link> of studies and readings.</p>
      <div className={styles.actions}><a className={styles.primary} href={SING_VOICE_COURSE}>Voice lessons on Suede Sing</a><Link className={styles.secondary} href="/learn/voice/recordings">Play your saved takes</Link></div>
    </section>

    <section className={`${styles.hero} mt-16`}><h2 className="font-display text-3xl mb-4">Learn it. Practice it. Try it through.</h2><p>{hasOutlines ? "Written lessons and curriculum outlines give each session a focus." : "Written lessons give each session a focus."} Where a microphone exercise is available, you can practice first and then play a measured attempt. For other lessons, you record your own assessment. A completed session records that you practiced, and a measured attempt shows what you can play. Web progress is saved in this browser. <Link href="/faq#how-to-get-lifetime-access">How lifetime access works</Link></p></section>
  </>;
}
