import Stripe from 'stripe';
import { AccountHTTPError } from '../learning-auth/http.ts';
import type { BillingConfiguration } from './config';
import type { BillingProvider } from './engine';
import { LIFETIME_AMOUNT,LIFETIME_CURRENCY,type CheckoutEvidence } from './evidence.ts';
export function stripeBillingProvider(config:BillingConfiguration) {
 const stripe=new Stripe(config.secretKey,{apiVersion:'2026-08-26.dahlia',maxNetworkRetries:2,timeout:10_000});
 const provider:BillingProvider={
  async validateOffer() {
   const [account,price]=await Promise.all([stripe.accounts.retrieve(null),stripe.prices.retrieve(config.priceId,{expand:['product']})]);
   const product=price.product;
   if(account.id!==config.accountId||price.livemode!==config.livemode||!price.active||price.type!=='one_time'||price.recurring||price.unit_amount!==LIFETIME_AMOUNT||price.currency!==LIFETIME_CURRENCY||typeof product==='string'||product.deleted||product.id!==config.productId||!product.active)throw new AccountHTTPError(503,'offer_unavailable');
  },
  async create(order) {
   const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[{price:config.priceId,quantity:1}],
    client_reference_id:order.accountId,metadata:{guitarhub_order_id:order.id,guitarhub_account_id:order.accountId},
    payment_intent_data:{metadata:{guitarhub_order_id:order.id,guitarhub_account_id:order.accountId}},
    success_url:`${config.origin}/account/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${config.origin}/account/upgrade?checkout=cancelled`,
    integration_identifier:'guitarhub_lifetime_ynrxpq',
    adaptive_pricing:{enabled:false},
   },{idempotencyKey:`guitarhub-lifetime-${order.id}`});
   return {id:session.id,url:session.url};
  },
  async retrieve(id) {
   const s=await stripe.checkout.sessions.retrieve(id,{expand:['line_items.data.price','payment_intent.latest_charge']});
   if(s.line_items?.has_more)throw new AccountHTTPError(400,'invalid_purchase');
   const pi=s.payment_intent;let payment:CheckoutEvidence['payment']=null;
   if(pi && typeof pi!=='string') {
    payment={id:pi.id,status:pi.status,currency:pi.currency,amount:pi.amount,received:pi.amount_received,chargePaid:false,amountRefunded:0,disputed:false,disputes:[]};
    const charge=pi.latest_charge;
    if(charge && typeof charge!=='string') {
     const disputes=charge.disputed?await stripe.disputes.list({charge:charge.id,limit:100}):null;
     if(disputes?.has_more)throw new AccountHTTPError(503,'purchase_service_unavailable');
     payment={id:pi.id,status:pi.status,currency:pi.currency,amount:pi.amount,received:pi.amount_received,chargePaid:charge.paid,amountRefunded:charge.amount_refunded,disputed:charge.disputed,disputes:disputes?.data.map(d=>d.status)??[]};
    }
   }
   return {url:s.url,evidence:{id:s.id,livemode:s.livemode,mode:s.mode,orderId:s.metadata?.guitarhub_order_id??null,accountId:s.metadata?.guitarhub_account_id??null,clientReference:s.client_reference_id,status:s.status,paymentStatus:s.payment_status,currency:s.currency,amount:s.amount_total,
    lines:(s.line_items?.data??[]).map(line=>({priceId:line.price?.id??'',productId:typeof line.price?.product==='string'?line.price.product:line.price?.product.id??'',quantity:line.quantity,amount:line.amount_total,currency:line.currency})),payment}};
  },
 };
 return {provider,stripe};
}

export function verifiedBillingEvent(stripe:Stripe,secret:string,body:string,signature:string) {
 const event=stripe.webhooks.constructEvent(body,signature,secret);
 const object=event.data.object as {id:string;payment_intent?:string|{id:string}|null};
 return {type:event.type,livemode:event.livemode,id:object.id,paymentId:typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id??null};
}
