import { verifiedBillingEvent } from './stripe';
import { createHmac } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { AccountHTTPError } from '../learning-auth/http';
import { resolveAccount } from '../learning-auth/server';
import { getVerifiedLearningAccess } from '../learning-auth/access';
import { billingConfiguration,checkoutEnabled } from './config';
import { billingRuntime } from './runtime';
import { createBillingHTTPHandlers } from './http-handlers';
function requiredRuntime(){const r=billingRuntime();if(!r)throw new AccountHTTPError(503,'purchase_service_unavailable');return r;}
async function protect(accountId:string) {
 const salt=process.env.GUITARHUB_AUTH_RATE_LIMIT_SALT,url=process.env.GUITARHUB_AUTH_REDIS_REST_URL,token=process.env.GUITARHUB_AUTH_REDIS_REST_TOKEN;
 if(!salt||salt.length<32||!url||!token)throw new AccountHTTPError(503,'purchase_service_unavailable');
 const limiter=new Ratelimit({redis:new Redis({url,token}),prefix:'guitarhub:auth:checkout',limiter:Ratelimit.slidingWindow(10,'1 m'),analytics:false,ephemeralCache:false,timeout:3000});
 const result=await limiter.limit(createHmac('sha256',salt).update(accountId).digest('hex'));
 if(result.reason==='timeout')throw new AccountHTTPError(503,'purchase_service_unavailable');
 if(!result.success)throw new AccountHTTPError(429,'try_again_later',Math.max(1,Math.ceil((result.reset-Date.now())/1000)));
}
export const billingHTTPHandlers=createBillingHTTPHandlers({
 enabled:()=>billingConfiguration()!==null,checkoutEnabled,
 account:async request=>(await resolveAccount(request))?.user.id??null,protect,
 hasLifetime:async accountId=>{const a=await getVerifiedLearningAccess();if(a.accountId!==accountId||a.status==='unavailable')throw new AccountHTTPError(503,'purchase_service_unavailable');return a.tracks.includes('guitar')&&a.tracks.includes('voice');},
 checkout:id=>requiredRuntime().engine.checkout(id),restore:(id,session)=>requiredRuntime().engine.restore(id,session),
 livemode:()=>requiredRuntime().config.livemode,
 verifyEvent:async(body,signature)=>{
  const {stripe,config}=requiredRuntime();return verifiedBillingEvent(stripe,config.webhookSecret,body,signature);
 },
 sessionEvent:id=>requiredRuntime().engine.webhookSession(id),paymentEvent:id=>requiredRuntime().engine.webhookPayment(id),
});
