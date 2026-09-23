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
 * Order matters: Next applies the first match, so each lesson comes before
 * the catch-all that sends anything else under the prefix to the course page.
 */
import urls from "../contracts/suede-voice-lesson-urls.json" with { type: "json" };

export const SING_VOICE_COURSE = `${urls.origin}${urls.course}`;

export function voiceLessonUrlOnSing(lessonId: string): string | undefined {
  const path = (urls.lessons as Record<string, string>)[lessonId];
  return path ? `${urls.origin}${path}` : undefined;
}

export const VOICE_REDIRECTS = [
  { source: "/learn/voice", destination: SING_VOICE_COURSE, permanent: true },
  { source: "/learn/voice/materials", destination: SING_VOICE_COURSE, permanent: true },
  ...Object.entries(urls.lessons as Record<string, string>).map(([id, path]) => ({
    source: `/learn/voice/${id}`,
    destination: `${urls.origin}${path}`,
    permanent: true,
  })),
  { source: "/learn/voice/:rest*", destination: SING_VOICE_COURSE, permanent: true },
] as const;
