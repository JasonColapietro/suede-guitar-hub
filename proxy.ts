import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accountConfiguration } from "@/lib/learning-auth/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const config = accountConfiguration();
  if (!config || request.headers.has("authorization")) return response;
  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
  try { await client.auth.getClaims(); } catch { /* Routes independently verify fresh Auth identity and fail closed. */ }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/account/:path*", "/auth/:path*", "/api/learning/:path*"] };
