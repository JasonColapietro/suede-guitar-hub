import test from 'node:test';
import assert from 'node:assert/strict';
import {createBillingEngine,type BillingProvider} from '../lib/learning-billing/engine.ts';
import type {OrderStore,WebOrder} from '../lib/learning-billing/orders.ts';
import type {CheckoutEvidence} from '../lib/learning-billing/evidence.ts';
const account='11111111-1111-4111-8111-111111111111',other='33333333-3333-4333-8333-333333333333';
function harness() {
 let order:WebOrder={id:'22222222-2222-4222-8222-222222222222',accountId:account,livemode:false,priceId:'price_test',productId:'prod_test',sessionId:null,paymentIntentId:null,state:'pending',revision:0};
 const evidence:CheckoutEvidence={id:'cs_test_owned',livemode:false,mode:'payment',orderId:order.id,accountId:account,clientReference:account,status:'open',paymentStatus:'unpaid',currency:'usd',amount:7900,lines:[{priceId:'price_test',productId:'prod_test',quantity:1,amount:7900,currency:'usd'}],payment:null};
 let outage=false,createCalls=0;
 const store:OrderStore={history:async()=>[{...order}],reserve:async()=>({...order}),findById:async id=>id===order.id?{...order}:null,findBySession:async id=>id===order.sessionId?{...order}:null,findByPayment:async id=>id===order.paymentIntentId?{...order}:null,list:async id=>id===account?[{...order}]:[],bind:async(_,id)=>{if(order.sessionId&&order.sessionId!==id)throw Error('owner conflict');order.sessionId=id;return {...order};},record:async(_,state,payment)=>{if(order.state!=='refunded')order={...order,state,paymentIntentId:payment};return {...order};}};
 const provider:BillingProvider={validateOffer:async()=>{},create:async()=>{createCalls++;return {id:evidence.id,url:'https://checkout.stripe.com/c/pay/cs_test_owned'};},retrieve:async()=>{if(outage)throw Error('provider offline');return {evidence:structuredClone(evidence),url:evidence.status==='open'?'https://checkout.stripe.com/c/pay/cs_test_owned':null};}};
 const engine=createBillingEngine({store,provider,livemode:false,priceId:'price_test',productId:'prod_test'});
 function paid(){Object.assign(evidence,{status:'complete',paymentStatus:'paid',payment:{id:'pi_test',status:'succeeded',currency:'usd',amount:7900,received:7900,chargePaid:true,amountRefunded:0,disputed:false,disputes:[]}});}
 return {engine,evidence,store,provider,paid,order:()=>order,creates:()=>createCalls,setOutage:()=>{outage=true;}};
}
test('checkout retry reuses durable session, unpaid return cannot grant, paid webhook/return are idempotent',async()=>{
 const h=harness();assert.equal((await h.engine.checkout(account)).state,'checkout');assert.equal((await h.engine.checkout(account)).state,'checkout');assert.equal(h.creates(),1);
 assert.equal(await h.engine.restore(account,'cs_test_owned'),'pending');assert.equal(await h.engine.access(account),false);
 h.paid();await Promise.all([h.engine.webhookSession('cs_test_owned'),h.engine.webhookSession('cs_test_owned')]);
 assert.equal(await h.engine.restore(account,'cs_test_owned'),'paid');assert.equal(await h.engine.access(account),true);assert.equal((await h.engine.checkout(account)).state,'paid');assert.equal(h.creates(),1);
});
test('foreign return, mismatched provider evidence and provider outage cannot grant',async()=>{
 const h=harness();await h.engine.checkout(account);h.paid();
 await assert.rejects(()=>h.engine.restore(other,'cs_test_owned'),/purchase_not_found/);
 h.evidence.accountId=other;await assert.rejects(()=>h.engine.access(account),/invalid_purchase/);
 h.evidence.accountId=account;await h.engine.webhookSession('cs_test_owned');h.setOutage();await assert.rejects(()=>h.engine.access(account),/offline/);
});
test('fresh refunds revoke and stale paid webhooks cannot restore refunded purchase',async()=>{
 const h=harness();await h.engine.checkout(account);h.paid();await h.engine.webhookSession('cs_test_owned');h.evidence.payment!.amountRefunded=7900;
 await h.engine.webhookPayment('pi_test');assert.equal(await h.engine.access(account),false);
 h.evidence.payment!.amountRefunded=0;await h.engine.webhookSession('cs_test_owned');assert.equal(h.order().state,'refunded');assert.equal(await h.engine.access(account),false);
});
test('dispute suspends, new checkout is blocked, and fresh won dispute restores',async()=>{
 const h=harness();await h.engine.checkout(account);h.paid();await h.engine.webhookSession('cs_test_owned');Object.assign(h.evidence.payment!,{disputed:true,disputes:['needs_response']});
 await h.engine.webhookPayment('pi_test');assert.equal(await h.engine.access(account),false);await assert.rejects(()=>h.engine.checkout(account),/purchase_under_review/);
 h.evidence.payment!.disputes=['won'];await h.engine.webhookPayment('pi_test');assert.equal(await h.engine.access(account),true);
});
test('webhook can recover a checkout bind failure only for verified server-created order metadata',async()=>{
 const h=harness();h.paid();await h.engine.webhookSession('cs_test_owned');assert.equal(h.order().sessionId,'cs_test_owned');assert.equal(h.order().state,'paid');
});
