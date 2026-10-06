import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {verifiedBillingEvent,stripeBillingProvider} from '../lib/learning-billing/stripe.ts';
test('official Stripe signature verification rejects tampering, wrong secret and stale signatures',()=>{
 const stripe=new Stripe('sk_test_synthetic_only');const secret='whsec_synthetic_only';
 const body=JSON.stringify({id:'evt_fixture',object:'event',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_abc'}}});
 const header=stripe.webhooks.generateTestHeaderString({payload:body,secret});
 assert.equal(verifiedBillingEvent(stripe,secret,body,header).id,'cs_test_abc');
 assert.throws(()=>verifiedBillingEvent(stripe,secret,body+' ',header));
 assert.throws(()=>verifiedBillingEvent(stripe,'whsec_wrong',body,header));
 const stale=stripe.webhooks.generateTestHeaderString({payload:body,secret,timestamp:1});assert.throws(()=>verifiedBillingEvent(stripe,secret,body,stale));
});

test('offer validation pins the key own account rather than a connected account',async()=>{
 const {provider,stripe}=stripeBillingProvider({secretKey:'sk_test_synthetic_only',webhookSecret:'whsec_synthetic_only',accountId:'acct_approved',priceId:'price_test',productId:'prod_test',livemode:false,origin:'https://example.test'});
 let merchant='acct_approved';
 stripe.accounts.retrieve=(async id=>{assert.equal(id,null);return {id:merchant};}) as typeof stripe.accounts.retrieve;
 stripe.prices.retrieve=(async()=>({livemode:false,active:true,type:'one_time',recurring:null,unit_amount:7900,currency:'usd',product:{id:'prod_test',active:true}})) as unknown as typeof stripe.prices.retrieve;
 await provider.validateOffer();merchant='acct_wrong';await assert.rejects(()=>provider.validateOffer(),/offer_unavailable/);
});
