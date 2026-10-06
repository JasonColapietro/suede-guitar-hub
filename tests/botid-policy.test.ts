import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emailBotRoutes,emailBotOptions } from '../lib/learning-auth/botid-policy.ts';
test('both email routes request the same Basic level as the server, independently of project defaults',()=>{
 assert.deepEqual(emailBotRoutes.map(route=>route.path),['/auth/email/send','/auth/email/verify']);
 for(const route of emailBotRoutes) {assert.equal(route.method,'POST');assert.equal(route.advancedOptions.checkLevel,'basic');assert.equal(route.advancedOptions.checkLevel,emailBotOptions.advancedOptions.checkLevel);}
 assert.equal(emailBotOptions.developmentOptions.isDevelopment,false);
 // Guard the actual entrypoints too: synthetic browser fixtures deliberately replace these.
 assert.match(readFileSync(new URL('../instrumentation-client.ts',import.meta.url),'utf8'),/initBotId\(\{ protect: emailBotRoutes \}\)/);
 assert.match(readFileSync(new URL('../lib/learning-auth/signup-service-protection.ts',import.meta.url),'utf8'),/checkBotId\(emailBotOptions\)/);
});
