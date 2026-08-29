import type { MetadataRoute } from "next";

const SITE_URL = "https://guitarhub.org";

// Answer engines are the point of this file, not an afterthought. A bare
// `User-agent: *` is permissive enough in principle, but several of these
// crawlers are documented as looking for their own token and some operators
// treat an explicit allow as the signal to fetch at all. Naming them removes
// the ambiguity, and matches the policy the rest of the estate publishes at
// suedeai.org/robots.txt.
//
// Google-Extended and Applebot-Extended are the AI-training opt-outs, kept
// allowed deliberately: this site's whole purpose is to be quoted.
const AI_AND_SEARCH_AGENTS = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "DuckDuckBot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "Amazonbot",
  "MistralAI-User",
  "CCBot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "YouBot",
  "AI2Bot",
  // Social unfurlers — these fetch the page to build a share card, so
  // blocking them silently breaks every link preview.
  "FacebookBot",
  "facebookexternalhit",
  "Twitterbot",
  "LinkedInBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      ...AI_AND_SEARCH_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/api/"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
