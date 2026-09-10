import Link from "next/link";

/**
 * Shared paper header. On phones the brand and action fit one row, with all
 * primary links directly beneath. The single-row layout starts at lg so tablet
 * widths do not wrap the action into an extra sticky row.
 */

const NAV_LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/practice", label: "Practice" },
  { href: "/method", label: "Method" },
  { href: "/tools", label: "Tools" },
  { href: "/guides", label: "Guides" },
] as const;

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 sm:px-6 sm:py-3 lg:gap-x-6 lg:py-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center whitespace-nowrap font-display text-xl font-semibold tracking-wide text-indigo-deep sm:text-2xl"
        >
          GUITARHUB
        </Link>

        <nav
          aria-label="Primary"
          className="order-last flex w-full flex-wrap items-center justify-between gap-x-2 text-sm font-medium text-ink/70 sm:justify-start sm:gap-x-6 lg:order-none lg:w-auto lg:gap-x-8"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center transition hover:text-indigo-deep"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/learn/guitar"
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-indigo-deep px-3 py-2.5 text-xs font-semibold text-cream transition hover:bg-indigo-mid sm:px-4 sm:text-sm lg:px-5"
        >
          Start learning
        </Link>
      </div>
    </header>
  );
}
