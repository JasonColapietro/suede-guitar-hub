import test from 'node:test';
import assert from 'node:assert/strict';
import {createBillingHTTPHandlers} from '../lib/learning-billing/http-handlers.ts';
function harness(options:{signedIn?:boolean;paid?:boolean;live?:boolean;badSignature?:boolean;url?:string;enabled?:boolean}={}) {
 const calls:string[]=[];
 const handlers=createBillingHTTPHandlers({enabled:()=>options.enabled!==false,checkoutEnabled:()=>true,account:async()=>options.signedIn===false?null:'11111111-1111-4111-8111-111111111111',protect:async()=>{calls.push('protect');},hasLifetime:async()=>options.paid===true,checkout:async()=>{calls.push('checkout');return {state:'checkout',url:options.url??'https://checkout.stripe.com/c/pay/cs_test_abc'};},restore:async()=>{calls.push('restore');return 'paid';},livemode:()=>false,verifyEvent:async(body)=>{if(options.badSignature)throw Error('invalid');return {...JSON.parse(body),livemode:options.live===true};},sessionEvent:async id=>{calls.push('session:'+id);},paymentEvent:async id=>{calls.push('payment:'+id);}});
 return {calls,handlers};
}
const request=(body:unknown={},headers:Record<string,string>={})=>new Request('https://guitarhub.org/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json',origin:'https://guitarhub.org',...headers},body:JSON.stringify(body)});
test('checkout fails closed when disabled, signed out or cross-origin; server-owned amount cannot be changed',async()=>{
 for(const [options,headers,status] of [[{enabled:false},{},503],[{signedIn:false},{},401],[{}, {origin:'https://evil.example'},403]] as const){const h=harness(options);assert.equal((await h.handlers.checkout(request({},headers))).status,status);assert.deepEqual(h.calls,[]);}
 const h=harness();const r=await h.handlers.checkout(request({amount:1,accountId:'attacker'}));assert.equal(r.status,200);assert.match(r.headers.get('cache-control')??'',/no-store/);assert.deepEqual(h.calls,['protect','checkout']);
});
test('existing lifetime owner bypasses new checkout and unsafe provider URLs are rejected',async()=>{
 const h=harness({paid:true});assert.deepEqual(await (await h.handlers.checkout(request())).json(),{state:'paid',destination:'/learn/guitar'});assert.deepEqual(h.calls,['protect']);
 assert.equal((await harness({url:'https://evil.example'}).handlers.checkout(request())).status,503);
});
test('webhook enforces signature and environment, processes delayed payment and revocation events, and ignores unrelated events',async()=>{
 const headers={'stripe-signature':'fixture'};
 for(const options of [{badSignature:true},{live:true}]){const h=harness(options);assert.equal((await h.handlers.webhook(request({type:'checkout.session.completed',id:'cs_test_abc'},headers))).status,400);assert.deepEqual(h.calls,[]);}
 const h=harness();
 for(const type of ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'])assert.equal((await h.handlers.webhook(request({type,id:'cs_test_abc'},headers))).status,200);
 for(const type of ['charge.refunded','charge.dispute.created','charge.dispute.closed'])await h.handlers.webhook(request({type,id:'evt_fixture',paymentId:'pi_fixture'},headers));
 await h.handlers.webhook(request({type:'customer.updated',id:'cus_unrelated'},headers));
 assert.deepEqual(h.calls,['session:cs_test_abc','session:cs_test_abc','session:cs_test_abc','payment:pi_fixture','payment:pi_fixture','payment:pi_fixture']);
});
test('restore requires authenticated same-origin POST and bounded session ID',async()=>{
 const h=harness();assert.equal((await h.handlers.restore(request({sessionId:'https://evil.example'}))).status,400);assert.equal((await h.handlers.restore(request({sessionId:'cs_test_abc'}))).status,200);
});
