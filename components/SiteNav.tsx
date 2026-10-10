"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Shared paper header.
 *
 * Below lg the header is one compact row (brand, Menu, Find your level) and
 * the primary links sit behind a disclosure button, so the sticky header no
 * longer wraps to three rows on small phones. From lg up the links sit inline
 * and the button is gone. DOM order is brand, Menu, links, action at every
 * width, which matches the visual reading order.
 *
 * The header's measured height is published as `--site-header-height` on
 * <html>; globals.css turns it into the page-wide `scroll-padding-top`, so
 * anchor targets and keyboard focus never land underneath the header.
 */

const NAV_LINKS = [
  { href: "/learn/guitar", label: "Lessons" },
  { href: "/advanced", label: "Advanced" },
  { href: "/practice", label: "Practice" },
  { href: "/tools", label: "Tools" },
  { href: "/guides", label: "Guides" },
] as const;

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navId = useId();

  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty(
        "--site-header-height",
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="site-header sticky top-0 z-50 border-b border-ink/5 bg-cream/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 px-4 py-2.5 sm:gap-x-3 sm:px-6 sm:py-3 lg:flex-nowrap lg:gap-x-6 lg:py-4">
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center whitespace-nowrap font-display text-lg font-semibold min-[360px]:text-xl tracking-wide text-indigo-deep sm:text-2xl lg:mr-0"
        >
          GUITARHUB
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="site-nav-toggle inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-ink/15 px-3 text-sm font-medium text-indigo-deep transition hover:border-indigo-deep lg:hidden"
          aria-expanded={open}
          aria-controls={navId}
          onClick={() => setOpen((value) => !value)}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <path d={open ? "M3.5 3.5l9 9M12.5 3.5l-9 9" : "M2 4h12M2 8h12M2 12h12"} />
          </svg>
          <span className="max-[374px]:sr-only">Menu</span>
        </button>

        <nav
          id={navId}
          aria-label="Primary"
          className={`site-nav-links order-last w-full text-sm font-medium text-ink/70 lg:order-none lg:ml-auto lg:flex lg:w-auto ${open ? "flex" : "hidden"}`}
        >
          <ul className="grid w-full grid-cols-2 gap-x-4 pb-1 sm:flex sm:flex-wrap sm:gap-x-6 lg:gap-x-8 lg:pb-0">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center transition hover:text-indigo-deep"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/start"
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-indigo-deep px-3 py-2.5 text-xs font-semibold text-cream transition hover:bg-indigo-mid sm:px-4 sm:text-sm lg:px-5"
        >
          Find your level
        </Link>
      </div>
    </header>
  );
}
