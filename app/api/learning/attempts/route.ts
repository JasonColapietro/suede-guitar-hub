import { learningHandlers } from "@/lib/learning-auth/service-handlers";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

export const runtime = "nodejs";

export const GET = learningHandlers.readAttempts;
export const POST = learningHandlers.appendAttempts;
export const DELETE = learningHandlers.clearHistory;

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["GET", "POST", "DELETE"];
const notAllowed = methodNotAllowed(SERVED);
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
