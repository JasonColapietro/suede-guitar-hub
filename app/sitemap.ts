import type { MetadataRoute } from "next";

const SITE_URL = "https://guitarhub.org";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-08-28T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/breakthrough`,
      lastModified: new Date("2026-08-27T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
