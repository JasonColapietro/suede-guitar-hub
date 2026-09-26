import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import BookCover from "@/components/tone/BookCover";
import ToneArt from "@/components/tone/ToneArt";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { TONE_LESSONS, toneHref, toneLesson } from "@/lib/tone/course";
import { fieldGuide } from "@/lib/tone/field-guides";

type Params = { slug: string };

export function generateStaticParams() {
  return [
    { slug: "tone-is-in-your-hands" }, { slug: "pickups" }, { slug: "amps" },
    { slug: "pedals" }, { slug: "signal-chain" }, { slug: "power-and-noise" },
    { slug: "eq-and-the-mix" }, { slug: "recording-guitar" }, { slug: "tone-recipes" },
  ];
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const lesson = toneLesson((await params).slug);
  if (!lesson) return {};
  const url = `${SITE_URL}${toneHref(lesson.slug)}`;
  const title = `${lesson.title} | GuitarHub Tone Course`;
  return {
    title, description: lesson.description, alternates: { canonical: url },
    authors: [{ name: "Jason Colapietro" }],
    openGraph: { title, description: lesson.description, url, siteName: "GuitarHub", type: "article", images: [OG_IMAGE] },
  };
}

export default async function ToneLessonPage({ params }: { params: Promise<Params> }) {
  const lesson = toneLesson((await params).slug);
  if (!lesson) notFound();
  const url = `${SITE_URL}${toneHref(lesson.slug)}`;
  const CRUMBS = crumbTrail(lesson.title, url, { name: "Tone", href: "/tone" });
  const index = TONE_LESSONS.findIndex(item => item.slug === lesson.slug);
  const previous = TONE_LESSONS[index - 1], next = TONE_LESSONS[index + 1];
  const guide = fieldGuide(lesson.guide);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article", "@id": `${url}#article`, headline: lesson.title, description: lesson.description, url,
        image: OG_IMAGE.url, dateModified: lesson.lastModified, datePublished: lesson.lastModified, inLanguage: "en-US",
        author: { "@id": "https://suedeai.ai/founder#person" }, publisher: { "@id": "https://suedeai.ai/#organization" },
        isPartOf: { "@id": `${SITE_URL}/tone#course` }, timeRequired: `PT${lesson.minutes}M`,
      },
      breadcrumbList(url, CRUMBS),
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <Breadcrumbs crumbs={CRUMBS} />
      <main>
        <header className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-[2rem] text-cream">
            <div className="absolute inset-0 bg-[#120828]" aria-hidden />
            <ToneArt art={lesson.art} className="absolute inset-x-0 top-0 h-[68%] w-full md:h-[72%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120828] from-35% via-[#120828]/70 via-55% to-transparent to-80%" aria-hidden />
            <div className="relative mx-auto max-w-4xl px-6 pb-14 pt-56 md:pb-16 md:pt-[22rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">Tone course · Lesson {lesson.number} of {TONE_LESSONS.length} · {lesson.minutes} min read</p>
              <h1 className="mt-4 text-4xl leading-tight md:text-6xl">{lesson.title}</h1>
              <p className="mt-5 max-w-2xl text-lg text-peach md:text-xl">{lesson.hook}</p>
            </div>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-6 py-14">
          <p className="text-xl leading-relaxed text-ink/80">{lesson.intro}</p>
          <nav aria-label="In this lesson" className="mt-8 rounded-3xl bg-cream-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">In this lesson</p>
            <ol className="mt-3 grid gap-1 text-indigo-deep">
              {lesson.sections.map((section, i) => <li key={section.heading}><a href={`#s${i + 1}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{i + 1}. {section.heading}</a></li>)}
            </ol>
          </nav>

          {lesson.sections.map((section, i) => (
            <section key={section.heading} id={`s${i + 1}`} className="mt-12 scroll-mt-24">
              <h2 className="text-3xl leading-snug text-indigo-deep">{section.heading}</h2>
              {section.paragraphs.map(paragraph => <p key={paragraph.slice(0, 40)} className="mt-4 text-lg leading-relaxed text-ink/80">{paragraph}</p>)}
              {section.list && <ul className="mt-5 grid gap-2">{section.list.map(item => <li key={item} className="flex gap-3 text-lg leading-relaxed text-ink/80"><span aria-hidden className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-violet" />{item}</li>)}</ul>}
            </section>
          ))}

          <aside className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-2" aria-label="Myth and truth">
            <div className="bg-white p-7"><p className="text-xs font-semibold uppercase tracking-widest text-[#b33a2b]">The myth</p><p className="mt-3 font-display text-xl text-indigo-deep">{lesson.myth.myth}</p></div>
            <div className="bg-white p-7"><p className="text-xs font-semibold uppercase tracking-widest text-[#2d7a3e]">What is actually true</p><p className="mt-3 text-ink/80">{lesson.myth.truth}</p></div>
          </aside>

          <section className="mt-10 rounded-3xl hero-backdrop p-8 text-cream">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-soft">Try it now</p>
            <h2 className="mt-2 font-display text-2xl">{lesson.tryIt.label}</h2>
            <p className="mt-2 text-white/80">{lesson.tryIt.body}</p>
            <Link href={lesson.tryIt.href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-6 py-3 font-semibold text-indigo-deep transition hover:brightness-105">Open it <span aria-hidden>→</span></Link>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl text-indigo-deep">Remember</h2>
            <ul className="mt-4 grid gap-2">{lesson.takeaways.map(item => <li key={item} className="flex gap-3 text-lg text-ink/80"><span aria-hidden className="text-violet">✓</span>{item}</li>)}</ul>
          </section>
        </article>

        {guide && (
          <section className="mx-auto mb-16 grid max-w-4xl items-center gap-8 rounded-[2rem] bg-cream-soft px-6 py-10 md:grid-cols-[14rem_1fr] md:px-10">
            <a href={guide.file} download aria-label={`Download the free PDF: ${guide.title}`}><BookCover guide={guide} size="sm" /></a>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet">Free PDF to go with this lesson</p>
              <h2 className="mt-2 font-display text-3xl text-indigo-deep">{guide.title}</h2>
              <p className="mt-2 text-ink/70">{guide.subtitle}.</p>
              <ul className="mt-4 grid gap-1 text-ink/80">{guide.inside.map(item => <li key={item}>· {item}</li>)}</ul>
              <a href={guide.file} download className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-6 py-3 font-semibold text-cream transition hover:bg-indigo-mid">Download the free PDF <span aria-hidden>↓</span></a>
            </div>
          </section>
        )}

        <nav aria-label="More tone lessons" className="mx-auto flex max-w-4xl flex-wrap justify-between gap-4 px-6 pb-24">
          {previous ? <Link href={toneHref(previous.slug)} className="inline-flex min-h-11 items-center font-semibold text-violet">← {previous.title}</Link> : <Link href="/tone" className="inline-flex min-h-11 items-center font-semibold text-violet">← Tone course</Link>}
          {next ? <Link href={toneHref(next.slug)} className="inline-flex min-h-11 items-center font-semibold text-violet">{next.title} →</Link> : <Link href="/tone#field-guides" className="inline-flex min-h-11 items-center font-semibold text-violet">Get the free guides →</Link>}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
