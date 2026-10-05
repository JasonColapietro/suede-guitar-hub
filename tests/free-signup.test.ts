import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailAuthHandlers, type EmailAuthClient } from '../lib/learning-auth/email-handlers.ts';
import { AccountHTTPError } from '../lib/learning-auth/http.ts';
function setup(error: unknown = null, guardError?: Error) {
  const calls: unknown[] = [];
  const client: EmailAuthClient = { auth: {
    signInWithOtp: async options => { calls.push(options); return { error }; },
    verifyOtp: async () => ({ error: null }),
    getUser: async () => ({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null }),
    signOut: async () => ({ error: null }),
  }};
  return { calls, client, handlers: createEmailAuthHandlers({ enabled: () => true, signupEnabled: () => true, client: async () => client,
    protect: async (_request, action, email) => { calls.push({action,email}); if (guardError) throw guardError; } }) };
}
const request = (body: unknown) => new Request('https://guitarhub.org/auth/email/send', { method: 'POST', headers: { origin: 'https://guitarhub.org', 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('explicit signup opt-in allows free accounts only after abuse guard', async () => {
  const h = setup(); const response = await h.handlers.send(request({email:'New@Example.test'}));
  assert.equal(response.status,200);
  assert.deepEqual(h.calls,[{action:'send',email:'new@example.test'},{email:'new@example.test',options:{shouldCreateUser:true}}]);
});
test('signup fails closed without guard or on guard outage; blocked sends never reach provider', async () => {
  const h = setup(null,new AccountHTTPError(503,'account_service_unavailable'));
  assert.equal((await h.handlers.send(request({email:'new@example.test'}))).status,503);
  assert.equal(h.calls.length,1);
  const missing = createEmailAuthHandlers({enabled:()=>true,signupEnabled:()=>true,client:async()=>h.client});
  assert.equal((await missing.send(request({email:'new@example.test'}))).status,503);
});
test('delivery and rate errors are recoverable without exposing provider details', async () => {
  for (const [error,status] of [[{status:429,message:'secret'},429],[{status:503,message:'secret'},503],[{code:'over_email_send_rate_limit'},429]]) {
    const response = await setup(error).handlers.send(request({email:'new@example.test'}));
    assert.equal(response.status,status); assert.ok(!(await response.text()).includes('secret'));
    if(status===429) assert.equal(response.headers.get('retry-after'),'60');
  }
});
test('verify is rate protected and rejected before provider when blocked', async () => {
  const h = setup(null,new AccountHTTPError(429,'try_again_later'));
  assert.equal((await h.handlers.verify(request({email:'new@example.test',code:'123456'}))).status,429);
  assert.deepEqual(h.calls,[{action:'verify',email:'new@example.test'}]);
});
