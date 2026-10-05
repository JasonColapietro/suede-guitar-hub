import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { FIELD_GUIDES, fieldGuideForDownload, fieldGuidePdf } from "@/lib/field-guides";
import { accountConfiguration, safeAccountDestination } from "@/lib/learning-auth/config";
import { resolveAccount } from "@/lib/learning-auth/server";
import AccountSignIn from "./sign-in";
import { getVerifiedLearningAccess } from "@/lib/learning-auth/access";
import { LearningAccessProvider } from "@/components/learning/LearningAccessProvider";
import { AccountSyncControls, ScopedAccountSignOut } from "@/components/learning/AccountSyncControls";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account | GuitarHub", robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const configuration = accountConfiguration();
  let unavailable = false;
  const account = configuration ? await resolveAccount().catch(() => { unavailable = true; return null; }) : null;
  const params = await searchParams;
  const destination = safeAccountDestination(params.next ?? null);
  const selectedGuide = fieldGuideForDownload(destination);
  const access = account ? await getVerifiedLearningAccess() : null;
  return <Article eyebrow="GuitarHub" title="Your account" dek="Keep playing on your own terms." updated="2026-09-07" showPracticeCallToAction={false}>
    {selectedGuide && <section aria-label="Your selected free PDF">
      <h2>{selectedGuide.coverTitle}</h2>
      <p>This PDF is free with an account. No paid plan is required.</p>
      <p>{account && <><a className="button" href={fieldGuidePdf(selectedGuide)}>Download your free PDF</a>{" · "}</>}<Link href={selectedGuide.href}>Read this guide online</Link></p>
    </section>}
    {!configuration ? <p>Account sync is not available yet. Lessons and practice records on this device remain available.</p>
      : unavailable ? <p>Account sign-in is temporarily unavailable. Your local lessons and practice remain available.</p> : account ? <>
        <p>Signed in as {account.user.email ?? "your Suede account"}.</p>
        <section aria-label="Your PDF library"><h2>Your free PDF library</h2><p>All {FIELD_GUIDES.length} field guides are included with your account.</p><ul>{FIELD_GUIDES.map((guide) => <li key={guide.slug}><a href={fieldGuidePdf(guide)}>{guide.coverTitle} — free PDF</a></li>)}</ul></section>
        <p>Signing in does not upload earlier practice records or change an App Store purchase. Your local history stays on this device.</p>
        {access && <LearningAccessProvider access={access}><AccountSyncControls /><ScopedAccountSignOut /></LearningAccessProvider>}
      </> : <>
        <p>Sign in to an existing Suede account using an email code. This page does not create an account. The free lesson sampler and local practice do not require one.</p>
        {params.error && <p role="alert">Sign-in did not finish. Please try again.</p>}
        <AccountSignIn destination={destination} />
      </>}
    <p><Link href="/learn/guitar">Return to guitar lessons</Link> · <Link href="/privacy">Privacy</Link></p>
  </Article>;
}
