import test from 'node:test';
import assert from 'node:assert/strict';
import {billingConfiguration,checkoutEnabled} from '../lib/learning-billing/config.ts';
test('billing configuration separates sales pause from existing access and refuses live preview or test production',()=>{
 const values={GUITARHUB_WEB_BILLING_ENABLED:'true',GUITARHUB_WEB_CHECKOUT_ENABLED:'true',GUITARHUB_STRIPE_MODE:'test',GUITARHUB_STRIPE_SECRET_KEY:'rk_test_fixture',GUITARHUB_STRIPE_WEBHOOK_SECRET:'whsec_fixture',GUITARHUB_STRIPE_ACCOUNT_ID:'acct_fixture',GUITARHUB_STRIPE_LIFETIME_PRICE_ID:'price_fixture',GUITARHUB_STRIPE_LIFETIME_PRODUCT_ID:'prod_fixture',GUITARHUB_CHECKOUT_ORIGIN:'https://preview.example.test',GUITARHUB_SUPABASE_SERVICE_ROLE_KEY:'fixture-only',VERCEL_ENV:'preview'};
 const old=Object.fromEntries(Object.keys(values).map(key=>[key,process.env[key]]));
 try {Object.assign(process.env,values);assert.equal(billingConfiguration()?.livemode,false);assert.equal(checkoutEnabled(),true);
 process.env.GUITARHUB_WEB_CHECKOUT_ENABLED='false';assert.ok(billingConfiguration());assert.equal(checkoutEnabled(),false);
 process.env.VERCEL_ENV='production';assert.equal(billingConfiguration(),null);
 Object.assign(process.env,{GUITARHUB_STRIPE_MODE:'live',GUITARHUB_STRIPE_SECRET_KEY:'rk_live_fixture',GUITARHUB_CHECKOUT_ORIGIN:'https://guitarhub.org',GUITARHUB_STRIPE_ACCOUNT_ID:'acct_1SHG7dRdcsaZ58FL'});assert.equal(billingConfiguration()?.livemode,true);
 process.env.VERCEL_ENV='preview';assert.equal(billingConfiguration(),null);
 Object.assign(process.env,values);process.env.GUITARHUB_WEB_BILLING_ENABLED='false';assert.equal(billingConfiguration(),null);
 }finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
