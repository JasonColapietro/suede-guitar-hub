import { learningHandlers } from "@/lib/learning-auth/service-handlers";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

export const runtime = "nodejs";

export const POST = learningHandlers.notification;

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["POST"];
const notAllowed = methodNotAllowed(SERVED);
export const GET = notAllowed;
export const HEAD = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
