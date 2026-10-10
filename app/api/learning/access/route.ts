import { learningHandlers } from "@/lib/learning-auth/service-handlers";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

export const runtime = "nodejs";

export const GET = learningHandlers.access;

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["GET"];
const notAllowed = methodNotAllowed(SERVED);
export const POST = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
