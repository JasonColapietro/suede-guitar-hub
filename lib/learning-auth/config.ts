export type PublicAccountConfiguration = { url: string; publishableKey: string };

export function accountConfiguration(): PublicAccountConfiguration | null {
  if (process.env.GUITARHUB_ACCOUNTS_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey?.trim() || !process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== "https://drzuelosizfllruocmly.supabase.co" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return { url: parsed.origin, publishableKey };
  } catch { return null; }
}

/** Callback destinations stay inside the account and learning surfaces. */
export function safeAccountDestination(value: string | null): string {
  if (!value || !/^\/(?:account|learn)(?:[/?]|$)/.test(value) || /[\\\r\n]/.test(value)) return "/account";
  try {
    const parsed = new URL(value, "https://guitarhub.org");
    if (parsed.origin !== "https://guitarhub.org" || !/^\/(?:account|learn)(?:\/|$)/.test(parsed.pathname)) return "/account";
    return parsed.pathname + parsed.search;
  } catch { return "/account"; }
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
