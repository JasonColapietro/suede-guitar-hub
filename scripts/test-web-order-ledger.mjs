import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
const run=promisify(execFile);const root=await mkdtemp(join(tmpdir(),'guitarhub-web-ledger-'));const data=join(root,'data');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
let started=false;
const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres'];
const sql=text=>execFileSync('psql',[...args,'-c',text],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
try{
 execFileSync('initdb',['-D',data,'-U','postgres','-A','trust','--no-locale'],{stdio:'pipe'});
 execFileSync('pg_ctl',['-D',data,'-l',join(root,'server.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${root}`,'-w','start'],{stdio:'pipe'});started=true;
 sql("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('33333333-3333-4333-8333-333333333333');");
 sql(await readFile(resolve('docs/account/web-orders-proposal.sql'),'utf8'));
 const reserve="set role service_role;select id from public.guitarhub_reserve_web_order('11111111-1111-4111-8111-111111111111',false,'price_test','prod_test');";
 const ids=await Promise.all(Array.from({length:8},async()=>{const r=await run('psql',[...args,'-c',reserve]);return r.stdout.trim();}));assert.equal(new Set(ids).size,1);const id=ids[0];
 for(const role of ['anon','authenticated'])for(const statement of ["select * from public.guitarhub_web_orders",reserve.replace('set role service_role;','')])assert.throws(()=>sql(`set role ${role};${statement}`));
 sql(`set role service_role;select id from public.guitarhub_bind_web_order('${id}','11111111-1111-4111-8111-111111111111','cs_test_owned');`);
 assert.throws(()=>sql(`set role service_role;select id from public.guitarhub_bind_web_order('${id}','33333333-3333-4333-8333-333333333333','cs_test_foreign');`));
 const revision=()=>sql(`select revision from public.guitarhub_web_orders where id='${id}'`);
 const record=(state,age=0,payment='pi_test',version=revision())=>sql(`set role service_role;select state from public.guitarhub_record_web_order('${id}','cs_test_owned',${payment?`'${payment}'`:'null'},'${state}',now()-interval '${age} seconds',${version});`);
 assert.equal(record('paid',20),'paid');const staleRevision=revision();assert.equal(record('disputed',30),'disputed');assert.equal(record('paid',25),'disputed');
 // Exact timestamp ties cannot restore a dispute; later verified wins can.
 assert.equal(sql(`set role service_role;select state from public.guitarhub_record_web_order('${id}','cs_test_owned','pi_test','paid',(select observed_at from public.guitarhub_web_orders where id='${id}'),${revision()});`),'disputed');
 // A paid read with a later start time but pre-denial revision must not restore.
 assert.equal(record('paid',5,'pi_test',staleRevision),'disputed');
 assert.equal(record('paid',5),'paid');assert.equal(record('refunded',40),'refunded');assert.equal(record('paid'),'refunded');
 const next=sql(reserve);assert.notEqual(next,id);assert.throws(()=>record('paid',0,'pi_foreign'));
 assert.equal(sql('select count(*) from public.guitarhub_web_orders'),'2');
 console.log(JSON.stringify({postgres:sql('show server_version'),concurrentReservations:8,oneActiveOrder:true,clientRolesDenied:true,ownerBinding:true,staleReplayDenied:true,revisionFence:true,disputeRestore:true,refundTerminal:true,repurchaseAfterRefund:true}));
}finally{if(started)execFileSync('pg_ctl',['-D',data,'-m','fast','-w','stop'],{stdio:'pipe'});await rm(root,{recursive:true,force:true});}
