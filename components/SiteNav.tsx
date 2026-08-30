import Link from "next/link";

/**
 * The site-wide sticky header. Server Component, zero JavaScript.
 *
 * Desktop matches the homepage header exactly: brand left, links centered,
 * apply pill right. Below `md` the container wraps instead of hiding anything —
 * the nav is `w-full` and `order-last`, so it drops to a second row while the
 * brand and the apply pill stay together on the first. Wrapping is what makes
 * horizontal overflow structurally impossible at any width; there is no
 * hamburger, no toggle, and no state.
 */

const NAV_LINKS = [
  { href: "/method", label: "Method" },
  { href: "/tools", label: "Tools" },
  { href: "/guides", label: "Guides" },
] as const;

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-6 py-4 md:gap-x-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center whitespace-nowrap font-display text-2xl font-semibold tracking-wide text-indigo-deep"
        >
          GUITARHUB
        </Link>

        <nav
          aria-label="Primary"
          className="order-last flex w-full flex-wrap items-center gap-x-8 text-sm font-medium text-ink/70 md:order-none md:w-auto"
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
          href="/#apply"
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-indigo-deep px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-indigo-mid md:px-5"
        >
          Apply to the room
        </Link>
      </div>
    </header>
  );
}
