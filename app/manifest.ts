import type { MetadataRoute } from "next";
import { BACKGROUND_COLOR, SITE_NAME, THEME_COLOR } from "@/lib/site";

/**
 * The web app manifest, served at /manifest.webmanifest and linked from every
 * page by Next. Icons are the files `app/layout.tsx` already declares, so the
 * tab, the home-screen shortcut and the manifest show one mark.
 *
 * Both colours come from `lib/site.ts`, which the root layout's `themeColor`
 * reads too.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} by Suede AI`,
    short_name: SITE_NAME,
    description:
      "Guitar lessons, a free tuner and metronome, practice routines and advanced drills.",
    start_url: "/",
    scope: "/",
    display: "browser",
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon" },
      { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
