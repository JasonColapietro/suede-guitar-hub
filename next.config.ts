import type { NextConfig } from "next";
import { VOICE_REDIRECTS } from "./lib/voice-redirects.ts";
import { FIELD_GUIDES, fieldGuidePdf } from "./lib/field-guides.ts";
import { SITE_URL } from "./lib/site.ts";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // microphone=(self) on every route, not only the pages that use it. The
  // policy is fixed when a document loads and client-side navigation keeps the
  // first document, so a visitor who landed on / or /tools and then clicked
  // through to /practice, /learn or /advanced inherited microphone=() and the
  // tuner failed with NotAllowedError. Each tool still asks for consent.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

/**
 * Public images that are not content-hashed: the Field Guide and book covers
 * and the favicons. Without a rule they were served `max-age=0,
 * must-revalidate`, so every page view revalidated each one. A day of
 * freshness plus a week of stale-while-revalidate, not `immutable`: the file
 * names stay the same when the art is re-rendered.
 */
const STATIC_IMAGE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
export const STATIC_IMAGE_SOURCES = [
  "/field-guides/covers/:file*",
  "/books/:file*",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
] as const;

/**
 * Each Field Guide PDF is the printable twin of a web guide, so it names that
 * page as its canonical in an HTTP `Link` header (the only place a PDF can
 * carry one). Search engines then consolidate the PDF onto the HTML guide
 * instead of indexing two copies of the same text.
 */
export const FIELD_GUIDE_PDF_HEADERS = FIELD_GUIDES.map((guide) => ({
  source: fieldGuidePdf(guide),
  headers: [{ key: "Link", value: `<${SITE_URL}${guide.href}>; rel="canonical"` }],
}));

// guitarhub.org served the Suede AI Social app before it became the lessons site.
// Google still holds those URLs (checked 2026-09-08: /discover, /articles and
// /article/h9-vs-volante were indexed under this host and answered 404 here),
// and the same pages are live on social.suedeai.ai, so send them home
// permanently instead of letting the stale index entries die as 404s.
export const LEGACY_SOCIAL_ORIGIN = "https://social.suedeai.ai";
export const LEGACY_SOCIAL_REDIRECTS = [
  { source: "/discover", destination: `${LEGACY_SOCIAL_ORIGIN}/discover`, permanent: true },
  { source: "/articles", destination: `${LEGACY_SOCIAL_ORIGIN}/articles`, permanent: true },
  { source: "/article/:slug*", destination: `${LEGACY_SOCIAL_ORIGIN}/article/:slug*`, permanent: true },
  // Checked 2026-09-16: Search Console also files /author/johnny, a
  // /forum/off-topic thread and /social/roasts under "Not found (404)".
  // Suede Social already folds /social/* onto its root paths, so land there directly.
  { source: "/author/:slug*", destination: `${LEGACY_SOCIAL_ORIGIN}/author/:slug*`, permanent: true },
  { source: "/forum", destination: `${LEGACY_SOCIAL_ORIGIN}/forum`, permanent: true },
  { source: "/forum/:slug*", destination: `${LEGACY_SOCIAL_ORIGIN}/forum/:slug*`, permanent: true },
  { source: "/social", destination: `${LEGACY_SOCIAL_ORIGIN}/`, permanent: true },
  { source: "/social/:slug*", destination: `${LEGACY_SOCIAL_ORIGIN}/:slug*`, permanent: true },
] as const;

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Apple verification uses the checked-in public trust anchor at runtime.
  outputFileTracingIncludes: { "/*": ["./lib/learning-account/AppleRootCA-G3.pem"] },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // The sources are public files without a content hash, so cap the
    // optimized copy's lifetime at a week rather than forever.
    minimumCacheTTL: 604800,
  },
  async redirects() {
    return [...LEGACY_SOCIAL_REDIRECTS, ...VOICE_REDIRECTS];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
      ...STATIC_IMAGE_SOURCES.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: STATIC_IMAGE_CACHE }],
      })),
      ...FIELD_GUIDE_PDF_HEADERS,
    ];
  },
};

export default nextConfig;
