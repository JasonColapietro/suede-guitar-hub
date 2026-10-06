export type BillingConfiguration={secretKey:string;webhookSecret:string;accountId:string;priceId:string;productId:string;livemode:boolean;origin:string};
export function billingConfiguration():BillingConfiguration|null {
 if(process.env.GUITARHUB_WEB_BILLING_ENABLED!=='true')return null;
 const mode=process.env.GUITARHUB_STRIPE_MODE;
 const secretKey=process.env.GUITARHUB_STRIPE_SECRET_KEY;
 const webhookSecret=process.env.GUITARHUB_STRIPE_WEBHOOK_SECRET;
 const accountId=process.env.GUITARHUB_STRIPE_ACCOUNT_ID;
 const priceId=process.env.GUITARHUB_STRIPE_LIFETIME_PRICE_ID;
 const productId=process.env.GUITARHUB_STRIPE_LIFETIME_PRODUCT_ID;
 const origin=process.env.GUITARHUB_CHECKOUT_ORIGIN;
 if(!['test','live'].includes(mode??'')||!secretKey||!webhookSecret?.startsWith('whsec_')||!accountId?.startsWith('acct_')||!priceId?.startsWith('price_')||!productId?.startsWith('prod_')||!origin||!process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY)return null;
 if(!secretKey.startsWith(`rk_${mode}_`) && !secretKey.startsWith(`sk_${mode}_`))return null;
 if(process.env.VERCEL_ENV==='production' && (mode!=='live'||origin!=='https://guitarhub.org'||accountId!=='acct_1SHG7dRdcsaZ58FL'))return null;
 // Preview/development must never charge real money.
 if(process.env.VERCEL_ENV!=='production' && mode!=='test')return null;
 try {const parsed=new URL(origin);if(parsed.origin!==origin||parsed.protocol!=='https:'||parsed.username||parsed.password)return null;}catch{return null;}
 return {secretKey,webhookSecret,accountId,priceId,productId,livemode:mode==='live',origin};
}

export const checkoutEnabled=()=>process.env.GUITARHUB_WEB_CHECKOUT_ENABLED==='true' && billingConfiguration()!==null;
