import { leadHandlers } from "@/lib/leads/service-handlers";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

export const runtime = "nodejs";

/** The link in every email's footer: unsubscribes and shows a confirmation page. */
export const GET = leadHandlers.unsubscribe;
/** One-click unsubscribe from the mail client (RFC 8058), announced by the List-Unsubscribe-Post header. */
export const POST = leadHandlers.unsubscribePost;

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["GET", "POST"];
const notAllowed = methodNotAllowed(SERVED);
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
