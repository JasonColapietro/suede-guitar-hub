"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { guestLearningAccess, type LearningAccess } from "@/lib/learning/access";
import { AccountSyncClient, type SyncSnapshot } from "@/lib/learning-sync/client";
import { syncLessonMap } from "@/lib/learning-sync/evidence";

const LearningAccessContext = createContext<LearningAccess>(guestLearningAccess);
const AccountSyncContext = createContext<{ client: AccountSyncClient | null; storageUnavailable: boolean }>({ client: null, storageUnavailable: false });
const empty: SyncSnapshot = { status: "off", pending: 0, attempts: [], error: null, enabled: false };
const emptySnapshot = () => empty;
const noopSubscribe = () => () => {};

export function LearningAccessProvider({ access, children }: { access: LearningAccess; children: React.ReactNode }) {
  const [client, setClient] = useState<AccountSyncClient | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  useEffect(() => {
    if (!access.enabled || access.status !== "verified" || !access.accountId) return;
    let current: AccountSyncClient;
    try { current = new AccountSyncClient(access.accountId, window.localStorage, (url, init) => fetch(url, init), syncLessonMap, () => crypto.randomUUID()); }
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
  const scopedClient = access.enabled && access.status === "verified" && client?.accountId === access.accountId ? client : null;
  return <LearningAccessContext.Provider value={access}><AccountSyncContext.Provider value={{ client: scopedClient, storageUnavailable }}>{children}</AccountSyncContext.Provider></LearningAccessContext.Provider>;
}

export function useLearningAccess() { return useContext(LearningAccessContext); }
export function useAccountSync() {
  const { client, storageUnavailable } = useContext(AccountSyncContext);
  const snapshot = useSyncExternalStore(client?.subscribe ?? noopSubscribe, client?.getSnapshot ?? emptySnapshot, emptySnapshot);
  return { client, ...snapshot, ...(storageUnavailable ? { status: "error" as const, error: "storage_unavailable" } : {}) };
}
