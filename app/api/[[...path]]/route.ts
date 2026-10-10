import { apiNotFound } from "@/lib/api-methods";

/**
 * Any /api path no route serves. Without this, an unknown API URL rendered
 * the site's HTML 404 page (about 19.5 KB) to clients that expect JSON.
 * Static routes under app/api are more specific and always win over this
 * optional catch-all, so it only answers paths that would otherwise 404.
 */
export const GET = apiNotFound;
export const HEAD = apiNotFound;
export const POST = apiNotFound;
export const PUT = apiNotFound;
export const DELETE = apiNotFound;
export const PATCH = apiNotFound;
export const OPTIONS = apiNotFound;
