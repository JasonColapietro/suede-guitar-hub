import test from 'node:test';
import assert from 'node:assert/strict';
import {billingDatabaseConfiguration} from '../lib/learning-billing/database-config.ts';
import {webOrderStore} from '../lib/learning-billing/store.ts';
const url='postgresql://guitarhub_billing.drzuelosizfllruocmly:fixture%24only@aws-0-us-west-1.pooler.supabase.com:6543/postgres';
test('database requires narrow role, correct project, TLS and transaction pooler without URL overrides',()=>{
 const configuration=billingDatabaseConfiguration(url);assert.ok(configuration);assert.equal(configuration.password,'fixture$only');assert.deepEqual(configuration.ssl,{rejectUnauthorized:true});
 for(const bad of [url.replace('guitarhub_billing.','postgres.'),url.replace('drzuelosizfllruocmly','otherproject'),url.replace('supabase.com','attacker.example'),url.replace('6543','5432'),url+'?sslmode=disable',url+'#fragment',url.replace('fixture%24only',''),url.replace('/postgres','/other')])assert.equal(billingDatabaseConfiguration(bad),null);
});
test('purchase identifiers are bound parameters and revision fence survives SQL adapter',async()=>{
 const queries:{text:string,values:unknown[]}[]=[];
 const value={id:'order',account_id:'account',livemode:true,price_id:'price_1',product_id:'prod_1',checkout_session_id:'cs_1',payment_intent_id:'pi_1',state:'disputed',revision:7};
 const store=webOrderStore(async(text,values)=>{queries.push({text,values});return [value];});
 const malicious="cs_'; delete from auth.users;--";
 const order=await store.findBySession(malicious);assert.ok(order);assert.equal(queries[0].text.includes(malicious),false);assert.deepEqual(queries[0].values,[malicious]);assert.equal(order.revision,7);
 await store.record(order,'paid','pi_1','2026-10-06T00:00:00Z');assert.deepEqual(queries[1].values,['order','cs_1','pi_1','paid','2026-10-06T00:00:00Z',7]);
});
test('ambiguous active orders and missing mutations fail closed',async()=>{
 const empty=webOrderStore(async()=>[]);await assert.rejects(()=>empty.reserve('id',true,'price_1','prod_1'));assert.equal(await empty.findById('missing'),null);
 const duplicate=webOrderStore(async()=>[{},{}]);await assert.rejects(()=>duplicate.list('id',true));await assert.rejects(()=>duplicate.findById('id'));
});
