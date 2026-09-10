import type { NextConfig } from "next";

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
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

// guitarhub.org served the Suede Social app before it became the lessons site.
// Google still holds those URLs (checked 2026-09-08: /discover, /articles and
// /article/h9-vs-volante were indexed under this host and answered 404 here),
// and the same pages are live on social.suedeai.ai, so send them home
// permanently instead of letting the stale index entries die as 404s.
export const LEGACY_SOCIAL_ORIGIN = "https://social.suedeai.ai";
export const LEGACY_SOCIAL_REDIRECTS = [
  { source: "/discover", destination: `${LEGACY_SOCIAL_ORIGIN}/discover`, permanent: true },
  { source: "/articles", destination: `${LEGACY_SOCIAL_ORIGIN}/articles`, permanent: true },
  { source: "/article/:slug*", destination: `${LEGACY_SOCIAL_ORIGIN}/article/:slug*`, permanent: true },
] as const;

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Apple verification uses the checked-in public trust anchor at runtime.
  outputFileTracingIncludes: { "/*": ["./lib/learning-account/AppleRootCA-G3.pem"] },
  poweredByHeader: false,
  async redirects() {
    return [...LEGACY_SOCIAL_REDIRECTS];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
      // Learning exercises and the standalone tuner can request consented microphone access.
      { source: "/learn/:path*", headers: [
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
      ] },
      { source: "/practice", headers: [
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
      ] },
    ];
  },
};

export default nextConfig;
