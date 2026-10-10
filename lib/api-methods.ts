/**
 * Method handling for the route handlers under app/api.
 *
 * Next answers a method a route does not export with a bare 405 and no `Allow`
 * header, which RFC 9110 §15.5.6 requires on every 405. Each route therefore
 * exports the methods it does not serve as `methodNotAllowed(...)`, and an
 * explicit `OPTIONS` from `routeOptions(...)`: once a route exports a 405
 * handler for a method, Next's automatic OPTIONS would list that method as
 * allowed.
 */
export const HTTP_METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

const API_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } as const;

/** The `Allow` value for a route serving `served`: HEAD rides with GET, OPTIONS always. */
export function allowHeader(served: readonly HttpMethod[]): string {
  const allowed = new Set<HttpMethod>([...served, "OPTIONS"]);
  if (allowed.has("GET")) allowed.add("HEAD");
  return HTTP_METHODS.filter((method) => allowed.has(method)).join(", ");
}

export function methodNotAllowed(served: readonly HttpMethod[]) {
  const allow = allowHeader(served);
  return () => Response.json({ error: "method_not_allowed" }, { status: 405, headers: { ...API_HEADERS, Allow: allow } });
}

export function routeOptions(served: readonly HttpMethod[]) {
  const allow = allowHeader(served);
  return () => new Response(null, { status: 204, headers: { ...API_HEADERS, Allow: allow } });
}

/** The answer for a path under /api that no route serves: small JSON, not the HTML 404 page. */
export function apiNotFound() {
  return Response.json({ error: "not_found" }, { status: 404, headers: API_HEADERS });
}
