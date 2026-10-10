import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { OG_IMAGE } from "@/lib/site";

/**
 * The 404 page, for unmatched URLs and for `notFound()` anywhere in the app.
 *
 * Its metadata is its own. Without this file the 404 inherited the root
 * layout's home-page title and `index, follow` robots tag, so it shipped two
 * contradictory robots metas (Next injects `noindex` on every 404).
 *
 * - `robots: null` clears the layout's robots and googlebot tags, leaving the
 *   single `noindex` Next adds to 404 responses.
 * - No `alternates`: a missing page has no canonical address.
 * - `openGraph` without `url`, so a shared broken link does not unfurl as the
 *   home page.
 */
const TITLE = "Page not found | GuitarHub";
const DESCRIPTION = "This page does not exist on GuitarHub.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: null,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "GuitarHub",
    type: "website",
    images: [OG_IMAGE],
  },
};

const NEXT_STEPS = [
  { href: "/learn/guitar", label: "Guitar lessons" },
  { href: "/practice", label: "Tuner and metronome" },
  { href: "/tools", label: "Practice tools" },
  { href: "/guides", label: "Practice guides" },
] as const;

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet">404</p>
        <h1 className="mt-4 text-4xl leading-tight text-indigo-deep md:text-5xl">
          Page not found
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
          The address may be mistyped, or the page has moved. Pick up from one of
          these instead.
        </p>
        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {NEXT_STEPS.map((step) => (
            <li key={step.href}>
              <Link
                href={step.href}
                prefetch={false}
                className="inline-flex min-h-11 items-center rounded-full bg-cream-soft px-5 text-sm font-semibold text-indigo-deep transition hover:bg-indigo-deep hover:text-cream"
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-violet"
          >
            Go to the home page <span aria-hidden>→</span>
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
