import { AccountHTTPError,accountErrorResponse,accountJSON,boundedAccountBody } from '../learning-auth/http.ts';
import { isSameOriginMutation } from '../learning-auth/config.ts';
import type { OrderState } from './evidence.ts';
export function createBillingHTTPHandlers(deps:{
 enabled():boolean; checkoutEnabled():boolean;
 account(request:Request):Promise<string|null>;protect(accountId:string):Promise<void>;
 hasLifetime(accountId:string):Promise<boolean>;
 checkout(accountId:string):Promise<{state:'paid'}|{state:'checkout';url:string}>;
 restore(accountId:string,sessionId:string):Promise<OrderState>;
 verifyEvent(body:string,signature:string):Promise<{type:string;livemode:boolean;id:string;paymentId:string|null}>;
 livemode():boolean;sessionEvent(id:string):Promise<void>;paymentEvent(id:string):Promise<void>;
}) {
 const route=(fn:(r:Request)=>Promise<Response>)=>async(request:Request)=>{try {if(!deps.enabled())throw new AccountHTTPError(503,'purchase_service_unavailable');return await fn(request);}catch(error){return accountErrorResponse(error);}};
 async function member(request:Request) {if(!isSameOriginMutation(request))throw new AccountHTTPError(403,'invalid_origin');const id=await deps.account(request);if(!id)throw new AccountHTTPError(401,'sign_in_required');return id;}
 return {
  checkout:route(async request=>{
   if(!deps.checkoutEnabled())throw new AccountHTTPError(503,'checkout_unavailable');
   const id=await member(request);await boundedAccountBody(request,1024);await deps.protect(id);
   if(await deps.hasLifetime(id))return accountJSON({state:'paid',destination:'/learn/guitar'});
   const result=await deps.checkout(id);
   if(result.state==='checkout') {const url=new URL(result.url);if(url.origin!=='https://checkout.stripe.com'||url.username||url.password)throw new AccountHTTPError(503,'checkout_unavailable');}
   return accountJSON(result);
  }),
  restore:route(async request=>{
   const id=await member(request);const body=await boundedAccountBody(request,1024);await deps.protect(id);
   if(typeof body.sessionId!=='string'||!/^cs_(?:test_|live_)?[a-zA-Z0-9]{1,200}$/.test(body.sessionId))throw new AccountHTTPError(400,'invalid_purchase');
   return accountJSON({state:await deps.restore(id,body.sessionId)});
  }),
  webhook:route(async request=>{
   const signature=request.headers.get('stripe-signature');if(!signature||signature.length>2048)throw new AccountHTTPError(400,'invalid_signature');
   const reader=request.body?.getReader();if(!reader)throw new AccountHTTPError(400,'invalid_body');
   const chunks:Uint8Array[]=[];let size=0;
   for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>262144){await reader.cancel();throw new AccountHTTPError(413,'body_too_large');}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   let event;try{event=await deps.verifyEvent(new TextDecoder('utf-8',{fatal:true}).decode(bytes),signature);}catch{throw new AccountHTTPError(400,'invalid_signature');}
   if(event.livemode!==deps.livemode())throw new AccountHTTPError(400,'invalid_purchase');
   if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'].includes(event.type))await deps.sessionEvent(event.id);
   else if(['charge.refunded','charge.dispute.created','charge.dispute.updated','charge.dispute.closed'].includes(event.type)&&event.paymentId)await deps.paymentEvent(event.paymentId);
   return accountJSON({received:true});
  }),
 };
}
