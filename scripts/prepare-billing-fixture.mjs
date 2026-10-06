// Produces a disposable local provider fixture. No production bypass or credentials.
import {execFileSync} from 'node:child_process';
import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const destination=resolve(process.argv[2]??'');
execFileSync(process.execPath,['scripts/prepare-account-fixture.mjs',destination],{stdio:'inherit'});
for(const file of ['config.ts','runtime.ts'])await cp('tests/fixtures/billing/'+file+'.fixture',join(destination,'lib/learning-billing',file));
await cp('tests/fixtures/billing/access.ts.fixture',join(destination,'lib/learning-auth/access.ts'));
const handlers=await readFile('lib/learning-billing/service-handlers.ts','utf8');
await writeFile(join(destination,'lib/learning-billing/service-handlers.ts'),handlers.replace(/async function protect\(accountId:string\) \{[\s\S]*?\n\}/,'async function protect(_accountId:string) {}'));
await mkdir(join(destination,'app/fixture/payment'),{recursive:true});
await writeFile(join(destination,'app/fixture/payment/route.ts'),`import {fixtureState} from '../../../lib/learning-billing/runtime';
export async function GET(){return Response.json(fixtureState());}
export async function POST(request:Request){const body=await request.json();return Response.json(fixtureState(body.session,body.state));}
`);
console.log('Billing fixture only: '+destination);
