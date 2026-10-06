import test from 'node:test';
import assert from 'node:assert/strict';
import { decideLifetimeAccess, type CheckoutEvidence } from '../lib/learning-billing/evidence.ts';
const owner='11111111-1111-4111-8111-111111111111';
const order={id:'22222222-2222-4222-8222-222222222222',accountId:owner,livemode:false,priceId:'price_test',productId:'prod_test'};
const evidence:CheckoutEvidence={id:'cs_test_owned',livemode:false,mode:'payment',orderId:order.id,accountId:owner,clientReference:owner,status:'complete',paymentStatus:'paid',currency:'usd',amount:7900,lines:[{priceId:'price_test',productId:'prod_test',quantity:1,amount:7900,currency:'usd'}],payment:{id:'pi_test',status:'succeeded',currency:'usd',amount:7900,received:7900,chargePaid:true,amountRefunded:0,disputed:false,disputes:[]}};
test('paid lifetime requires exact server-owned order, one-time offer and actual successful funds',()=>{
 assert.equal(decideLifetimeAccess(order,evidence),'paid');
 for(const patch of [{livemode:true},{mode:'subscription'},{orderId:owner},{accountId:order.id},{clientReference:order.id},{currency:'eur'},{amount:1},{lines:[]},{lines:[{...evidence.lines[0],priceId:'price_other'}]}]) assert.throws(()=>decideLifetimeAccess(order,{...evidence,...patch}),/invalid_purchase/);
});
test('completed but unpaid checkout and incomplete payments cannot unlock access',()=>{
 assert.equal(decideLifetimeAccess(order,{...evidence,paymentStatus:'unpaid'}),'pending');
 assert.equal(decideLifetimeAccess(order,{...evidence,status:'expired',paymentStatus:'unpaid',payment:null}),'expired');
 assert.equal(decideLifetimeAccess(order,{...evidence,payment:{...evidence.payment!,status:'processing'}}),'pending');
 assert.throws(()=>decideLifetimeAccess(order,{...evidence,payment:{...evidence.payment!,received:1}}),/invalid_purchase/);
});
test('full refunds revoke, unresolved disputes suspend and won disputes restore',()=>{
 assert.equal(decideLifetimeAccess(order,{...evidence,payment:{...evidence.payment!,amountRefunded:7900}}),'refunded');
 assert.equal(decideLifetimeAccess(order,{...evidence,payment:{...evidence.payment!,disputed:true,disputes:['needs_response']}}),'disputed');
 assert.equal(decideLifetimeAccess(order,{...evidence,payment:{...evidence.payment!,disputed:true,disputes:[]}}),'disputed');
 assert.equal(decideLifetimeAccess(order,{...evidence,payment:{...evidence.payment!,disputed:true,disputes:['won']}}),'paid');
});
test('failed asynchronous payment frees the order for a later retry without granting access',()=>{
 assert.equal(decideLifetimeAccess(order,{...evidence,paymentStatus:'unpaid',payment:{...evidence.payment!,status:'requires_payment_method',received:0,chargePaid:false}}),'expired');
});
