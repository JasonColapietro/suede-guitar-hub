import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileLearningAccess,type LearningHandlerDependencies} from '../lib/learning-auth/handlers.ts';
const id='11111111-1111-4111-8111-111111111111';
function deps():Pick<LearningHandlerDependencies,'environment'|'listPurchases'|'verifier'|'recordPurchase'|'webAccess'> {return {environment:()=>{throw Error('Apple not configured');},listPurchases:async()=>[],verifier:async()=>{throw Error('Apple not configured');},recordPurchase:async(_,purchase)=>purchase,webAccess:async()=>({tracks:[],environment:'Sandbox'})};}
test('free web account can check access without Apple signing credentials; test mode stays sandbox',async()=>{
 assert.deepEqual(await reconcileLearningAccess(deps(),id),{accountId:id,tracks:[],environment:'Sandbox'});
});
test('independently verified web lifetime access uses the existing native/web access contract',async()=>{
 const d=deps();d.webAccess=async()=>({tracks:['guitar','voice'],environment:'Production'});
 assert.deepEqual(await reconcileLearningAccess(d,id),{accountId:id,tracks:['guitar','voice'],environment:'Production'});
});
test('web provider outage cannot become a free or paid verified response without independent Apple evidence',async()=>{
 const d=deps();d.environment=()=>'Production';d.webAccess=async()=>{throw Error('Stripe unavailable');};await assert.rejects(()=>reconcileLearningAccess(d,id),/Stripe unavailable/);
});
test('a Stripe outage preserves independently verified Apple lifetime ownership',async()=>{
 const d=deps();d.environment=()=>'Production';d.webAccess=async()=>{throw Error('Stripe unavailable');};
 const purchase={environment:'Production' as const,originalTransactionId:'123',transactionId:'123',bundleId:'org.guitarhub.app' as const,productId:'org.guitarhub.app.complete.lifetime' as const,appAccountToken:id,purchasedAt:'2026-09-01T00:00:00Z',signedAt:'2026-09-02T00:00:00Z',revokedAt:null};
 d.listPurchases=async()=>[{transactionId:'123',originalTransactionId:'123',appAccountToken:id}];
 d.verifier=async()=>({reconcileTransaction:async()=>purchase,verifyPurchase:async()=>({...purchase,accountId:id}),verifyNotification:async()=>null});
 assert.deepEqual((await reconcileLearningAccess(d,id)).tracks,['guitar','voice']);
});
