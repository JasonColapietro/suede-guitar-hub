'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function PurchaseLifetime() {
 const router=useRouter();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function purchase(){setBusy(true);setMessage('');try{
  const response=await fetch('/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json'},body:'{}',credentials:'same-origin'});
  const result=await response.json();
  if(!response.ok){setMessage(response.status===401?'Sign in again to continue.':response.status===429?`Please wait ${response.headers.get('retry-after')??60} seconds before trying again.`:result.error==='payment_processing'?'Your payment is processing. Check purchase status from your account before starting again.':result.error==='purchase_under_review'?'This purchase is under review. Contact account support for help.':'Checkout could not start. Please try again shortly.');return;}
  if(result.state==='paid'){router.push('/learn/guitar');return;}
  const url=new URL(result.url);if(url.origin!=='https://checkout.stripe.com')throw Error('Invalid checkout destination');
  window.location.assign(url.href);
 }catch{setMessage('Checkout could not start. Please try again shortly.');}finally{setBusy(false);}}
 return <><button className="button" disabled={busy} onClick={()=>void purchase()}>{busy?'Opening secure checkout…':'Unlock Complete Lifetime — $79'}</button>{message&&<p role="status">{message}</p>}</>;
}
