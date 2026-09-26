import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import Reveal from "@/components/Reveal";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import GuideShelf from "@/components/tone/GuideShelf";
import ToneArt from "@/components/tone/ToneArt";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { TONE_LESSONS, toneHref } from "@/lib/tone/course";

const CANONICAL = `${SITE_URL}/tone`;
const CRUMBS = crumbTrail("Tone", CANONICAL);
const TITLE = "Guitar Tone Course: Pickups, Amps, Pedals and Signal Chain | GuitarHub";
const DESCRIPTION = "A free guitar tone course: your hands, pickups, amps, every pedal family, pedal order, power and noise, EQ, recording, and six tone recipes you can hear.";

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
};

const TOOLS = [
  { href: "/pedal-lab", title: "Pedal Lab", body: "Six pedals, an amp and a speaker cab. Reorder the chain and hear what changes." },
  { href: "/eq-ear-trainer", title: "EQ Ear Trainer", body: "Name the boosted band. The fastest way to learn the guitar frequency map." },
  { href: "/slow-down", title: "Slow-Downer and Looper", body: "Half speed, same pitch, loop the hard bar, climb back to tempo." },
  { href: "/fretboard", title: "Fretboard Explorer", body: "Every scale, mode and arpeggio on the whole neck, with a note quiz." },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Course", "@id": `${CANONICAL}#course`, name: "The GuitarHub Tone Course", url: CANONICAL, description: DESCRIPTION,
      provider: { "@id": "https://suedeai.ai/#organization" }, isAccessibleForFree: true, inLanguage: "en-US",
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${TONE_LESSONS.reduce((sum, l) => sum + l.minutes, 0)}M` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", category: "Free" },
      hasPart: TONE_LESSONS.map(lesson => ({ "@type": "LearningResource", name: lesson.title, url: `${SITE_URL}${toneHref(lesson.slug)}` })),
    },
    breadcrumbList(CANONICAL, CRUMBS),
  ],
};

export default function TonePage() {
  const [first, ...rest] = TONE_LESSONS;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <SiteNav />
      <Breadcrumbs crumbs={CRUMBS} />
      <main>
        <section className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-[2rem] text-cream">
            <ToneArt art="amp" className="absolute inset-0 h-full w-full opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120828] via-[#120828]/70 to-transparent" aria-hidden />
            <div className="relative px-6 pb-16 pt-40 text-center md:pb-20 md:pt-56">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft backdrop-blur">The Tone course · free</span>
              <h1 className="mx-auto mt-7 max-w-4xl text-5xl leading-tight md:text-6xl">Stop chasing tone.{" "}<em className="font-display italic text-peach">Understand it.</em></h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
                From the pick to the speaker: what every part of your rig does, why the order matters, and how to dial in a sound on purpose. {TONE_LESSONS.length} lessons, four tools you can hear, four free PDF guides.
              </p>
              <Link href={toneHref(first.slug)} className="mt-9 inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105">
                Start with lesson 1 <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20" aria-labelledby="lessons-title">
          <Reveal>
            <h2 id="lessons-title" className="text-center text-4xl text-indigo-deep md:text-5xl">The lessons</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-ink/70">In order, from the part you control for free to the part that costs money. Skip to whatever is bugging you.</p>
          </Reveal>
          <Link href={toneHref(first.slug)} className="group mt-12 grid overflow-hidden rounded-[2rem] bg-white ring-1 ring-ink/5 transition hover:shadow-lg md:grid-cols-2">
            <div className="aspect-[16/9] overflow-hidden md:aspect-auto"><ToneArt art={first.art} className="h-full w-full transition duration-700 group-hover:scale-105" /></div>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet">Lesson {first.number} · {first.minutes} min</p>
              <h3 className="mt-3 font-display text-3xl text-indigo-deep">{first.title}</h3>
              <p className="mt-3 text-lg text-ink/70">{first.hook}</p>
              <span className="mt-6 inline-block font-semibold text-violet">Start here <span aria-hidden>→</span></span>
            </div>
          </Link>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {rest.map((lesson, i) => (
              <li key={lesson.slug}>
                <Reveal delay={(i % 3) as 0 | 1 | 2}>
                  <Link href={toneHref(lesson.slug)} className="group block h-full overflow-hidden rounded-3xl bg-white ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-md">
                    <div className="aspect-[16/9] overflow-hidden"><ToneArt art={lesson.art} className="h-full w-full transition duration-700 group-hover:scale-105" /></div>
                    <div className="p-6">
                      <p className="text-xs font-semibold uppercase tracking-widest text-violet">Lesson {lesson.number} · {lesson.minutes} min</p>
                      <h3 className="mt-2 font-display text-xl leading-snug text-indigo-deep">{lesson.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/70">{lesson.hook}</p>
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-cream-soft px-6 py-20" aria-labelledby="tools-title">
          <div className="mx-auto max-w-6xl">
            <h2 id="tools-title" className="text-center text-4xl text-indigo-deep md:text-5xl">Hear it, don&apos;t just read it</h2>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TOOLS.map(tool => (
                <li key={tool.href}>
                  <Link href={tool.href} className="flex h-full flex-col rounded-3xl bg-white p-7 ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-md">
                    <h3 className="font-display text-xl text-indigo-deep">{tool.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">{tool.body}</p>
                    <span className="mt-auto pt-5 text-sm font-semibold text-violet">Open it <span aria-hidden>→</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="field-guides" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24" aria-labelledby="guides-title">
          <h2 id="guides-title" className="text-center text-4xl text-indigo-deep md:text-5xl">Free field guides</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-ink/70">Printable PDFs to keep next to the amp. No email and no account: click a book and it downloads.</p>
          <div className="mt-14"><GuideShelf /></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
