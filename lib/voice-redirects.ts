/**
 * The voice lessons moved to Suede Sing on 2026-09-23. Every URL this site
 * served under /learn/voice redirects permanently to its twin there.
 *
 * Built from `contracts/suede-voice-lesson-urls.json`, vendored from
 * JasonColapietro/sing and generated there from the lesson pages sing actually
 * serves. A lesson that moves on sing changes that file and fails
 * `scripts/sync-sing-lesson-urls.mjs --check` here, instead of leaving a
 * redirect that lands on a 404.
 *
 * Two paths under /learn/voice stay on this site on purpose, so there is no
 * catch-all: /learn/voice/materials, the practice library Complete Lifetime
 * buyers paid for, which Sing has no equivalent of; and /learn/voice/recordings,
 * where takes saved in this origin's IndexedDB can still be played or deleted.
 */
import urls from "../contracts/suede-voice-lesson-urls.json" with { type: "json" };

/** Kept on this origin; see above. */
export const VOICE_PATHS_KEPT_HERE = ["/learn/voice/materials", "/learn/voice/recordings"] as const;

export const SING_VOICE_COURSE = `${urls.origin}${urls.course}`;

export function voiceLessonUrlOnSing(lessonId: string): string | undefined {
  const path = (urls.lessons as Record<string, string>)[lessonId];
  return path ? `${urls.origin}${path}` : undefined;
}

export const VOICE_REDIRECTS = [
  { source: "/learn/voice", destination: SING_VOICE_COURSE, permanent: true },
  ...Object.entries(urls.lessons as Record<string, string>).map(([id, path]) => ({
    source: `/learn/voice/${id}`,
    destination: `${urls.origin}${path}`,
    permanent: true,
  })),
] as const;
