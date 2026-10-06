import { accountBackend } from '../learning-auth/backend';
import { AccountHTTPError } from '../learning-auth/http';
import type { OrderStore, WebOrder } from './orders';
function row(value:Record<string,unknown>):WebOrder {
 return {revision:Number(value.revision),id:String(value.id),accountId:String(value.account_id),livemode:value.livemode===true,priceId:String(value.price_id),productId:String(value.product_id),sessionId:value.checkout_session_id as string|null,paymentIntentId:value.payment_intent_id as string|null,state:value.state as WebOrder['state']};
}
export function webOrderStore():OrderStore {
 const db=accountBackend();
 const columns='id,account_id,livemode,price_id,product_id,checkout_session_id,payment_intent_id,state,revision';
 async function find(column:string,value:string) {const r=await db.from('guitarhub_web_orders').select(columns).eq(column,value).maybeSingle();if(r.error)throw new AccountHTTPError(503,'purchase_service_unavailable');return r.data?row(r.data):null;}
 async function rpc(name:string,args:Record<string,unknown>) {const r=await db.rpc(name,args);if(r.error||!r.data?.[0])throw new AccountHTTPError(503,'purchase_service_unavailable');return row(r.data[0]);}
 return {
  reserve:(id,live,price,product)=>rpc('guitarhub_reserve_web_order',{p_account_id:id,p_livemode:live,p_price_id:price,p_product_id:product}),
  findById:id=>find('id',id),findBySession:id=>find('checkout_session_id',id),findByPayment:id=>find('payment_intent_id',id),
  list:async(id,live)=>{const r=await db.from('guitarhub_web_orders').select(columns).eq('account_id',id).eq('livemode',live).in('state',['pending','paid','disputed']).limit(2);if(r.error||r.data.length>1)throw new AccountHTTPError(503,'purchase_service_unavailable');return r.data.map(row);},
  history:async(id,live)=>{const r=await db.from('guitarhub_web_orders').select(columns).eq('account_id',id).eq('livemode',live).order('created_at',{ascending:false}).limit(20);if(r.error)throw new AccountHTTPError(503,'purchase_service_unavailable');return r.data.map(row);},
  bind:(order,id)=>rpc('guitarhub_bind_web_order',{p_id:order.id,p_account_id:order.accountId,p_session_id:id}),
  record:(order,state,payment,observedAt)=>rpc('guitarhub_record_web_order',{p_id:order.id,p_session_id:order.sessionId,p_payment_id:payment,p_state:state,p_observed_at:observedAt,p_revision:order.revision}),
 };
}
