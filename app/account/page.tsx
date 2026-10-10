import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { APP_STORE, LIFETIME } from "@/lib/site";
import { accountConfiguration } from "@/lib/learning-auth/config";
import { resolveAccount } from "@/lib/learning-auth/server";
import AccountSignIn from "./sign-in";
import { getVerifiedLearningAccess } from "@/lib/learning-auth/access";
import { LearningAccessProvider } from "@/components/learning/LearningAccessProvider";
import { AccountSyncControls, ScopedAccountSignOut } from "@/components/learning/AccountSyncControls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account | GuitarHub", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configuration = accountConfiguration();
  let unavailable = false;
  const account = configuration ? await resolveAccount().catch(() => { unavailable = true; return null; }) : null;
  const params = await searchParams;
  const access = account ? await getVerifiedLearningAccess() : null;
  return <Article eyebrow="GuitarHub" title="Your account" dek="Keep playing on your own terms." updated="2026-09-07" showPracticeCallToAction={false}>
    {!configuration ? <p>Web purchase verification and account sync are not available yet. Lessons open with lifetime access, {LIFETIME.oneTime}, which you can buy or restore in <a href={APP_STORE.ios}>{APP_STORE.name}</a> for iPhone; your saved practice records remain on this device.</p>
      : unavailable ? <p>Account sign-in is temporarily unavailable. Lessons remain locked until purchase access can be verified. Your saved practice records are kept.</p> : account ? <>
        <p>Signed in as {account.user.email ?? "your Suede account"}.</p>
        <p>Signing in does not upload earlier practice records or change an App Store purchase. Your local history stays on this device.</p>
        {access && <LearningAccessProvider access={access}><AccountSyncControls /><ScopedAccountSignOut /></LearningAccessProvider>}
      </> : <>
        <p>Sign in to an existing Suede account using an email code. This page does not create an account. Lessons require verified lifetime access. The standalone practice tools do not require an account.</p>
        {params.error && <p role="alert">Sign-in did not finish. Please try again.</p>}
        <AccountSignIn />
      </>}
    <p><Link href="/learn/guitar">Return to guitar lessons</Link> · <Link href="/privacy">Privacy</Link></p>
  </Article>;
}
