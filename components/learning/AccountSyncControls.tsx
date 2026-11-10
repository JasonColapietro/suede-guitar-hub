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
  if (access.status !== "verified") return <><p>Account access could not be verified. Sync is paused; your device history remains available. Reload this page to retry.</p><DeleteAccountControl /></>;
  const busy = sync.status === "syncing";
  return <><section aria-labelledby="account-sync-heading">
    <h2 id="account-sync-heading">Practice sync</h2>
    <p>Enable sync to save new practice attempts to this account and bring its saved attempts to this browser. Earlier local or guest records stay on this device and are not uploaded. Microphone audio is never uploaded.</p>
    <p role="status" aria-live="polite">{sync.status === "suspended" ? "Sync suspended because your sign-in changed." : busy ? "Syncing practice…" : sync.status === "error" ? errorMessage(sync.error) : sync.enabled ? sync.pending ? `${sync.pending} attempts waiting to sync.` : "Practice is synced." : "Sync is off."}</p>
    {sync.pending > 0 && <p>{sync.pending} pending {sync.pending === 1 ? "attempt is" : "attempts are"} saved on this device.</p>}
    {sync.enabled ? <><button className="button" onClick={() => sync.client?.pause()}>Pause sync</button>{!busy && <button className="button" onClick={() => void sync.client?.sync()}>Sync now</button>}</> : <button className="button" disabled={!sync.client || busy || sync.status === "suspended"} onClick={() => void sync.client?.enable()}>Enable sync</button>}
    <details><summary>Reset cloud practice history</summary><p>This deletes the account’s cloud practice history and pauses sync. Purchase access is unchanged. Local device records are preserved and will not be uploaded again automatically.</p><label><input type="checkbox" checked={confirmReset} onChange={event => setConfirmReset(event.target.checked)} /> I want to delete this account’s cloud practice history.</label><p><button className="button" disabled={!confirmReset || !sync.client || busy || sync.status === "suspended"} onClick={() => { setConfirmReset(false); void sync.client?.resetCloudHistory(); }}>Delete cloud practice history</button></p></details>
  </section><DeleteAccountControl /></>;
}

/** Stops this browser's sync for the signed-in account; used before sign-out and account deletion. */
function suspendAccountSync(client: AccountSyncClient | null, accountId: string | null) {
  if (client) { client.suspend(); return; }
  // Available even if purchase verification or provider initialization failed.
  try {
    if (accountId) new AccountSyncClient(accountId, window.localStorage, (url, init) => fetch(url, init), syncLessonMap, () => crypto.randomUUID()).suspend();
    else window.localStorage.setItem(activeSyncAccountKey, "");
  } catch { try { window.localStorage.setItem(activeSyncAccountKey, ""); } catch { /* No durable browser queue can be accessed in this context. */ } }
}

/** Deletion acts on the signed-in account only; the server reads the account from the session. */
function DeleteAccountControl() {
  const { client } = useAccountSync();
  const access = useLearningAccess();
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState<"idle" | "deleting" | "deleted" | "error">("idle");
  async function deleteAccount() {
    setState("deleting");
    client?.pause();
    try {
      const response = await fetch("/api/learning/account", { method: "DELETE" });
      if (response.status !== 204) throw new Error(String(response.status));
    } catch { setState("error"); return; }
    setState("deleted");
    suspendAccountSync(client, access.accountId);
    try { await fetch("/auth/sign-out", { method: "POST" }); } catch { /* The account page shows any remaining sign-in. */ }
    // A full document load drops every client-side trace of the deleted session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/account?deleted=1");
  }
  return <section aria-labelledby="account-delete-heading">
    <h2 id="account-delete-heading">Delete your account</h2>
    <details><summary>Delete account</summary>
      <p>Deleting your account removes your GuitarHub cloud practice history, your free module choice and your GuitarHub email sign-ups, then signs you out. This cannot be undone.</p>
      <p>If you bought lifetime access, your purchase stays tied to your email. Sign in again with the same email to use it.</p>
      <p>Practice records saved in this browser stay on this device.</p>
      <label><input type="checkbox" checked={confirmed} disabled={state === "deleting" || state === "deleted"} onChange={event => setConfirmed(event.target.checked)} /> I understand that deleting my GuitarHub account cannot be undone.</label>
      <p><button className="button" disabled={!confirmed || state === "deleting" || state === "deleted"} onClick={() => void deleteAccount()}>Delete account</button></p>
      <p role="status" aria-live="polite">{state === "deleting" ? "Deleting your account…" : state === "deleted" ? "Account deleted. Signing you out…" : state === "error" ? "Account deletion did not finish. Check your connection and try again." : ""}</p>
    </details>
  </section>;
}

export function ScopedAccountSignOut() {
  const { client } = useAccountSync();
  const access = useLearningAccess();
  return <form action="/auth/sign-out" method="post" onSubmit={() => suspendAccountSync(client, access.accountId)}><button type="submit" className="button">Sign out on this device</button></form>;
}
