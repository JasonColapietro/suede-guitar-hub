import type {Metadata} from 'next';
import Link from 'next/link';
import Article from '@/components/Article';
import {resolveAccount} from '@/lib/learning-auth/server';
import {billingRuntime} from '@/lib/learning-billing/runtime';
import RestorePurchase from './restore';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Purchase status | GuitarHub',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function CompletePage({searchParams}:{searchParams:Promise<{session_id?:string}>}) {
 const {session_id:sessionId}=await searchParams;const valid=typeof sessionId==='string'&&/^cs_(?:test_|live_)?[a-zA-Z0-9]{1,200}$/.test(sessionId);
 const account=await resolveAccount().catch(()=>null);let state='unavailable';
 if(account&&valid){try{state=await billingRuntime()?.engine.restore(account.user.id,sessionId)??'unavailable';}catch{/* Never expose another account's purchase or provider details. */}}
 return <Article eyebrow="Your account" title="Your purchase" dek="Return to your next lesson when payment is verified." updated="2026-10-05" showPracticeCallToAction={false}>
 {!valid?<p>This purchase link is not valid. <Link href="/account">Return to your account</Link>.</p>:!account?<Link className="button" href={`/account?next=${encodeURIComponent(`/account/complete?session_id=${sessionId}`)}`}>Sign in to check your purchase</Link>:<RestorePurchase sessionId={sessionId} initialState={state}/>}
 <p><Link href="/account">Your account and free PDFs</Link> · <a href="mailto:info@suedeai.ai?subject=GuitarHub%20purchase%20help">Purchase help</a></p>
 </Article>;
}
