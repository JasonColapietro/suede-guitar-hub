import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonCheck } from "@/components/tone/LessonCheck";
import { TONE_LESSONS, getToneLesson, toneLessonHref, toneModule } from "@/lib/tone/course";
import { OG_IMAGE, SITE_URL, TOOLS } from "@/lib/site";
import learning from "@/components/learning/Learning.module.css";
import styles from "@/components/tone/Tone.module.css";

type Params = { lessonId: string };
export function generateStaticParams() { return TONE_LESSONS.map(lesson => ({ lessonId: lesson.id })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const lesson = getToneLesson((await params).lessonId);
  if (!lesson) return {};
  const url = `${SITE_URL}${toneLessonHref(lesson.id)}`;
  const title = `${lesson.title} | GuitarHub Tone Course`;
  return {
    title, description: lesson.summary, alternates: { canonical: url },
    openGraph: { title, description: lesson.summary, url, siteName: "GuitarHub", type: "article", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description: lesson.summary, images: [OG_IMAGE.url] },
  };
}

/** The registry title for a tool href, so a renamed tool is renamed here too. */
function toolTitle(href: string) {
  const path = href.split("?")[0];
  return TOOLS.find(tool => tool.href === path)?.title ?? "Open the tool";
}

export default async function ToneLessonPage({ params }: { params: Promise<Params> }) {
  const lesson = getToneLesson((await params).lessonId);
  if (!lesson) notFound();
  const part = toneModule(lesson.module);
  const index = TONE_LESSONS.findIndex(item => item.id === lesson.id);
  const previous = TONE_LESSONS[index - 1], next = TONE_LESSONS[index + 1];
  const position = part.lessons.findIndex(item => item.id === lesson.id) + 1;
  const url = `${SITE_URL}${toneLessonHref(lesson.id)}`;
  const presetHref = lesson.recipe?.preset ? `/tools/pedal-lab?preset=${lesson.recipe.preset}` : null;
  const toolHref = presetHref ?? lesson.exercise.tool;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#lesson`,
    name: lesson.title,
    description: lesson.summary,
    url,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    learningResourceType: lesson.recipe ? "Tone recipe" : "Lesson",
    timeRequired: `PT${lesson.minutes}M`,
    teaches: lesson.keyPoints,
    isPartOf: { "@id": `${SITE_URL}/tone#course` },
    publisher: { "@id": "https://suedeai.ai/#organization" },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <nav className={learning.breadcrumbs} aria-label="Breadcrumb">
      <Link href="/tone">Tone course</Link><span aria-hidden="true">/</span><Link href={`/tone#${part.id}`}>{part.title}</Link>
    </nav>
    <header className={styles.lessonHead}>
      <p className={styles.eyebrow}>{part.title} · lesson {position} of {part.lessons.length} · {lesson.minutes} min</p>
      <h1>{lesson.title}</h1>
      <p>{lesson.summary}</p>
    </header>

    <div className={styles.layout}>
      <article className={styles.article}>
        {lesson.sections.map((section, sectionIndex) => <section key={section.heading} aria-labelledby={`section-${sectionIndex}`}>
          <h2 id={`section-${sectionIndex}`}>{section.heading}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>)}

        {lesson.recipe && <section className={styles.panel} aria-labelledby="recipe-card">
          <h2 id="recipe-card">The recipe</h2>
          <dl className={styles.recipe}>
            <div><dt>Guitar</dt><dd>{lesson.recipe.guitar}</dd></div>
            <div><dt>Pickup</dt><dd>{lesson.recipe.pickup}</dd></div>
            <div><dt>Amp</dt><dd>{lesson.recipe.amp}</dd></div>
            <div><dt>Starting settings</dt><dd><ul>{lesson.recipe.settings.map(setting => <li key={setting}>{setting}</li>)}</ul></dd></div>
            <div><dt>Pedals, in order</dt><dd>{lesson.recipe.pedals.length ? <ul>{lesson.recipe.pedals.map(pedal => <li key={pedal}>{pedal}</li>)}</ul> : "None"}</dd></div>
            <div><dt>Your hands</dt><dd>{lesson.recipe.hands}</dd></div>
          </dl>
          <p className={learning.small}>Settings are starting points. Every amp&rsquo;s numbers mean something different, so set it by ear from here.</p>
          {presetHref && <div className={styles.actions}><Link className={`${styles.button} ${styles.primary}`} href={presetHref}>Hear it in the pedal lab</Link></div>}
        </section>}

        <section className={styles.keyPoints} aria-labelledby="key-points">
          <h2 id="key-points">Keep these</h2>
          <ul>{lesson.keyPoints.map(point => <li key={point}>{point}</li>)}</ul>
        </section>

        <section className={styles.panel} aria-labelledby="try-it">
          <h2 id="try-it">Try it: {lesson.exercise.title}</h2>
          <ol>{lesson.exercise.steps.map(step => <li key={step}>{step}</li>)}</ol>
          {toolHref && <div className={styles.actions} style={{ marginTop: "1rem" }}><Link className={styles.button} href={toolHref}>{presetHref ? "Load the preset in the pedal lab" : toolTitle(toolHref)} →</Link></div>}
        </section>

        <LessonCheck lessonId={lesson.id} quiz={lesson.quiz} />
      </article>

      <aside className={styles.aside} aria-label="In this module">
        <nav className={styles.box} aria-labelledby="module-lessons">
          <h2 id="module-lessons">{part.title}</h2>
          <ol>{part.lessons.map(item => <li key={item.id}>{item.id === lesson.id ? <strong aria-current="page">{item.title}</strong> : <Link href={toneLessonHref(item.id)}>{item.title}</Link>}</li>)}</ol>
        </nav>
        <nav className={styles.box} aria-labelledby="lesson-sections">
          <h2 id="lesson-sections">On this page</h2>
          <ul>
            {lesson.sections.map((section, sectionIndex) => <li key={section.heading}><a href={`#section-${sectionIndex}`}>{section.heading}</a></li>)}
            <li><a href="#try-it">Try it</a></li>
            <li><a href="#lesson-check">Check what stuck</a></li>
          </ul>
        </nav>
      </aside>
    </div>

    <nav className={styles.pager} aria-label="More lessons">
      {previous ? <Link href={toneLessonHref(previous.id)}>← {previous.title}</Link> : <Link href="/tone">← Course overview</Link>}
      {next ? <Link href={toneLessonHref(next.id)}>{next.title} →</Link> : <Link href="/tone">Course overview →</Link>}
    </nav>
  </>;
}
