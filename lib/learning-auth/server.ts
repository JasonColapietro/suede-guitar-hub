import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { accountConfiguration } from "./config";
import { parseAccountBearer, verifiedProviderUser } from "./identity";

export async function accountServerClient(options: { readOnly?: boolean } = {}) {
  const config = accountConfiguration();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch (error) { if (!options.readOnly) throw error; /* Proxy refreshes read-only Server Component cookies. */ }
      },
    },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

/** Every data route verifies with Auth; cookie contents alone never grant access. */
export async function resolveAccount(request?: Request) {
  const config = accountConfiguration();
  if (!config) return null;
  const authorization = request?.headers.get("authorization");
  const bearer = parseAccountBearer(authorization);
  const client = bearer ? createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${bearer}` },
      fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  }) : await accountServerClient({ readOnly: request === undefined });
  if (!client) return null;
  const user = await verifiedProviderUser(() => bearer ? client.auth.getUser(bearer) : client.auth.getUser());
  return user ? { client, user } : null;
}
