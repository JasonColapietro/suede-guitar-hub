import type { TrackId } from "./models.ts";

/** Data-free track helpers, safe for client components (curriculum.ts re-exports them). */
export const trackNames = { guitar: "Guitar", voice: "Voice" } as const;
export function isTrackId(value: string): value is TrackId { return value === "guitar" || value === "voice"; }
export function lessonHref(track: TrackId, lessonId: string) { return `/learn/${track}/${encodeURIComponent(lessonId)}`; }
