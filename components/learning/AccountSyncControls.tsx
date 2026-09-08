"use client";
import { useState } from "react";
import { AccountSyncClient, activeSyncAccountKey } from "@/lib/learning-sync/client";
import { syncLessonMap } from "@/lib/learning-sync/evidence";
import { useAccountSync, useLearningAccess } from "./LearningAccessProvider";

const errorMessage = (code: string | null) => code === "storage_unavailable" ? "Browser storage is unavailable. Enable device storage or leave private browsing before syncing; current local attempts are kept only while this page is open." : code === "sync_epoch_changed" ? "Cloud history was reset elsewhere. Pause, then enable sync again to start a new history. Earlier device records are preserved." : ["account_changed", "sign_in_required"].includes(code ?? "") ? "Your sign-in changed. Reload this page before syncing." : code === "invalid_sync_queue" || code === "attempt_identity_conflict" ? "Some saved sync data could not be verified. It has been preserved on this device. Sync is paused until it can be recovered." : "Sync could not finish. Your pending attempts remain on this device. Check your connection and retry.";

export function AccountSyncControls() {
  const access = useLearningAccess();
  const sync = useAccountSync();
  const [confirmReset, setConfirmReset] = useState(false);
  if (!access.enabled || !access.accountId) return null;
  if (access.status !== "verified") return <p>Account access could not be verified. Sync is paused; your device history remains available. Reload this page to retry.</p>;
  const busy = sync.status === "syncing";
  return <section aria-labelledby="account-sync-heading">
    <h2 id="account-sync-heading">Practice sync</h2>
    <p>Enable sync to save new practice attempts to this account and bring its saved attempts to this browser. Earlier local or guest records stay on this device and are not uploaded. Microphone audio is never uploaded.</p>
    <p role="status" aria-live="polite">{sync.status === "suspended" ? "Sync suspended because your sign-in changed." : busy ? "Syncing practice…" : sync.status === "error" ? errorMessage(sync.error) : sync.enabled ? sync.pending ? `${sync.pending} attempts waiting to sync.` : "Practice is synced." : "Sync is off."}</p>
    {sync.pending > 0 && <p>{sync.pending} pending {sync.pending === 1 ? "attempt is" : "attempts are"} saved on this device.</p>}
    {sync.enabled ? <><button className="button" onClick={() => sync.client?.pause()}>Pause sync</button>{!busy && <button className="button" onClick={() => void sync.client?.sync()}>Sync now</button>}</> : <button className="button" disabled={!sync.client || busy || sync.status === "suspended"} onClick={() => void sync.client?.enable()}>Enable sync</button>}
    <details><summary>Reset cloud practice history</summary><p>This deletes the account’s cloud practice history and pauses sync. Purchase access is unchanged. Local device records are preserved and will not be uploaded again automatically.</p><label><input type="checkbox" checked={confirmReset} onChange={event => setConfirmReset(event.target.checked)} /> I want to delete this account’s cloud practice history.</label><p><button className="button" disabled={!confirmReset || !sync.client || busy || sync.status === "suspended"} onClick={() => { setConfirmReset(false); void sync.client?.resetCloudHistory(); }}>Delete cloud practice history</button></p></details>
  </section>;
}

export function ScopedAccountSignOut() {
  const { client } = useAccountSync();
  const access = useLearningAccess();
  function suspend() {
    if (client) { client.suspend(); return; }
    // Sign-out is available even if purchase verification or provider initialization failed.
    try {
      if (access.accountId) new AccountSyncClient(access.accountId, window.localStorage, (url, init) => fetch(url, init), syncLessonMap, () => crypto.randomUUID()).suspend();
      else window.localStorage.setItem(activeSyncAccountKey, "");
    } catch { try { window.localStorage.setItem(activeSyncAccountKey, ""); } catch { /* No durable browser queue can be accessed in this context. */ } }
  }
  return <form action="/auth/sign-out" method="post" onSubmit={suspend}><button type="submit" className="button">Sign out on this device</button></form>;
}
