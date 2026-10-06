import { AccountHTTPError } from '../learning-auth/http.ts';
import { accountUUID } from '../learning-account/contracts.ts';
import { decideLifetimeAccess, type CheckoutEvidence } from './evidence.ts';
import type { OrderStore, WebOrder } from './orders.ts';
export interface BillingProvider {
 validateOffer():Promise<void>;
 create(order:WebOrder):Promise<{id:string;url:string|null}>;
 retrieve(sessionId:string):Promise<{evidence:CheckoutEvidence;url:string|null}>;
}
export function createBillingEngine(deps:{store:OrderStore;provider:BillingProvider;livemode:boolean;priceId:string;productId:string;now?():Date}) {
 async function reconcile(order:WebOrder) {
  if(!order.sessionId) return order;
  const observedAt=(deps.now?.()??new Date()).toISOString();
  const {evidence}=await deps.provider.retrieve(order.sessionId);
  if(evidence.id!==order.sessionId)throw new AccountHTTPError(400,'invalid_purchase');
  const state=decideLifetimeAccess(order,evidence);
  return deps.store.record(order,state,evidence.payment?.id??null,observedAt);
 }
 return {
  reconcile,
  async access(accountId:string) {
   const orders=await deps.store.list(accountUUID(accountId),deps.livemode);
   // Never grant from a database status alone: refund/dispute state must be fresh.
   for(const order of orders) if(order.state!=='expired' && order.state!=='refunded' && (await reconcile(order)).state==='paid')return true;
   return false;
  },
  async checkout(accountId:string) {
   accountUUID(accountId);await deps.provider.validateOffer();
   for(let attempt=0;attempt<2;attempt++) {
    let order=await deps.store.reserve(accountId,deps.livemode,deps.priceId,deps.productId);
    if(order.accountId!==accountId||order.livemode!==deps.livemode)throw new AccountHTTPError(409,'purchase_owner_conflict');
    if(order.priceId!==deps.priceId||order.productId!==deps.productId)throw new AccountHTTPError(409,'offer_changed');
    if(order.sessionId) {
     order=await reconcile(order);
     if(order.state==='paid')return {state:'paid' as const};
     if(order.state==='disputed')throw new AccountHTTPError(409,'purchase_under_review');
     if(order.state==='expired'||order.state==='refunded')continue;
     const session=await deps.provider.retrieve(order.sessionId!);
     if(!session.url)throw new AccountHTTPError(409,'payment_processing');
     return {state:'checkout' as const,url:session.url};
    }
    // Stable database reservation ID is Stripe's idempotency key across retries/devices.
    const session=await deps.provider.create(order);
    await deps.store.bind(order,session.id);
    if(!session.url)throw new AccountHTTPError(503,'checkout_unavailable');
    return {state:'checkout' as const,url:session.url};
   }
   throw new AccountHTTPError(503,'checkout_unavailable');
  },
  async restore(accountId:string,sessionId:string) {
   const order=await deps.store.findBySession(sessionId);
   if(!order || order.accountId!==accountUUID(accountId)||order.livemode!==deps.livemode)throw new AccountHTTPError(404,'purchase_not_found');
   return (await reconcile(order)).state;
  },
  async webhookSession(sessionId:string) {
   let order=await deps.store.findBySession(sessionId);
   if(!order) {
    // A payment can beat the local bind write. Recover using the server-created order metadata.
    const {evidence}=await deps.provider.retrieve(sessionId);
    if(!evidence.orderId)return;
    order=await deps.store.findById(accountUUID(evidence.orderId));
    if(!order)return;
    decideLifetimeAccess(order,evidence); // Verify ownership/offer before binding.
    order=await deps.store.bind(order,sessionId);
   }
   if(order.livemode!==deps.livemode)throw new AccountHTTPError(400,'invalid_purchase');
   await reconcile(order);
  },
  async webhookPayment(paymentId:string) {
   const order=await deps.store.findByPayment(paymentId);
   if(order && order.livemode===deps.livemode)await reconcile(order);
  },
 };
}
