import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {webOrderStore} from '../lib/learning-billing/store.ts';
const run=promisify(execFile);const root=await mkdtemp(join(tmpdir(),'guitarhub-web-ledger-'));const data=join(root,'data');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
let started=false;
const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres'];
const sql=text=>execFileSync('psql',[...args,'-c',text],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
try{
 execFileSync('initdb',['-D',data,'-U','postgres','-A','trust','--no-locale'],{stdio:'pipe'});
 execFileSync('pg_ctl',['-D',data,'-l',join(root,'server.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${root}`,'-w','start'],{stdio:'pipe'});started=true;
 sql("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('33333333-3333-4333-8333-333333333333');");
 const proposal=await readFile(resolve('docs/account/web-orders-proposal.sql'),'utf8');
 // Public table, column-only and SECURITY DEFINER grants must roll back setup.
 for(const [setup,cleanup] of [
  ['create table public.public_leak(secret text);grant select on public.public_leak to public;','drop table public.public_leak'],
  ['create sequence public.public_leak;grant usage on sequence public.public_leak to public;','drop sequence public.public_leak'],
  ['grant create on schema public to public','revoke create on schema public from public'],
  ["create function public.public_leak() returns trigger language plpgsql security definer as 'begin return new;end;'",'drop function public.public_leak()'],
  ['create table public.public_leak(secret text);grant select(secret) on public.public_leak to public;','drop table public.public_leak'],
  ["create function public.public_leak() returns text language sql security definer as 'select current_user::text'",'drop function public.public_leak()'],
 ]) {
  sql(setup);assert.throws(()=>sql(proposal),/guitarhub_billing_unexpected_shared_privileges/);
  assert.equal(sql("select count(*) from pg_roles where rolname='guitarhub_billing'"),'0');sql(cleanup);
 }
 sql(proposal);
 sql('create table public.unrelated_private(secret text);');
 assert.equal(sql("select rolcanlogin::text||','||rolsuper::text||','||rolbypassrls::text||','||rolinherit::text from pg_roles where rolname='guitarhub_billing'"),'false,false,false,false');
 // Only this disposable cluster allows a trust-authenticated fixture login.
 sql('alter role guitarhub_billing login');
 const limitedSQL=text=>execFileSync('psql',args.map(x=>x==='postgres'?'guitarhub_billing':x).map((x,i)=>i===args.indexOf('-d')+1?'postgres':x).concat(['-c',text]),{encoding:'utf8',stdio:'pipe'}).trim();
 for(const statement of ['select * from auth.users','select * from public.unrelated_private','delete from public.guitarhub_web_orders','truncate public.guitarhub_web_orders','create role unexpected_role','set role service_role'])assert.throws(()=>limitedSQL(statement),statement);
 // Demonstrate why privileged trigger PUBLIC grants cannot be exempted.
 sql("create table public.trigger_scope_fixture(value text);create function public.trigger_scope_fixture() returns trigger language plpgsql security definer set search_path='' as 'begin insert into public.trigger_scope_fixture values (new.value);return new;end;'");
 const client=new Client({host:'127.0.0.1',port,user:'guitarhub_billing',database:'postgres'});await client.connect();
 try {
  await client.query('set role guitarhub_billing');
  await client.query('create temp table caller_owned(value text);create trigger public_scope before insert on caller_owned for each row execute function public.trigger_scope_fixture()');
  await client.query("insert into caller_owned values ('public-authority')");
  assert.equal(sql('select count(*) from public.trigger_scope_fixture'),'1');
  sql('revoke execute on function public.trigger_scope_fixture() from public');
  await client.query("insert into caller_owned values ('existing-trigger-still-fires')");
  assert.equal(sql('select count(*) from public.trigger_scope_fixture'),'2');
  await assert.rejects(()=>client.query('create temp table caller_other(value text);create trigger denied_scope before insert on caller_other for each row execute function public.trigger_scope_fixture()'),/permission denied/);

  const store=webOrderStore(async(text,values)=>(await client.query(text,values)).rows);
  const reserved=await store.reserve('33333333-3333-4333-8333-333333333333',false,'price_test','prod_test');
  const bound=await store.bind(reserved,'cs_adapter');
  const paid=await store.record(bound,'paid','pi_adapter',new Date().toISOString());
  assert.equal(paid.state,'paid');assert.equal(paid.revision,1);
  assert.equal((await store.findBySession('cs_adapter')).id,reserved.id);
  assert.equal((await store.findByPayment('pi_adapter')).id,reserved.id);
  assert.equal((await store.findById(reserved.id)).id,reserved.id);
  assert.equal((await store.list(reserved.accountId,false)).length,1);
  assert.equal((await store.history(reserved.accountId,false)).length,1);
  assert.equal(await store.findBySession("cs_'; delete from auth.users;--"),null);
 } finally {await client.end();}

 const reserve="set role guitarhub_billing;select id from public.guitarhub_reserve_web_order('11111111-1111-4111-8111-111111111111',false,'price_test','prod_test');";
 const ids=await Promise.all(Array.from({length:8},async()=>{const r=await run('psql',[...args,'-c',reserve]);return r.stdout.trim();}));assert.equal(new Set(ids).size,1);const id=ids[0];
 for(const role of ['anon','authenticated'])for(const statement of ["select * from public.guitarhub_web_orders",reserve.replace('set role guitarhub_billing;','')])assert.throws(()=>sql(`set role ${role};${statement}`));
 sql(`set role guitarhub_billing;select id from public.guitarhub_bind_web_order('${id}','11111111-1111-4111-8111-111111111111','cs_test_owned');`);
 assert.throws(()=>sql(`set role guitarhub_billing;select id from public.guitarhub_bind_web_order('${id}','33333333-3333-4333-8333-333333333333','cs_test_foreign');`));
 const revision=()=>sql(`select revision from public.guitarhub_web_orders where id='${id}'`);
 const record=(state,age=0,payment='pi_test',version=revision())=>sql(`set role guitarhub_billing;select state from public.guitarhub_record_web_order('${id}','cs_test_owned',${payment?`'${payment}'`:'null'},'${state}',now()-interval '${age} seconds',${version});`);
 assert.equal(record('paid',20),'paid');const staleRevision=revision();assert.equal(record('disputed',30),'disputed');assert.equal(record('paid',25),'disputed');
 // Exact timestamp ties cannot restore a dispute; later verified wins can.
 assert.equal(sql(`set role guitarhub_billing;select state from public.guitarhub_record_web_order('${id}','cs_test_owned','pi_test','paid',(select observed_at from public.guitarhub_web_orders where id='${id}'),${revision()});`),'disputed');
 // A paid read with a later start time but pre-denial revision must not restore.
 assert.equal(record('paid',5,'pi_test',staleRevision),'disputed');
 assert.equal(record('paid',5),'paid');assert.equal(record('refunded',40),'refunded');assert.equal(record('paid'),'refunded');
 const next=sql(reserve);assert.notEqual(next,id);assert.throws(()=>record('paid',0,'pi_foreign'));
 assert.equal(sql('select count(*) from public.guitarhub_web_orders'),'3');
 console.log(JSON.stringify({postgres:sql('show server_version'),concurrentReservations:8,oneActiveOrder:true,clientRolesDenied:true,scopedRoleDeniedUnrelatedAccess:true,productionSQLAdapter:true,publicPrivilegeGuard:true,temporaryTriggerAuthorityProven:true,existingTriggerFiresAfterRevoke:true,ownerBinding:true,staleReplayDenied:true,revisionFence:true,disputeRestore:true,refundTerminal:true,repurchaseAfterRefund:true}));
}finally{if(started)execFileSync('pg_ctl',['-D',data,'-m','fast','-w','stop'],{stdio:'pipe'});await rm(root,{recursive:true,force:true});}
