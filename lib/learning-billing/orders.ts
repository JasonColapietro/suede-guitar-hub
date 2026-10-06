import type { OrderIdentity, OrderState } from './evidence.ts';
export type WebOrder=OrderIdentity & {sessionId:string|null;paymentIntentId:string|null;state:OrderState;revision:number};
export interface OrderStore {
 reserve(accountId:string,livemode:boolean,priceId:string,productId:string):Promise<WebOrder>;
 findById(id:string):Promise<WebOrder|null>;
 findBySession(sessionId:string):Promise<WebOrder|null>;
 findByPayment(paymentId:string):Promise<WebOrder|null>;
 list(accountId:string,livemode:boolean):Promise<WebOrder[]>;
 history(accountId:string,livemode:boolean):Promise<WebOrder[]>;
 bind(order:WebOrder,sessionId:string):Promise<WebOrder>;
 record(order:WebOrder,state:OrderState,paymentId:string|null,observedAt:string):Promise<WebOrder>;
}
