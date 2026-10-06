import { FIELD_GUIDES, fieldGuideFilename, fieldGuidePdf } from "./field-guides.ts";
import { accountErrorResponse } from "./learning-auth/http.ts";

const headers = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

/** Resolve identity before touching the private file; a paid grant is never required. */
export function createFieldGuideDownload(deps: {
  enabled(): boolean;
  resolveAccount(request: Request): Promise<unknown | null>;
  readPdf(filename: string): Promise<Uint8Array>;
}) {
  return async (request: Request, filename: string): Promise<Response> => {
    const guide = FIELD_GUIDES.find((entry) => fieldGuideFilename(entry) === filename);
    if (!guide) return new Response("Guide not found", { status: 404, headers });
    try {
      if (!deps.enabled()) return new Response("PDF downloads require a free account. Account sign-in is temporarily unavailable. You can still read this guide online.", { status: 503, headers });
      if (!await deps.resolveAccount(request)) {
        const target = new URL("/account", request.url);
        target.searchParams.set("next", fieldGuidePdf(guide));
        return new Response(null, { status: 303, headers: { ...headers, Location: target.toString() } });
      }
      const body = request.method === "HEAD" ? null : new Uint8Array(await deps.readPdf(filename));
      return new Response(body, { headers: {
        ...headers, "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      } });
    } catch (error) {
      const response = accountErrorResponse(error);
      for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      return response;
    }
  };
}
