import { leadHandlers } from "@/lib/leads/service-handlers";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

export const runtime = "nodejs";
// Vercel Cron calls this once a day (vercel.json). GET handlers are dynamic by default
// since Next 15 and this one reads the Authorization header, so every call runs.
// Up to 200 sends, spaced for Resend's rate limit.
export const maxDuration = 300;

export const GET = leadHandlers.dispatch;

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["GET"];
const notAllowed = methodNotAllowed(SERVED);
export const POST = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
