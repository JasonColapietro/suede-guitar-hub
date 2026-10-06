import type {Metadata} from 'next';
import Link from 'next/link';
import Article from '@/components/Article';
import {resolveAccount} from '@/lib/learning-auth/server';
import {getVerifiedLearningAccess} from '@/lib/learning-auth/access';
import {checkoutEnabled} from '@/lib/learning-billing/config';
import PurchaseLifetime from './purchase';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Complete Lifetime | GuitarHub',robots:{index:false,follow:false}};
export default async function UpgradePage({searchParams}:{searchParams:Promise<{checkout?:string}>}) {
 const params=await searchParams;const enabled=checkoutEnabled();
 const account=await resolveAccount().catch(()=>null);const access=account?await getVerifiedLearningAccess():null;
 const paid=access?.status==='verified'&&access.tracks.includes('guitar')&&access.tracks.includes('voice');
 return <Article eyebrow="GuitarHub" title="Make the next breakthrough." dek="Complete Lifetime opens the full guitar lesson path." updated="2026-10-05" showPracticeCallToAction={false}>
  {params.checkout==='cancelled'&&<p role="status">You returned from checkout. Your free lessons and PDF library are ready whenever you are.</p>}
  <h2>Complete Lifetime · $79 USD</h2><p>One payment. No subscription or renewal.</p>
  <ul><li>All 135 guided guitar lessons, including 114 beyond the free stages.</li><li>Song studies, reading checks and focused practice exercises.</li><li>Save your progress and return to the next lesson.</li></ul>
  <p>Your free PDF library remains included with your free account.</p>
  {paid?<><p>You already have Complete Lifetime access.</p><Link className="button" href="/learn/guitar">Continue learning</Link></>
   :!enabled?<p>Web checkout is not available yet. <Link href="/learn/guitar">Start the free lesson path</Link>.</p>
   :!account?<Link className="button" href="/account?next=%2Faccount%2Fupgrade">Create your free account or sign in to continue</Link>
   :access?.status==='unavailable'?<p>We could not check your existing purchase access. Please try again shortly before purchasing.</p>
   :<><p>We check for an existing account-linked GuitarHub lifetime purchase before opening secure checkout.</p><PurchaseLifetime /></>}
  <p><Link href="/account">Your account and purchase status</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p>
 </Article>;
}
