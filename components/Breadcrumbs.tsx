import Link from "next/link";
import type { Crumb } from "@/lib/breadcrumbs";

/**
 * The visible breadcrumb trail. Server Component, zero JavaScript.
 *
 * Rendered from the same `Crumb[]` that builds the page's `BreadcrumbList`
 * JSON-LD, so the structured data cannot describe a hierarchy the page does
 * not show. Sits between the header and the h1.
 *
 * The last crumb is the current page, so it is text rather than a link and
 * carries `aria-current="page"`. The separators are decorative and hidden from
 * assistive technology; the `<ol>` already carries the order.
 *
 * `text-ink/70`, not the lighter tints used for decorative labels: ink at 50%
 * over cream measures 3.34:1, under the 4.5:1 AA minimum for text this size.
 */
export default function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto max-w-6xl px-6 pt-5 text-sm text-ink/70"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-x-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-ink/40">
                  /
                </span>
              ) : null}
              {isCurrent ? (
                <span aria-current="page" className="text-indigo-deep">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="underline underline-offset-4 transition hover:text-indigo-deep"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
