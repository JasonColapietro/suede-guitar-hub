'use client';
import {useState} from 'react';
import Link from 'next/link';
const messages:Record<string,string>={paid:'Your Complete Lifetime access is ready.',pending:'Your payment is still processing. Check again shortly; access opens after payment is verified.',expired:'This checkout did not complete. You can return to the offer and try again.',refunded:'This purchase was refunded. Your free account and PDF library remain available.',disputed:'This purchase is under review. Contact account support for help.'};
export default function RestorePurchase({sessionId,initialState}:{sessionId:string;initialState:string}) {
 const [state,setState]=useState(initialState),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function restore(){setBusy(true);setError('');try{const r=await fetch('/api/billing/restore',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId})});const result=await r.json();if(!r.ok)throw Error('Could not verify');setState(result.state);}catch{setError('We could not verify this purchase. Sign in to the account used at checkout and try again, or contact account support.');}finally{setBusy(false);}}
 return <><p role="status">{error||messages[state]||'We could not check this purchase yet. Please try again.'}</p>{state==='paid'?<Link className="button" href="/learn/guitar">Start your next lesson</Link>:<button className="button" onClick={()=>void restore()} disabled={busy}>{busy?'Checking payment…':'Check purchase status'}</button>}{state==='expired'&&<p><Link href="/account/upgrade">Return to Complete Lifetime</Link></p>}</>;
}
