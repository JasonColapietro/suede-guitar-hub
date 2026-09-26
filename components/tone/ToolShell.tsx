import type { ReactNode } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import GuideShelf from "@/components/tone/GuideShelf";
import { breadcrumbList, crumbTrail } from "@/lib/breadcrumbs";
import { SITE_URL } from "@/lib/site";
import { fieldGuide } from "@/lib/tone/field-guides";
import { TONE_LESSONS, toneHref } from "@/lib/tone/course";

const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";

export type ToolShellProps = {
  href: string;
  name: string;
  kicker: string;
  headline: ReactNode;
  intro: string;
  description: string;
  features: readonly string[];
  steps: readonly { title: string; body: string }[];
  lessons: readonly string[];
  guide: string;
  children: ReactNode;
};

/** The frame every tone tool shares: hero, the tool, how to use it, where to go next. */
export default function ToolShell(props: ToolShellProps) {
  const canonical = `${SITE_URL}${props.href}`;
  const crumbs = crumbTrail(props.name, canonical, { name: "Tools", href: "/tools" });
  const lessons = props.lessons.flatMap(slug => TONE_LESSONS.filter(lesson => lesson.slug === slug));
  const guide = fieldGuide(props.guide);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication", "@id": `${canonical}#tool`, name: props.name, url: canonical, description: props.description,
        applicationCategory: "EducationalApplication", applicationSubCategory: "Guitar practice tool", operatingSystem: "Web",
        browserRequirements: "Requires JavaScript. No account, and no data is uploaded.", isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: props.features,
        isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": SUEDE_ORG_ID }, author: { "@id": JASON_PERSON_ID },
      },
      breadcrumbList(canonical, crumbs),
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <Breadcrumbs crumbs={crumbs} />
      <main>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-16 text-center text-cream md:py-20">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">{props.kicker}</span>
            <h1 className="mx-auto mt-7 max-w-4xl text-4xl leading-tight md:text-6xl">{props.headline}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80">{props.intro}</p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-3 py-12 sm:px-6 md:py-16">{props.children}</section>
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="text-3xl text-indigo-deep md:text-4xl">How to get the most from it</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {props.steps.map((step, i) => (
              <li key={step.title} className="rounded-3xl bg-cream-soft p-7 ring-1 ring-ink/5">
                <span className="text-sm font-semibold uppercase tracking-widest text-violet">Step {i + 1}</span>
                <h3 className="mt-2 font-display text-xl text-indigo-deep">{step.title}</h3>
                <p className="mt-2 text-ink/70">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-ink/70">Free, no account. Everything runs in your browser and nothing you load or play is uploaded.</p>
        </section>
        {(lessons.length > 0 || guide) && (
          <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 md:grid-cols-[1fr_16rem] md:items-center">
            <div>
              <h2 className="text-3xl text-indigo-deep">Learn the why</h2>
              <ul className="mt-6 grid gap-3">
                {lessons.map(lesson => (
                  <li key={lesson.slug}>
                    <Link href={toneHref(lesson.slug)} className="block rounded-2xl bg-white p-5 ring-1 ring-ink/5 transition hover:ring-violet">
                      <span className="font-display text-lg text-indigo-deep">{lesson.title}</span>
                      <span className="mt-1 block text-sm text-ink/70">{lesson.hook}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {guide && <GuideShelf guides={[guide]} />}
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
