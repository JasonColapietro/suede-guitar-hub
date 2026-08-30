import Link from "next/link";
import { GUIDES, STRUMLY, TOOLS, isInternalHref, type SiteEntry } from "@/lib/site";

/**
 * The site-wide footer. Server Component, zero JavaScript.
 *
 * This is the internal-linking backbone: every page renders it, so every page
 * links to every tool and every guide. The Tools and Guides columns are built
 * from `lib/site.ts` — add a page there and it appears here on every route.
 */

/**
 * `/about` leads this column rather than sitting in Tools or Guides, because it
 * is neither: it is the page that says who built the site and what happens to
 * what you type into it. It is deliberately absent from `lib/site.ts` (see the
 * note in `app/sitemap.ts`), so without this entry it would be reachable only
 * from the XML sitemap — an indexable page with no internal link pointing at
 * it. Internal and external hrefs are mixed here, so each is rendered by
 * `isInternalHref`: `next/link` without the outbound arrow, or a plain anchor
 * with it.
 */
const SUEDE_LINKS: readonly { href: string; label: string }[] = [
  { href: "/about", label: "About GuitarHub" },
  { href: STRUMLY.guides, label: "Strumly guides" },
  { href: STRUMLY.path, label: "Strumly learning path" },
  { href: STRUMLY.rig, label: "Strumly rig board" },
  { href: STRUMLY.social, label: "Suede Social" },
  { href: STRUMLY.suedeLabs, label: "Suede Labs" },
];

const COLUMN_HEADING =
  "text-[11px] font-semibold uppercase tracking-widest text-violet";
// `gap-1` matters: these are inline-flex, which discards the whitespace text
// node between a label and its trailing "↗", so the gap has to be explicit.
const LINK_CLASSES =
  "inline-flex min-h-11 items-center gap-1 text-sm text-ink/70 transition hover:text-indigo-deep";

function InternalColumn({
  heading,
  entries,
}: {
  heading: string;
  entries: readonly SiteEntry[];
}) {
  return (
    <div>
      <h2 className={COLUMN_HEADING}>{heading}</h2>
      <ul className="mt-3">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link href={entry.href} className={LINK_CLASSES}>
              {entry.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          <InternalColumn heading="Tools" entries={TOOLS} />
          <InternalColumn heading="Guides" entries={GUIDES} />
          <div>
            <h2 className={COLUMN_HEADING}>Suede</h2>
            <ul className="mt-3">
              {SUEDE_LINKS.map((link) => (
                <li key={link.href}>
                  {isInternalHref(link.href) ? (
                    <Link href={link.href} className={LINK_CLASSES}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={LINK_CLASSES}>
                      {link.label} <span aria-hidden>↗</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {/* ink/60, not ink/50: over cream, ink at 50% composites to #8a8391
                and measures 3.34:1, under the 4.5:1 AA minimum for 14px text.
                ink/60 measures 4.54:1. Same for the bottom row below. */}
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">
              GuitarHub orchestrates the practice. Strumly powers the tools.
              Suede Social carries the wider conversation.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-ink/5 pt-8 text-sm text-ink/60 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-display text-lg text-indigo-deep"
          >
            GUITARHUB
          </Link>
          <span>
            A Suede Labs program, built by Jason Colapietro ·{" "}
            <a
              href="mailto:info@suedeai.ai"
              className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-indigo-deep"
            >
              info@suedeai.ai
            </a>
          </span>
          <span>© {new Date().getFullYear()} Suede Labs</span>
        </div>
      </div>
    </footer>
  );
}
