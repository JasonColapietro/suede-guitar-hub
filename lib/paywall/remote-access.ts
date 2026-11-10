/**
 * Whether this browser's account holds lifetime guitar access, read from
 * `GET /api/learning/access`. Only a 200 whose `tracks` include `"guitar"`
 * opens a paid tool; a signed-out visitor (401), accounts switched off, a
 * server error, an unreadable body, a network failure or no answer within
 * `PAID_ACCESS_TIMEOUT_MS` all leave it locked.
 */
export const PAID_ACCESS_TIMEOUT_MS = 8_000;

export async function fetchPaidAccess(fetcher: typeof fetch, timeoutMs: number = PAID_ACCESS_TIMEOUT_MS): Promise<"open" | "locked"> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"locked">((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve("locked"); }, timeoutMs);
  });
  const ask = (async (): Promise<"open" | "locked"> => {
    try {
      const response = await fetcher("/api/learning/access", { method: "GET", cache: "no-store", headers: { accept: "application/json" }, signal: controller.signal });
      if (response.status !== 200) return "locked";
      const body: unknown = await response.json();
      const tracks = typeof body === "object" && body !== null && "tracks" in body ? body.tracks : null;
      return Array.isArray(tracks) && tracks.includes("guitar") ? "open" : "locked";
    } catch {
      return "locked";
    }
  })();
  try {
    return await Promise.race([ask, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}
