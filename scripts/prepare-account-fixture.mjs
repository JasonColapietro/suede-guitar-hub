import { cp, mkdir, writeFile, realpath, access } from 'node:fs/promises';
import { resolve, basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const source=await realpath(process.cwd());
const destination=resolve(process.argv[2]??'');
if(!process.argv[2] || destination===source || destination.startsWith(source+'/') || process.env.VERCEL || !basename(destination).startsWith('guitarhub-account-fixture-')) throw new Error('Use a new disposable guitarhub-account-fixture-* directory outside the repository.');
try { await access(destination); throw new Error('Destination already exists'); } catch(error) { if(error.code!=='ENOENT') throw error; }
await mkdir(destination,{recursive:true});
const excluded=new Set(['node_modules','.next','.git','.vercel','.playwright-cli','tsconfig.tsbuildinfo']);
await cp(source,destination,{recursive:true,filter:path=>!excluded.has(basename(path))&&!basename(path).startsWith('.env')});
// CoW clone on macOS avoids sharing mutable dependencies or consuming another full copy.
execFileSync('cp',['-cR',join(source,'node_modules'),join(destination,'node_modules')]);
for(const file of ['server.ts','access.ts','signup-service-protection.ts']) await cp(join(source,'tests/fixtures/account',file+'.fixture'),join(destination,'lib/learning-auth',file));
await writeFile(join(destination,'proxy.ts'),`import {NextResponse} from 'next/server';\nexport function proxy(){const r=NextResponse.next();r.headers.set('Cache-Control','private, no-store');return r;}\nexport const config={matcher:['/account/:path*','/auth/:path*']};\n`);
await writeFile(join(destination,'instrumentation-client.ts'),'// Fixture transport does not contact BotID.\n');
await writeFile(join(destination,'.env.local'),`GUITARHUB_ACCOUNTS_ENABLED=true\nGUITARHUB_FREE_SIGNUP_ENABLED=true\nNEXT_PUBLIC_SUPABASE_URL=https://drzuelosizfllruocmly.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=fixture-never-a-provider-key\n`);
await writeFile(join(destination,'FIXTURE_ONLY_DO_NOT_DEPLOY'),'Synthetic authentication and entitlements. No real provider credentials. Never deploy this directory.\n');
console.log(destination);
