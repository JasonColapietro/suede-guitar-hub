import Link from "next/link";
import { GUIDES, RESOURCES } from "@/lib/site";
import {
  FIELD_GUIDES,
  fieldGuideCover,
  fieldGuidePdf,
  fieldGuideForHref,
  type FieldGuide,
} from "@/lib/field-guides";

/**
 * The Field Guide covers, used as the hook into the written guides.
 *
 * A cover links to the guide's PDF, which downloads with no account and no
 * email. The web guide it was made from is one tap away underneath, so a
 * reader who would rather read in the browser is never forced into a file.
 *
 * Covers are plain <img> tags: they are pre-sized WebPs of 60-110 KB rendered
 * by scripts/field-guide-art, so the optimizer has nothing to add.
 */

const TITLE_BY_HREF = new Map([...GUIDES, ...RESOURCES].map((entry) => [entry.href, entry.title]));

const issueLabel = (guide: FieldGuide) => `Field Guide No. ${String(guide.issue).padStart(2, "0")}`;

function downloadName(guide: FieldGuide) {
  return fieldGuidePdf(guide).split("/").pop();
}

function CoverCard({ guide }: { guide: FieldGuide }) {
  const title = TITLE_BY_HREF.get(guide.href) ?? guide.coverTitle;
  return (
    <li className="flex flex-col">
      <a
        href={fieldGuidePdf(guide)}
        download={downloadName(guide)}
        className="group block aspect-[3/4] overflow-hidden rounded-2xl bg-[#141414] shadow-md ring-1 ring-ink/10 transition hover:shadow-xl motion-safe:hover:-translate-y-1"
        aria-label={`Download the free PDF: ${title} (${issueLabel(guide)})`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP, see above */}
        <img
          src={fieldGuideCover(guide)}
          alt=""
          width={900}
          height={1200}
          loading="lazy"
          decoding="async"
          className="h-auto w-full transition motion-safe:group-hover:scale-[1.02]"
        />
      </a>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-violet">
        {issueLabel(guide)}
      </p>
      <p className="mt-1 font-display text-lg leading-snug text-indigo-deep">{title}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a
          href={fieldGuidePdf(guide)}
          download={downloadName(guide)}
          className="font-semibold text-indigo-deep underline underline-offset-4 hover:text-violet"
        >
          Free PDF
        </a>
        <Link href={guide.href} className="text-ink/70 underline underline-offset-4 hover:text-violet">
          Read online
        </Link>
      </p>
    </li>
  );
}

export function FieldGuideShelf({
  title = "Free field guides",
  intro = "Every GuitarHub guide as a PDF you can keep on your phone or print for the music stand. No account, no email.",
  hrefs,
  id = "field-guides",
  moreHref,
}: {
  title?: string;
  intro?: string;
  /** Limit the shelf to these guides, in this order. Defaults to all. */
  hrefs?: readonly string[];
  id?: string;
  /** When set, a "See all" link to the full shelf follows the covers. */
  moreHref?: string;
}) {
  const guides = hrefs
    ? hrefs.flatMap((href) => {
        const guide = fieldGuideForHref(href);
        return guide ? [guide] : [];
      })
    : FIELD_GUIDES;
  if (guides.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-6xl px-6 py-16">
      <h2 id={`${id}-title`} className="text-3xl leading-snug text-indigo-deep md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">{intro}</p>
      <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {guides.map((guide) => (
          <CoverCard key={guide.slug} guide={guide} />
        ))}
      </ul>
      {moreHref ? (
        <p className="mt-10 text-center">
          <Link
            href={moreHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-deep/20 px-6 py-3 font-semibold text-indigo-deep transition hover:bg-indigo-deep hover:text-cream"
          >
            See all {FIELD_GUIDES.length} field guides <span aria-hidden>→</span>
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** The download card shown under a guide's hero. Renders nothing for pages without a PDF. */
export function FieldGuideDownload({ href }: { href: string }) {
  const guide = fieldGuideForHref(href);
  if (!guide) return null;
  return (
    <aside
      data-field-guide-download
      className="mx-auto mt-10 flex max-w-2xl items-center gap-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ink/5 sm:p-5"
    >
      <a href={fieldGuidePdf(guide)} download={downloadName(guide)} className="w-20 shrink-0 sm:w-24" tabIndex={-1} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP, see above */}
        <img
          src={fieldGuideCover(guide)}
          alt=""
          width={900}
          height={1200}
          decoding="async"
          className="h-auto w-full rounded-lg shadow ring-1 ring-ink/10"
        />
      </a>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-violet">{issueLabel(guide)}</p>
        <p className="mt-1 text-base leading-snug text-ink/80">
          Keep this guide as a PDF for your phone or the music stand.
        </p>
        <a
          href={fieldGuidePdf(guide)}
          download={downloadName(guide)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-violet"
        >
          Download the free PDF <span aria-hidden>↓</span>
        </a>
      </div>
    </aside>
  );
}
