"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AccountSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(sent ? "/auth/email/verify" : "/auth/email/send", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sent ? { email, code } : { email }),
      });
      if (!response.ok) throw new Error("sign_in_failed");
      if (sent) { router.replace("/account"); router.refresh(); return; }
      setSent(true);
      setMessage("If this email matches an existing Suede account, check your inbox for a sign-in code.");
    } catch { setMessage(sent ? "The code could not be verified. Check the email and code, then try again." : "Sign-in is unavailable right now. Your local lessons and practice are still available."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} aria-busy={busy}>
    <p><label htmlFor="account-email">Email for your existing Suede account</label><br />
      <input id="account-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} readOnly={sent} onChange={(event) => setEmail(event.target.value)} /></p>
    {sent && <p><label htmlFor="account-code">Sign-in code</label><br />
      <input id="account-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required value={code} onChange={(event) => setCode(event.target.value)} /></p>}
    <button type="submit" className="button" disabled={busy}>{busy ? "Please wait…" : sent ? "Sign in" : "Send a sign-in code"}</button>
    {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); setMessage(""); }}>Use another email or request a new code</button>}
    {message && <p role="status" aria-live="polite">{message}</p>}
  </form>;
}
