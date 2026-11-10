"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { guestLearningAccess, hasVerifiedTrackAccess, type LearningAccess } from "@/lib/learning/access";
import { FREE_MODULE_STORAGE_KEY } from "@/lib/learning/free-module";
import { adoptServerFreeModule, browserStorage, currentFreeModuleChoice, subscribeFreeModuleChoice } from "@/lib/learning/free-module-store";
import { AccountSyncClient, accountSyncEligible, type SyncSnapshot } from "@/lib/learning-sync/client";
import { syncLessonMap } from "@/lib/learning-sync/evidence";

const LearningAccessContext = createContext<LearningAccess>(guestLearningAccess);
const AccountSyncContext = createContext<{ client: AccountSyncClient | null; storageUnavailable: boolean }>({ client: null, storageUnavailable: false });
const empty: SyncSnapshot = { status: "off", pending: 0, attempts: [], error: null, enabled: false };
const emptySnapshot = () => empty;
const noopSubscribe = () => () => {};
const hydrated = () => true;
const notHydrated = () => false;

function subscribeToFreeModule(onChange: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === null || event.key === FREE_MODULE_STORAGE_KEY) onChange(); };
  window.addEventListener("storage", storage);
  const unsubscribe = subscribeFreeModuleChoice(onChange);
  return () => { window.removeEventListener("storage", storage); unsubscribe(); };
}
const localFreeModuleId = () => currentFreeModuleChoice(browserStorage())?.moduleId ?? null;
const noFreeModule = () => null;

/**
 * Keeps a signed-in account and this browser on one free module. The server's
 * choice replaces the local one; a local choice the account lacks is stored on
 * the account, adopted as the server returns it, and the page re-rendered.
 * Rendered only in the browser, after hydration.
 */
function FreeModuleAccountSync({ serverModuleId }: { serverModuleId: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const storage = browserStorage();
    if (serverModuleId) { adoptServerFreeModule(storage, serverModuleId); return; }
    const local = currentFreeModuleChoice(storage);
    if (!local) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/learning/free-module", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ moduleId: local.moduleId }) });
        const body: unknown = response.ok ? await response.json() : null;
        const stored = typeof body === "object" && body !== null && "freeModuleId" in body ? body.freeModuleId : null;
        if (cancelled || typeof stored !== "string") return;
        adoptServerFreeModule(storage, stored);
        router.refresh();
      } catch { /* The local choice keeps the module open; the next visit tries again. */ }
    })();
    return () => { cancelled = true; };
  }, [serverModuleId, router]);
  return null;
}

export function LearningAccessProvider({ access, children }: { access: LearningAccess; children: React.ReactNode }) {
  const [client, setClient] = useState<AccountSyncClient | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  useEffect(() => {
    // Disabled accounts, signed-out and unverified visitors never reach the sync API.
    const scope = { enabled: access.enabled, status: access.status, accountId: access.accountId };
    if (!accountSyncEligible(scope)) return;
    let current: AccountSyncClient;
    try { current = new AccountSyncClient(scope.accountId, window.localStorage, (url, init) => fetch(url, init), syncLessonMap, () => crypto.randomUUID()); }
    catch { setStorageUnavailable(true); return; }
    setStorageUnavailable(false);
    current.activate();
    setClient(current);
    const wake = () => { void current.sync(); };
    let refreshTimer: number | undefined;
    const storage = (event: StorageEvent) => {
      if (event.key !== null && !event.key.startsWith("guitarhub.account-sync.v1.")) return;
      if (event.key === null || event.key.endsWith(".consent") || event.key.endsWith(".active")) { current.externalChange(); wake(); return; }
      // A downloaded page can write 100 immutable keys. Refresh other tabs once per batch.
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { current.externalChange(); wake(); }, 50);
    };
    window.addEventListener("storage", storage);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    const timer = window.setInterval(wake, 30_000);
    wake();
    return () => { current.dispose(); window.clearTimeout(refreshTimer); window.removeEventListener("storage", storage); window.removeEventListener("online", wake); window.removeEventListener("focus", wake); window.clearInterval(timer); };
  }, [access.enabled, access.accountId, access.status]);
  const scopedClient = accountSyncEligible(access) && client?.accountId === access.accountId ? client : null;
  // The account's stored module wins; a guest's comes from this browser. The
  // server render has no storage, so it starts from the account's alone.
  const localModuleId = useSyncExternalStore(subscribeToFreeModule, localFreeModuleId, noFreeModule);
  const freeModuleId = access.freeModuleId ?? localModuleId;
  const value = useMemo(() => ({ ...access, freeModuleId }), [access, freeModuleId]);
  const inBrowser = useSyncExternalStore(noopSubscribe, hydrated, notHydrated);
  // Purchasers have every module; their free-module choice is left alone.
  const syncFreeModule = inBrowser && access.enabled && access.status === "verified" && access.accountId !== null && !hasVerifiedTrackAccess("guitar", access);
  return <LearningAccessContext.Provider value={value}><AccountSyncContext.Provider value={{ client: scopedClient, storageUnavailable }}>
    {syncFreeModule && <FreeModuleAccountSync serverModuleId={access.freeModuleId} />}
    {children}
  </AccountSyncContext.Provider></LearningAccessContext.Provider>;
}

export function useLearningAccess() { return useContext(LearningAccessContext); }
export function useAccountSync() {
  const { client, storageUnavailable } = useContext(AccountSyncContext);
  const snapshot = useSyncExternalStore(client?.subscribe ?? noopSubscribe, client?.getSnapshot ?? emptySnapshot, emptySnapshot);
  return { client, ...snapshot, ...(storageUnavailable ? { status: "error" as const, error: "storage_unavailable" } : {}) };
}
