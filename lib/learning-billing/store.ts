import { billingQuery } from './database.ts';
import { AccountHTTPError } from '../learning-auth/http.ts';
import type { OrderStore, WebOrder } from './orders';
function row(value:Record<string,unknown>):WebOrder {
 return {revision:Number(value.revision),id:String(value.id),accountId:String(value.account_id),livemode:value.livemode===true,priceId:String(value.price_id),productId:String(value.product_id),sessionId:value.checkout_session_id as string|null,paymentIntentId:value.payment_intent_id as string|null,state:value.state as WebOrder['state']};
}
export function webOrderStore(query = billingQuery):OrderStore {
 const columns='id,account_id,livemode,price_id,product_id,checkout_session_id,payment_intent_id,state,revision';
 async function find(column:'id'|'checkout_session_id'|'payment_intent_id',value:string) {
  const rows=await query(`select ${columns} from public.guitarhub_web_orders where ${column}=$1 limit 2`,[value]);
  if(rows.length>1)throw new AccountHTTPError(503,'purchase_service_unavailable');return rows[0]?row(rows[0]):null;
 }
 async function single(sql:string,args:unknown[]) {const rows=await query(sql,args);if(rows.length!==1)throw new AccountHTTPError(503,'purchase_service_unavailable');return row(rows[0]);}
 return {
  reserve:(id,live,price,product)=>single('select * from public.guitarhub_reserve_web_order($1,$2,$3,$4)',[id,live,price,product]),
  findById:id=>find('id',id),findBySession:id=>find('checkout_session_id',id),findByPayment:id=>find('payment_intent_id',id),
  list:async(id,live)=>{const rows=await query(`select ${columns} from public.guitarhub_web_orders where account_id=$1 and livemode=$2 and state in ('pending','paid','disputed') limit 2`,[id,live]);if(rows.length>1)throw new AccountHTTPError(503,'purchase_service_unavailable');return rows.map(row);},
  history:async(id,live)=>(await query(`select ${columns} from public.guitarhub_web_orders where account_id=$1 and livemode=$2 order by created_at desc limit 20`,[id,live])).map(row),
  bind:(order,id)=>single('select * from public.guitarhub_bind_web_order($1,$2,$3)',[order.id,order.accountId,id]),
  record:(order,state,payment,observedAt)=>single('select * from public.guitarhub_record_web_order($1,$2,$3,$4,$5,$6)',[order.id,order.sessionId,payment,state,observedAt,order.revision]),
 };
}
