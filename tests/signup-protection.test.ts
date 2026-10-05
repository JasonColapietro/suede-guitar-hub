import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignupProtection } from '../lib/learning-auth/signup-protection.ts';
const request = (headers: Record<string,string> = {'x-vercel-forwarded-for':'192.0.2.10'}) => new Request('https://guitarhub.org',{headers});
const configuration = () => ({salt:'a'.repeat(32),vercel:true});
test('signup guard hashes identifiers, rejects bots and ignores spoofable forwarded headers', async () => {
  const keys: string[]=[];
  const protect=createSignupProtection({configuration,checkBot:async()=>({isBot:false}),limit:async(bucket,id)=>{keys.push(bucket+':'+id);return {success:true};}});
  await protect(request(),'send','new@example.test');
  assert.equal(keys.length,2); assert.ok(keys.every(key=>/send-(ip|email):[a-f0-9]{64}$/.test(key)));
  await assert.rejects(()=>protect(request({'x-forwarded-for':'192.0.2.10'}),'send','new@example.test'),/unavailable/);
  const bot=createSignupProtection({configuration,checkBot:async()=>({isBot:true}),limit:async()=>{throw new Error('must not reach Redis');}});
  await assert.rejects(()=>bot(request(),'send','new@example.test'),/verification_required/);
});
test('signup guard fails closed on missing configuration, Redis failure, and fail-open timeout result', async () => {
  for (const configuration of [()=>null,()=>({salt:'short',vercel:true}),()=>({salt:'a'.repeat(32),vercel:false})]) {
    const protect=createSignupProtection({configuration,checkBot:async()=>({isBot:false}),limit:async()=>({success:true})});
    await assert.rejects(()=>protect(request(),'send','new@example.test'),/unavailable/);
  }
  for(const result of [{success:true,reason:'timeout'},{success:false}]) {
    const protect=createSignupProtection({configuration,checkBot:async()=>({isBot:false}),limit:async()=>result});
    await assert.rejects(()=>protect(request(),'verify','new@example.test'));
  }
  const outage=createSignupProtection({configuration,checkBot:async()=>({isBot:false}),limit:async()=>{throw new Error('offline');}});
  await assert.rejects(()=>outage(request(),'verify','new@example.test'),/offline/);
});
