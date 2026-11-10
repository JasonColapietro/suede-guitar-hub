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

/** Callback destinations stay inside the account, learning, tool and checkout surfaces. */
export function safeAccountDestination(value: unknown): string {
  if (typeof value !== "string" || !/^\/(?:account|learn|advanced|session|readiness|log|checkout)(?:[/?]|$)/.test(value) || /[\\\r\n]/.test(value)) return "/account";
  try {
    const parsed = new URL(value, "https://guitarhub.org");
    if (parsed.origin !== "https://guitarhub.org" || !/^\/(?:account|learn|advanced|session|readiness|log|checkout)(?:\/|$)/.test(parsed.pathname)) return "/account";
    return parsed.pathname + parsed.search;
  } catch { return "/account"; }
}

/** The account page's link back to a safe destination, named for what is there. */
export function accountReturnLabel(destination: string): string {
  const path = destination.split("?")[0];
  if (path === "/learn/guitar/routine") return "Return to the practice routine";
  if (/^\/learn\/(guitar|voice)\/[a-z]-l\d+-m\d+-\d+$/.test(path)) return "Return to your lesson";
  if (/^\/learn(\/|$)/.test(path)) return "Return to the lessons";
  if (/^\/advanced(\/|$)/.test(path)) return "Return to the Advanced Lab";
  if (path === "/session") return "Return to the session builder";
  if (path === "/readiness") return "Return to the song readiness score";
  if (path === "/log") return "Return to the practice log";
  if (/^\/checkout(\/|$)/.test(path)) return "Return to your purchase";
  return "Continue where you left off";
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
