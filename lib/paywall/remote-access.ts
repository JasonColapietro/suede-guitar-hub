/**
 * Whether this browser's account holds lifetime guitar access, read from
 * `GET /api/learning/access`. Only a 200 whose `tracks` include `"guitar"`
 * opens a paid tool; a signed-out visitor (401), accounts switched off, a
 * server error, an unreadable body or a network failure all leave it locked.
 */
export async function fetchPaidAccess(fetcher: typeof fetch): Promise<"open" | "locked"> {
  try {
    const response = await fetcher("/api/learning/access", { method: "GET", cache: "no-store", headers: { accept: "application/json" } });
    if (response.status !== 200) return "locked";
    const body: unknown = await response.json();
    const tracks = typeof body === "object" && body !== null && "tracks" in body ? body.tracks : null;
    return Array.isArray(tracks) && tracks.includes("guitar") ? "open" : "locked";
  } catch {
    return "locked";
  }
}
