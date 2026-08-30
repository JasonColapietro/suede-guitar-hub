import Link from "next/link";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { isInternalHref } from "@/lib/site";

/**
 * The shared long-form shell for every guide page. Server Component.
 *
 * Renders: nav, a dark hero (title, dek, updated date), a constrained prose
 * column, an optional related-links block, a CTA block, footer.
 *
 * There is no typography plugin in this project (checked: package.json lists
 * only `tailwindcss` and `@tailwindcss/postcss`, and Tailwind v4's preflight
 * strips heading sizes and list markers). So the prose styles below are
 * explicit descendant selectors on a wrapper. Descendant rather than
 * direct-child, so a guide can group content in a `<section>` and still get
 * styled prose.
 */

export type RelatedLink = {
  href: string;
  title: string;
  blurb?: string;
  /** Ignored here; present so a `SiteEntry` can be passed straight through. */
  lastModified?: string;
};

export type ArticleProps = {
  /**
   * The h1. Pass a plain string, or JSX carrying the house accent:
   * `<>How to practice guitar <em className="font-display italic text-peach">effectively.</em></>`
   */
  title: ReactNode;
  /** One or two sentences under the title. */
  dek: ReactNode;
  /** ISO date, `YYYY-MM-DD`. Rendered as "Updated August 29, 2026". */
  updated: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  children: ReactNode;
  related?: readonly RelatedLink[];
  /** Heading for the related block. */
  relatedTitle?: string;
};

const PROSE = [
  "mx-auto max-w-2xl px-6 py-16 md:py-20",
  "[&>*:first-child]:mt-0",
  "[&_p]:mt-6 [&_p]:text-lg [&_p]:leading-relaxed [&_p]:text-ink/70",
  "[&_h2]:mt-14 [&_h2]:text-3xl [&_h2]:leading-snug [&_h2]:text-indigo-deep md:[&_h2]:text-4xl",
  "[&_h3]:mt-10 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:leading-snug [&_h3]:text-indigo-deep",
  "[&_ul]:mt-6 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:mt-6 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:mt-2 [&_li]:text-lg [&_li]:leading-relaxed [&_li]:text-ink/70",
  "[&_li]:marker:text-violet",
  "[&_strong]:font-semibold [&_strong]:text-indigo-deep",
  "[&_em]:italic",
  "[&_a]:text-indigo-deep [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-violet",
  "[&_blockquote]:mt-8 [&_blockquote]:border-l-2 [&_blockquote]:border-violet/40 [&_blockquote]:pl-5 [&_blockquote]:text-lg [&_blockquote]:leading-relaxed [&_blockquote]:text-ink/70",
  "[&_hr]:my-14 [&_hr]:border-ink/10",
  "[&_code]:rounded [&_code]:bg-cream-soft [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:text-indigo-deep",
  // ink/60, not ink/50: over cream, ink at 50% measures 3.34:1, under the
  // 4.5:1 AA minimum for 14px text. ink/60 measures 4.54:1.
  "[&_figure]:mt-8 [&_figcaption]:mt-3 [&_figcaption]:text-sm [&_figcaption]:text-ink/60",
].join(" ");

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function RelatedCard({ item }: { item: RelatedLink }) {
  const cardClasses =
    "block h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5 transition hover:shadow-md motion-safe:hover:-translate-y-1";
  const inner = (
    <>
      <h3 className="font-display text-xl leading-snug text-indigo-deep">
        {item.title} <span aria-hidden>{isInternalHref(item.href) ? "→" : "↗"}</span>
      </h3>
      {item.blurb ? (
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{item.blurb}</p>
      ) : null}
    </>
  );

  return isInternalHref(item.href) ? (
    <Link href={item.href} className={cardClasses}>
      {inner}
    </Link>
  ) : (
    <a href={item.href} className={cardClasses}>
      {inner}
    </a>
  );
}

export default function Article({
  title,
  dek,
  updated,
  eyebrow = "GuitarHub guide",
  children,
  related,
  relatedTitle = "Where to go next",
}: ArticleProps) {
  return (
    <>
      <SiteNav />

      <main>
        <article>
          <section className="px-3 pt-3">
            <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
                {eyebrow}
              </span>
              <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight md:text-5xl">
                {title}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                {dek}
              </p>
              <p className="mt-8 text-xs uppercase tracking-widest text-violet-soft">
                Updated <time dateTime={updated}>{formatUpdated(updated)}</time>
              </p>
            </div>
          </section>

          <div className={PROSE}>{children}</div>
        </article>

        {related && related.length > 0 ? (
          <section className="mx-auto max-w-4xl px-6 pb-20">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-violet">
              {relatedTitle}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.href}>
                  <RelatedCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="px-3 pb-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
            <h2 className="mx-auto max-w-2xl text-4xl text-cream md:text-5xl">
              Put this to work{" "}
              <em className="font-display italic text-peach">this week.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/75">
              Build the four-week plan in your browser, or apply to the founding
              room. The planner needs no account. Applying starts a fit
              conversation and takes no payment.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/breakthrough"
                className="inline-flex items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                Build my 30-day plan <span aria-hidden>→</span>
              </Link>
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
              >
                Apply to the room <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
