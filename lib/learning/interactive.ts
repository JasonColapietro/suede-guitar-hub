/**
 * Pure helpers behind the interactive lesson tools: tap-along scoring and
 * note naming. Kept free of React and audio so they can be tested directly.
 */

export type TapRating = "great" | "good" | "early" | "late" | "missed";
export type TapHit = { index: number; offsetMs: number | null; rating: TapRating };
export type TapScore = { hits: TapHit[]; extraTaps: number; score: number; averageOffsetMs: number | null; great: number; good: number; missed: number };

/** Under 45 ms feels locked in; under 100 ms is close; beyond that it reads as early or late. */
export const TAP_GREAT_MS = 45, TAP_GOOD_MS = 100;

/**
 * Match taps to targets, both in seconds on the same clock.
 *
 * Each target takes the closest unused tap within `windowSeconds`, working
 * through targets in order. A target with no tap in its window is missed;
 * taps nobody claimed are extras. The score gives full credit inside the
 * great band, falling linearly to nothing at the window edge, less a small
 * penalty per extra tap so mashing does not win.
 */
export function scoreTaps(targets: readonly number[], taps: readonly number[], windowSeconds: number): TapScore {
  const used = new Set<number>();
  const hits: TapHit[] = targets.map((target, index) => {
    let best = -1, bestDistance = Infinity;
    taps.forEach((tap, tapIndex) => {
      if (used.has(tapIndex)) return;
      const distance = Math.abs(tap - target);
      if (distance <= windowSeconds && distance < bestDistance) { best = tapIndex; bestDistance = distance; }
    });
    if (best < 0) return { index, offsetMs: null, rating: "missed" };
    used.add(best);
    const offsetMs = Math.round((taps[best] - target) * 1000);
    const size = Math.abs(offsetMs);
    return { index, offsetMs, rating: size <= TAP_GREAT_MS ? "great" : size <= TAP_GOOD_MS ? "good" : offsetMs < 0 ? "early" : "late" };
  });
  const extraTaps = taps.length - used.size;
  const windowMs = windowSeconds * 1000;
  const credit = hits.reduce((sum, hit) => {
    if (hit.offsetMs === null) return sum;
    const size = Math.abs(hit.offsetMs);
    return sum + (size <= TAP_GREAT_MS ? 1 : Math.max(0, 1 - (size - TAP_GREAT_MS) / Math.max(1, windowMs - TAP_GREAT_MS)));
  }, 0);
  const matched = hits.filter(hit => hit.offsetMs !== null);
  const score = targets.length === 0 ? 0 : Math.max(0, Math.round(100 * (credit - extraTaps * .5) / targets.length));
  return {
    hits, extraTaps, score,
    averageOffsetMs: matched.length ? Math.round(matched.reduce((sum, hit) => sum + hit.offsetMs!, 0) / matched.length) : null,
    great: hits.filter(hit => hit.rating === "great").length,
    good: hits.filter(hit => hit.rating === "good").length,
    missed: hits.filter(hit => hit.rating === "missed").length,
  };
}

/** One sentence of coaching from a tap score. */
export function tapAdvice(result: TapScore) {
  if (result.missed > result.hits.length / 2) return "Over half the hits were missed. Count the pattern aloud with the click, then try again.";
  if (result.averageOffsetMs !== null && result.averageOffsetMs < -35) return "Rushing: taps land ahead of the beat on average.";
  if (result.averageOffsetMs !== null && result.averageOffsetMs > 35) return "Dragging: taps land behind the beat on average.";
  if (result.extraTaps > 2) return `${result.extraTaps} taps landed where the pattern has no hit.`;
  if (result.score >= 90) return "Timing is solid. Play it on the guitar next.";
  return "Repeat at this speed until most hits are on the beat, then speed up.";
}

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
export const pitchClass = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];
