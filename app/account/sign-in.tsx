"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { safeAccountDestination } from "@/lib/learning-auth/config";
import { fieldGuideForDownload } from "@/lib/field-guides";

export default function AccountSignIn({ destination = "/account", signupEnabled = false }: { destination?: string; signupEnabled?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [retryAt]);
  useEffect(() => { if (sent) codeInput.current?.focus(); }, [sent]);

  async function authenticate(verify: boolean) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(verify ? "/auth/email/verify" : "/auth/email/send", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verify ? { email, code, next: destination } : { email }),
      });
      if (response.status === 429) {
        const retry = Math.min(3600, Math.max(1, Number(response.headers.get("retry-after")) || 60));
        setRetryAt(Date.now() + retry * 1000); setRateLimited(true);
        setMessage("Too many attempts. Please wait before trying again."); return;
      }
      if (response.status === 403) { setMessage("We could not verify this browser. Refresh the page and try again. Your selected guide will stay here."); return; }
      if (!response.ok) throw new Error("sign_in_failed");
      setRateLimited(false);
      if (verify) {
        const result = await response.json();
        const next = safeAccountDestination(typeof result.destination === "string" ? result.destination : null);
        // Render the selected guide after verification. Never hand a file URL to the RSC router.
        router.replace(fieldGuideForDownload(next) ? `/account?next=${encodeURIComponent(next)}` : next);
        router.refresh(); return;
      }
      setSent(true); setCode(""); setRetryAt(Date.now() + 60_000);
      setMessage(signupEnabled ? "Check your inbox for an email code. If it does not arrive, check spam or resend after one minute." : "If this email matches an existing Suede account, check your inbox for a sign-in code.");
    } catch { setMessage(verify ? "The code could not be verified. Check the newest email and code, then try again." : "We could not send a code right now. Please try again shortly. Your selected guide and local practice are still available."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void authenticate(sent); }
  return <form onSubmit={submit} aria-busy={busy}>
    <p><label htmlFor="account-email">{signupEnabled ? "Email address" : "Email for your existing Suede account"}</label><br />
      <input style={{maxWidth:"100%",fontSize:"1rem"}} id="account-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} readOnly={sent} onChange={(event) => setEmail(event.target.value)} /></p>
    {sent && <p><label htmlFor="account-code">Email code</label><br />
      <input style={{maxWidth:"100%",fontSize:"1rem"}} ref={codeInput} id="account-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required value={code} onChange={(event) => setCode(event.target.value)} /></p>}
    <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
      <button type="submit" className="button" disabled={busy || ((!sent || rateLimited) && seconds > 0)}>{busy ? "Please wait…" : sent ? "Verify and continue" : "Send an email code"}</button>
      {sent && <>
        <button type="button" disabled={busy || seconds > 0} onClick={() => void authenticate(false)}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}</button>
        <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); setMessage(""); }}>Use another email</button>
      </>}
    </div>
    {!sent && seconds > 0 && <p>Please wait {seconds}s before requesting another code.</p>}
    {message && <p role="status" aria-live="polite">{message}</p>}
  </form>;
}
