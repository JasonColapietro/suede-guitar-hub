import { webPurchaseHistory } from "@/lib/learning-billing/runtime";
import { billingConfiguration } from "@/lib/learning-billing/config";
import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { FIELD_GUIDES, fieldGuideForDownload, fieldGuidePdf } from "@/lib/field-guides";
import { accountConfiguration, safeAccountDestination } from "@/lib/learning-auth/config";
import { resolveAccount } from "@/lib/learning-auth/server";
import { freeSignupEnabled } from "@/lib/learning-auth/signup-service-protection";
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
  const orders = account ? await webPurchaseHistory(account.user.id).catch(() => []) : [];
  const access = account ? await getVerifiedLearningAccess() : null;
  return <Article eyebrow="GuitarHub" title="Your account" dek="Keep playing on your own terms." updated="2026-09-07" showPracticeCallToAction={false}>
    {selectedGuide && <section aria-label="Your selected free PDF">
      <h2>{selectedGuide.coverTitle}</h2>
      <p>This PDF is free with an account. No paid plan is required.</p>
      <p>{account && <><a className="button" href={fieldGuidePdf(selectedGuide)}>Download your free PDF</a>{" · "}</>}<Link href={selectedGuide.href}>Read this guide online</Link></p>
    </section>}
    {!configuration ? <p>Web purchase verification and account sync are not available yet. Lessons require verified lifetime access; your saved practice records remain on this device.</p>
      : unavailable ? <p>Account sign-in is temporarily unavailable. Lessons remain locked until purchase access can be verified. Your saved practice records are kept.</p> : account ? <>
        <p>Signed in as {account.user.email ?? "your Suede account"}.</p>
        <section aria-label="Your PDF library"><h2>Your free PDF library</h2><p>All {FIELD_GUIDES.length} field guides are included with your account.</p><ul>{FIELD_GUIDES.map((guide) => <li key={guide.slug}><a href={fieldGuidePdf(guide)}>{guide.coverTitle} — free PDF</a></li>)}</ul></section>
        <p><a href="mailto:info@suedeai.ai?subject=GuitarHub%20account%20help">Account help or deletion request</a>. Your Suede account may also be used by other Suede products; tell us which product you need help with.</p>
        {billingConfiguration() && <section aria-label="Your membership"><h2>Your membership</h2><p>{access?.status === "verified" && access.tracks.includes("guitar") && access.tracks.includes("voice") ? "Complete Lifetime is active." : access?.status === "unavailable" ? "Purchase status is temporarily unavailable. Your free PDF library remains available." : "Your free account includes every PDF and the first two guitar stages."}</p><Link href="/account/upgrade">View Complete Lifetime access</Link>{orders.filter(order=>order.sessionId).map((order,index)=><p key={order.id}><Link href={`/account/complete?session_id=${encodeURIComponent(order.sessionId!)}`}>Check web purchase {index+1}</Link></p>)}<p>Sign in on any supported GuitarHub device to check account-linked purchases. For an unlinked App Store purchase, use Restore Purchases in GuitarHub for iPhone while signed in to this account.</p></section>}
        <p>Signing in does not upload earlier practice records or change an App Store purchase. Your local history stays on this device.</p>
        {access && <LearningAccessProvider access={access}>{process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY ? <AccountSyncControls /> : <p>Cloud practice sync is not enabled yet. Free PDFs and practice saved on this device remain available.</p>}<ScopedAccountSignOut /></LearningAccessProvider>}
      </> : <>
        <p>{freeSignupEnabled() ? "Create your free account or sign in with an email code. No password or payment card is needed. Your account includes every free PDF; paid lessons are a separate purchase." : "Sign in to an existing Suede account using an email code. This page does not create an account."} Lessons require verified lifetime access. The standalone practice tools do not require an account.</p>
        {params.error && <p role="alert">Sign-in did not finish. Please try again.</p>}
        <AccountSignIn destination={destination} signupEnabled={freeSignupEnabled()} />
      </>}
    <p><Link href="/learn/guitar">Return to guitar lessons</Link> · <Link href="/privacy">Privacy</Link></p>
  </Article>;
}
