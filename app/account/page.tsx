import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { accountConfiguration } from "@/lib/learning-auth/config";
import { resolveAccount } from "@/lib/learning-auth/server";
import AccountSignIn from "./sign-in";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account | GuitarHub", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configuration = accountConfiguration();
  let unavailable = false;
  const account = configuration ? await resolveAccount().catch(() => { unavailable = true; return null; }) : null;
  const params = await searchParams;
  return <Article eyebrow="GuitarHub" title="Your account" dek="Keep playing on your own terms." updated="2026-09-07" showPracticeCallToAction={false}>
    {!configuration ? <p>Account sync is not available yet. Lessons and practice records on this device remain available.</p>
      : unavailable ? <p>Account sign-in is temporarily unavailable. Your local lessons and practice remain available.</p> : account ? <>
        <p>Signed in as {account.user.email ?? "your Suede account"}.</p>
        <p>Signing in does not upload earlier practice records or change an App Store purchase. Your local history stays on this device.</p>
        <form action="/auth/sign-out" method="post"><button type="submit" className="button">Sign out on this device</button></form>
      </> : <>
        <p>Sign in to an existing Suede account using an email code. This page does not create an account. The free lesson sampler and local practice do not require one.</p>
        {params.error && <p role="alert">Sign-in did not finish. Please try again.</p>}
        <AccountSignIn />
      </>}
    <p><Link href="/learn/guitar">Return to guitar lessons</Link> · <Link href="/privacy">Privacy</Link></p>
  </Article>;
}
