import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  TOOLS,
  SITEMAP_ENTRIES,
  SITE_URL as REGISTRY_SITE_URL,
} from "../lib/site.ts";
import { breadcrumbList, crumbTrail } from "../lib/breadcrumbs.ts";

const SITE_URL = "https://guitarhub.org";

test("publishes indexable robots metadata with the canonical sitemap", async () => {
  assert.equal(
    existsSync(new URL("../app/robots.ts", import.meta.url)),
    true,
    "app/robots.ts must exist",
  );

  const { default: robots } = await import("../app/robots.ts");
  const result = robots();

  assert.equal(result.sitemap, `${SITE_URL}/sitemap.xml`);
  assert.equal(result.host, SITE_URL);

  // Asserted by intent rather than exact shape. The previous deep-equal pinned
  // the rules array to a single wildcard entry, so adding a named agent — the
  // thing this file exists to allow — failed the test for doing its job.
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

  const wildcard = rules.find((rule) => rule.userAgent === "*");
  assert.ok(wildcard, "the wildcard rule must survive");
  assert.equal(wildcard.allow, "/");
  assert.deepEqual(wildcard.disallow, ["/api/"]);

  // Every rule must keep /api/ private; a named agent that skipped the
  // disallow would quietly expose the API to exactly the crawlers we invite.
  for (const rule of rules) {
    assert.equal(rule.allow, "/", `${rule.userAgent} must allow /`);
    assert.deepEqual(
      rule.disallow,
      ["/api/"],
      `${rule.userAgent} must still disallow /api/`,
    );
  }

  // The answer engines that actually drive citation, named explicitly.
  const named = new Set(rules.map((rule) => rule.userAgent));
  for (const agent of [
    "Googlebot",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "OAI-SearchBot",
    "Applebot",
  ]) {
    assert.ok(named.has(agent), `robots.ts must name ${agent}`);
  }
});

/**
 * Resolve a route path to the `app/` directory whose `page.tsx` renders it,
 * following Next's own order: a literal segment directory wins, and a dynamic
 * `[segment]` directory is the fallback.
 *
 * The literal check this replaced could not see `/learn/guitar`, which is
 * rendered by `app/learn/[track]/page.tsx`, and would have failed the sitemap
 * for listing a live, pre-rendered route. Trying the literal branch first and
 * backtracking matters here: `app/learn/guitar/` does exist, but only to hold
 * `/learn/guitar/routine`, and it carries no `page.tsx` of its own.
 *
 * Returns null when nothing under `app/` renders the path, so a sitemap entry
 * with no page behind it still fails the assertion below. `dynamic` carries the
 * values that landed on a placeholder segment, so the caller can go on to prove
 * those are actually pre-rendered.
 */
function resolveRoute(path: string): { dir: URL; dynamic: string[] } | null {
  const segments = path.split("/").filter(Boolean);

  function walk(
    dir: URL,
    index: number,
    dynamic: readonly string[],
  ): { dir: URL; dynamic: string[] } | null {
    if (index === segments.length) {
      return existsSync(new URL("page.tsx", dir))
        ? { dir, dynamic: [...dynamic] }
        : null;
    }

    const segment = segments[index];

    const literal = new URL(`${segment}/`, dir);
    if (existsSync(literal)) {
      const found = walk(literal, index + 1, dynamic);
      if (found) return found;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!/^\[[^[\]]+\]$/.test(entry.name)) continue;
      const found = walk(new URL(`${entry.name}/`, dir), index + 1, [
        ...dynamic,
        segment,
      ]);
      if (found) return found;
    }

    return null;
  }

  return walk(new URL("../app/", import.meta.url), 0, []);
}

test("publishes every canonical indexable page in the sitemap", async () => {
  assert.equal(
    existsSync(new URL("../app/sitemap.ts", import.meta.url)),
    true,
    "app/sitemap.ts must exist",
  );

  // The canonical origin is pinned as a literal above rather than imported, so
  // that an accidental edit to the registry is caught here instead of being
  // silently agreed with by every assertion below.
  assert.equal(REGISTRY_SITE_URL, SITE_URL, "lib/site.ts must hold the canonical origin");

  const { default: sitemap } = await import("../app/sitemap.ts");
  const entries = sitemap();
  const urls = entries.map((entry) => String(entry.url));

  // Checked against the route registry rather than a hand-typed list. The
  // previous version pinned exactly two URLs, which was true when the site was
  // two pages; every page added after that failed a test named for publishing
  // them. Deriving the expectation from `lib/site.ts` means a page added to the
  // registry keeps this green, while a sitemap entry with no page behind it
  // still fails — see the disk check below.
  for (const entry of SITEMAP_ENTRIES) {
    assert.ok(
      urls.includes(entry.href === "/" ? SITE_URL : `${SITE_URL}${entry.href}`),
      `${entry.href} is in the route registry but missing from the sitemap`,
    );
  }

  // The failure this file exists to prevent, named in app/sitemap.ts's own
  // header comment: a sitemap that advertises a 404. Every URL emitted has to
  // have a page.tsx behind it.
  for (const url of urls) {
    const path = url.slice(SITE_URL.length);
    const route = resolveRoute(path);

    assert.ok(
      route,
      `${url} is in the sitemap but no page.tsx under app${path} renders it`,
    );

    // A dynamic segment answers any value, so finding the directory is not
    // enough to say the URL resolves. The rendering page has to name this
    // value in the params it pre-renders, or the sitemap is still advertising
    // a 404 through a directory that happens to exist.
    if (route.dynamic.length > 0) {
      const source = readFileSync(new URL("page.tsx", route.dir), "utf8");
      const params = source.match(/generateStaticParams\(\)[\s\S]*?\n}/)?.[0];
      assert.ok(
        params,
        `${url} is served by a dynamic segment, so app${path} needs generateStaticParams`,
      );
      for (const value of route.dynamic) {
        assert.ok(
          params.includes(`"${value}"`),
          `${url} is in the sitemap but generateStaticParams does not pre-render "${value}"`,
        );
      }
    }
  }

  assert.equal(
    new Set(urls).size,
    urls.length,
    "no page may be listed in the sitemap twice",
  );

  for (const url of urls) {
    assert.ok(url.startsWith(SITE_URL), `${url} must be absolute on ${SITE_URL}`);
    assert.ok(
      url === SITE_URL || !url.endsWith("/"),
      `${url} must not carry a trailing slash`,
    );
  }

  // The home page is the site's most important URL, so it leads the file.
  assert.equal(urls[0], SITE_URL, "the home page must be the first entry");

  for (const entry of entries) {
    assert.ok(
      entry.lastModified instanceof Date &&
        !Number.isNaN(entry.lastModified.getTime()),
      `${entry.url} must carry a real lastModified date`,
    );
    assert.ok(
      typeof entry.priority === "number" && entry.priority > 0 && entry.priority <= 1,
      `${entry.url} must carry a priority inside (0, 1]`,
    );
    assert.ok(entry.changeFrequency, `${entry.url} must carry a changeFrequency`);
  }
});

/**
 * Every `page.tsx` under `app/`, with its route path, so the structure checks
 * below cover a page added later without anyone remembering to list it.
 */
function pageSources(): { route: string; source: string }[] {
  const found: { route: string; source: string }[] = [];

  function walk(dir: URL, route: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, dir), `${route}/${entry.name}`);
      } else if (entry.name === "page.tsx") {
        found.push({
          route: route === "" ? "/" : route,
          source: readFileSync(new URL(entry.name, dir), "utf8"),
        });
      }
    }
  }

  walk(new URL("../app/", import.meta.url), "");
  return found;
}

test("shows a visible breadcrumb trail wherever the structured data declares one", () => {
  const component = readFileSync(
    new URL("../components/Breadcrumbs.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    component,
    /aria-label="Breadcrumb"/,
    "the trail must be findable as a breadcrumb landmark",
  );
  assert.match(
    component,
    /aria-current="page"/,
    "the last crumb is the current page and must say so",
  );

  // Pages hold their address as an absolute CANONICAL and hand that straight
  // to crumbTrail, so a builder that prepended the origin unconditionally
  // emitted `https://guitarhub.orghttps://guitarhub.org/about` in `item`.
  // Every crumb link must be one origin followed by one path.
  const trail = crumbTrail("About", `${SITE_URL}/about`);
  const list = breadcrumbList(`${SITE_URL}/about`, trail);
  assert.deepEqual(
    list.itemListElement.map((entry) => entry.item),
    [SITE_URL, `${SITE_URL}/about`],
  );
  assert.deepEqual(
    crumbTrail("About", "/about").map((crumb) => crumb.href),
    ["/", "/about"],
    "a relative href must survive unchanged, so the visible links stay internal",
  );
  assert.deepEqual(
    crumbTrail("About", `${SITE_URL}/about`).map((crumb) => crumb.href),
    ["/", "/about"],
    "an absolute canonical must be reduced to the same relative href",
  );

  const declaring = pageSources().filter(
    ({ source }) =>
      source.includes("breadcrumbList(") || source.includes('"BreadcrumbList"'),
  );
  assert.ok(
    declaring.length > 0,
    "the site must still publish BreadcrumbList structured data",
  );

  // The defect this replaces: four pages declared a two-level BreadcrumbList
  // while the rendered page showed no trail at all, so the markup claimed a
  // hierarchy the reader could not see.
  for (const { route, source } of declaring) {
    assert.match(
      source,
      /crumbTrail\(/,
      `${route} must build its trail with crumbTrail, so the markup and the page read one array`,
    );
    assert.match(
      source,
      /crumbs=\{CRUMBS\}/,
      `${route} declares a BreadcrumbList but renders no visible breadcrumb trail`,
    );
  }
});

test("renders every declared FAQ question as a visible heading", () => {
  const declaring = pageSources().filter(({ source }) =>
    source.includes('"FAQPage"'),
  );
  assert.ok(
    declaring.length > 0,
    "the site must still publish FAQPage structured data",
  );

  // A <dt> is not a heading. /tools declared five Questions and rendered them
  // as a description list, so a retrievability pass counted zero visible
  // questions against the five in the markup.
  for (const { route, source } of declaring) {
    assert.match(
      source,
      /<h[23][^>]*>\s*\{\w+\.q\}\s*<\/h[23]>/,
      `${route} declares an FAQPage, so each question must render as a heading`,
    );
    assert.doesNotMatch(
      source,
      /<dt[^>]*>\s*\{\w+\.q\}/,
      `${route} must not render an FAQPage question as a description-list term`,
    );
  }
});

test("routes the homepage primary navigation through the crawlable hubs", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const navLinks = source.match(/const NAV_LINKS = \[[\s\S]*?\n\] as const;/)?.[0];

  assert.ok(navLinks, "app/page.tsx must define its primary navigation links");
  assert.match(navLinks, /href: "\/method", label: "Method"/);
  assert.match(navLinks, /href: "\/tools"|href: "#tools"/);
  assert.match(
    navLinks,
    /href: "\/guides", label: "Guides"/,
    "the homepage Guides link must reach the guides hub, not bypass it for one article",
  );
});

test("adds browser-facing security headers without blocking indexable pages", async () => {
  const { default: nextConfig } = await import("../next.config.ts");

  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(typeof nextConfig.headers, "function");

  const rules = await nextConfig.headers!();
  const sitewide = rules.find((rule) => rule.source === "/:path*");
  assert.ok(sitewide, "security headers must cover every route");

  const headers = new Map(sitewide.headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.match(headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.doesNotMatch(
    headers.get("Content-Security-Policy") ?? "",
    /noindex|nofollow/,
    "security policy must not add crawl directives",
  );
  assert.match(headers.get("Permissions-Policy") ?? "", /microphone=\(\)/);
  const learning = rules.find((rule) => rule.source === "/learn/:path*");
  assert.ok(learning, "learning routes must permit consented microphone practice");
  assert.ok(rules.indexOf(learning) > rules.indexOf(sitewide), "learning policy must override the sitewide default");
  const learningHeaders = new Map(learning.headers.map(({ key, value }) => [key, value]));
  assert.equal(learningHeaders.get("Permissions-Policy"), "camera=(), geolocation=(), microphone=(self)");
});

test("gives every registered tool a full tools-hub card and routing row", () => {
  const source = readFileSync(
    new URL("../app/tools/page.tsx", import.meta.url),
    "utf8",
  );
  const details = source.match(
    /const TOOL_DETAILS:[\s\S]*?\n};/,
  )?.[0];
  const routing = source.match(
    /const ROUTING:[\s\S]*?\n];/,
  )?.[0];

  assert.ok(details, "app/tools/page.tsx must define TOOL_DETAILS");
  assert.ok(routing, "app/tools/page.tsx must define ROUTING");

  for (const tool of TOOLS) {
    const escapedHref = tool.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    assert.match(
      details,
      new RegExp(`"${escapedHref}"\\s*:`),
      `${tool.href} needs the full what-it-does and who-it-helps card copy`,
    );
    assert.match(
      routing,
      new RegExp(`href:\\s*"${escapedHref}"`),
      `${tool.href} needs a place in the method-stage routing table`,
    );
  }
});
