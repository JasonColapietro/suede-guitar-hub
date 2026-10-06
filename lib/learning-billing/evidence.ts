import { AccountHTTPError } from '../learning-auth/http.ts';
export const LIFETIME_AMOUNT = 7900;
export const LIFETIME_CURRENCY = 'usd';
export type OrderState = 'pending' | 'paid' | 'refunded' | 'disputed' | 'expired';
export type OrderIdentity = { id:string; accountId:string; livemode:boolean; priceId:string; productId:string };
export type CheckoutEvidence = {
 id:string;livemode:boolean;mode:string|null;orderId:string|null;accountId:string|null;clientReference:string|null;
 status:string|null;paymentStatus:string;currency:string|null;amount:number|null;
 lines:{priceId:string;productId:string;quantity:number|null;amount:number;currency:string}[];
 payment:null|{id:string;status:string;currency:string;amount:number;received:number;chargePaid:boolean;amountRefunded:number;disputed:boolean;disputes:string[]};
};
/** Evidence comes from a fresh Stripe retrieval, never a query string or webhook payload. */
export function decideLifetimeAccess(order:OrderIdentity, evidence:CheckoutEvidence):OrderState {
 const invalid=()=>{throw new AccountHTTPError(400,'invalid_purchase');};
 if(evidence.livemode!==order.livemode||evidence.mode!=='payment'||evidence.orderId!==order.id||evidence.accountId!==order.accountId||evidence.clientReference!==order.accountId||evidence.currency!==LIFETIME_CURRENCY||evidence.amount!==LIFETIME_AMOUNT) invalid();
 const line=evidence.lines[0];
 if(evidence.lines.length!==1||!line||line.priceId!==order.priceId||line.productId!==order.productId||line.quantity!==1||line.amount!==LIFETIME_AMOUNT||line.currency!==LIFETIME_CURRENCY)invalid();
 if(evidence.status==='complete' && evidence.paymentStatus==='unpaid' && ['canceled','requires_payment_method'].includes(evidence.payment?.status??''))return 'expired';
 if(evidence.status==='expired' && evidence.paymentStatus!=='paid') return 'expired';
 if(evidence.status!=='complete'||evidence.paymentStatus!=='paid')return 'pending';
 const payment=evidence.payment;
 if(!payment) return invalid();
 if(payment.status!=='succeeded')return 'pending';
 if(!payment.chargePaid||payment.currency!==LIFETIME_CURRENCY||payment.amount!==LIFETIME_AMOUNT||payment.received!==LIFETIME_AMOUNT)invalid();
 if(payment.amountRefunded>=LIFETIME_AMOUNT)return 'refunded';
 if(payment.disputed && (!payment.disputes.length||payment.disputes.some(status=>!['won','warning_closed'].includes(status))))return 'disputed';
 return 'paid';
}
