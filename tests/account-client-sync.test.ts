import test from "node:test";
import assert from "node:assert/strict";
import { AccountSyncClient, activeSyncAccountKey, type SyncStorage, type SyncTransport } from "../lib/learning-sync/client.ts";
import type { LearningAttempt } from "../lib/learning-account/contracts.ts";
import { mergeAccountProgress, mergeAccountReading, mergeAccountStageTwo } from "../lib/learning-sync/evidence.ts";
import { emptyProgress, emptyReadingQuizProgress } from "../lib/learning/progress.ts";
import { getLessonInstructions } from "../lib/learning/instructions.ts";
import { allLessons } from "../lib/learning/curriculum.ts";

const accountId="a1111111-1111-4111-8111-111111111111", syncEpoch="b2222222-2222-4222-8222-222222222222", other="d4444444-4444-4444-8444-444444444444";
const binding={accountId,syncEpoch};
const now=Date.parse("2026-09-08T12:00:00.000Z");
let sequence=1;
const uuid=()=>`c3333333-3333-4333-8333-${String(sequence++).padStart(12,"0")}`;
const lessons=new Map(allLessons("guitar").map(({lesson})=>[lesson.id,"guitar" as const]));
class Storage implements SyncStorage {
  data=new Map<string,string>();
  get length(){return this.data.size;}
  key(index:number){return [...this.data.keys()][index]??null;}
  getItem(key:string){return this.data.get(key)??null;}
  setItem(key:string,value:string){this.data.set(key,value);}
  removeItem(key:string){this.data.delete(key);}
}
const event=(patch:Partial<LearningAttempt>={}):LearningAttempt=>({version:1,id:uuid(),track:"guitar",lessonId:"g-l1-m1-02",kind:"microphone",createdAt:new Date(now+1000).toISOString(),practiceSeconds:60,exerciseRevision:null,source:"measured",disposition:"scored",assessment:"ready",score:80,bpm:80,details:{},...patch});
const ok=(body:unknown)=>Promise.resolve({ok:true,json:async()=>body});
function harness(storage=new Storage()) {
  const uploaded:LearningAttempt[]=[];
  let online=true;
  const transport:SyncTransport=async(url,init)=>{
    if(!online)throw new Error("offline");
    if(url.endsWith("binding"))return ok(binding);
    if(init.method==="POST"){
      const body=JSON.parse(String(init.body));assert.equal(body.accountId,accountId);assert.equal(body.syncEpoch,syncEpoch);
      uploaded.push(...body.attempts);
      return ok({...binding,acknowledged:body.attempts.map((a:LearningAttempt)=>({attempt_id:a.id,sequence:"1"}))});
    }
    return ok({...binding,attempts:[],cursor:"0",nextCursor:null});
  };
  const client=new AccountSyncClient(accountId,storage,transport,lessons,uuid,()=>now);
  client.activate();
  return {client,storage,transport,uploaded,offline:()=>{online=false;},online:()=>{online=true;}};
}
function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}

test("sync is explicit, never scans earlier local history, and queues survive offline reload",async()=>{
  const h=harness();h.storage.setItem("guitarhub.learning.v1.guitar",JSON.stringify({privateGuestHistory:true}));
  assert.equal(h.client.enqueue(event()),false);await h.client.sync();assert.equal(h.uploaded.length,0);
  await h.client.enable();assert.equal(h.client.enqueue(event({createdAt:new Date(now-1).toISOString()})),false);
  h.offline();const attempt=event();assert.equal(h.client.enqueue(attempt),true);await h.client.sync();
  assert.equal(h.client.getSnapshot().status,"error");assert.equal(h.client.getSnapshot().pending,1);
  const reloaded=new AccountSyncClient(accountId,h.storage,h.transport,lessons,uuid,()=>now);reloaded.activate();assert.equal(reloaded.getSnapshot().pending,1);
  h.online();await reloaded.sync();assert.equal(reloaded.getSnapshot().pending,0);assert.deepEqual(h.uploaded,[attempt]);
  assert.match(h.storage.getItem("guitarhub.learning.v1.guitar")!,/privateGuestHistory/);
});

test("two tabs retain independent new events while an earlier upload is in flight",async()=>{
  const h=harness();await h.client.enable();const upload=deferred<Awaited<ReturnType<SyncTransport>>>();
  const transport:SyncTransport=(url,init)=>init.method==="POST"&&url.endsWith("attempts")?upload.promise:h.transport(url,init);
  const a=new AccountSyncClient(accountId,h.storage,transport,lessons,uuid,()=>now),b=new AccountSyncClient(accountId,h.storage,h.transport,lessons,uuid,()=>now);a.activate();b.activate();
  const first=event(),second=event();a.enqueue(first);const running=a.sync();b.enqueue(second);
  a.externalChange(); // A different tab's outbox write must not cancel the scoped acknowledgement.
  upload.resolve({ok:true,json:async()=>({...binding,acknowledged:[{attempt_id:first.id,sequence:"1"}]})});
  await running;assert.ok(a.getSnapshot().attempts.some(item=>item.id===second.id));
  assert.ok([...h.storage.data.keys()].some(key=>key.includes(`outbox.${second.id}`)));
});

test("logout during upload keeps outbox bytes and rejects late acknowledgements",async()=>{
  const h=harness();await h.client.enable();const pending=deferred<Awaited<ReturnType<SyncTransport>>>();
  const client=new AccountSyncClient(accountId,h.storage,()=>pending.promise,lessons,uuid,()=>now);client.activate();const attempt=event();client.enqueue(attempt);const run=client.sync();
  client.suspend();pending.resolve({ok:true,json:async()=>({...binding,acknowledged:[{attempt_id:attempt.id,sequence:"1"}]})});await run;
  assert.equal(h.storage.getItem(activeSyncAccountKey),"");assert.ok([...h.storage.data.keys()].some(key=>key.endsWith(`outbox.${attempt.id}`)));assert.equal(client.getSnapshot().status,"suspended");
});

test("account switch and remote epoch changes never rebind old attempts",async()=>{
  const h=harness();await h.client.enable();const attempt=event();h.client.enqueue(attempt);
  const another=new AccountSyncClient(other,h.storage,h.transport,lessons,uuid,()=>now);another.activate();h.client.externalChange();assert.equal(h.client.getSnapshot().status,"suspended");assert.equal(h.client.enqueue(event()),false);assert.equal(another.getSnapshot().attempts.length,0);
  h.client.activate();const stale=new AccountSyncClient(accountId,h.storage,()=>ok({accountId,syncEpoch:other,acknowledged:[{attempt_id:attempt.id,sequence:"1"}]}),lessons,uuid,()=>now);stale.activate();await stale.sync();
  assert.equal(stale.getSnapshot().error,"sync_epoch_changed");assert.ok([...h.storage.data.keys()].some(key=>key.endsWith(`outbox.${attempt.id}`)));
});

test("malformed persisted queues and acknowledgement conflicts are preserved visibly",async()=>{
  const h=harness();await h.client.enable();const key=`guitarhub.account-sync.v1.${accountId}.${syncEpoch}.outbox.${uuid()}`;h.storage.setItem(key,"broken");h.client.externalChange();assert.equal(h.client.getSnapshot().status,"error");await h.client.sync();assert.equal(h.storage.getItem(key),"broken");assert.equal(h.uploaded.length,0);
});

test("download cursor advances only after durable events, rejects non-progressing pages",async()=>{
  const h=harness();await h.client.enable();const attempt=event();
  const client=new AccountSyncClient(accountId,h.storage,()=>ok({...binding,attempts:[attempt],cursor:"0",nextCursor:"0"}),lessons,uuid,()=>now);client.activate();await client.sync();assert.equal(client.getSnapshot().error,"invalid_sync_response");assert.equal(client.getSnapshot().attempts.length,0);
});

test("cloud reset rotates epoch while preserving old local queues and stays opt-out",async()=>{
  const h=harness();await h.client.enable();const attempt=event();h.client.enqueue(attempt);
  const client=new AccountSyncClient(accountId,h.storage,()=>ok({accountId,syncEpoch:other}),lessons,uuid,()=>now);client.activate();await client.resetCloudHistory();
  assert.equal(client.getSnapshot().enabled,false);assert.equal(client.getSnapshot().pending,0);assert.equal(client.getSnapshot().attempts.length,1);assert.ok([...h.storage.data.keys()].some(key=>key.endsWith(`outbox.${attempt.id}`)));assert.equal(client.enqueue(event()),false);
});

test("downloaded reading answers recompute real quiz result, retain first answers and isolate tracks",()=>{
  const lesson=allLessons("guitar").find(({lesson})=>getLessonInstructions(lesson.id)?.quiz)!.lesson;
  const quiz=getLessonInstructions(lesson.id)!.quiz!;
  const attempt={id:uuid(),lessonId:lesson.id,createdAt:new Date(now).toISOString(),answers:{}};
  const reading=event({lessonId:lesson.id,kind:"reading",source:"selfReported",disposition:"reflection",score:null,details:{readingQuizAttempt:attempt}});
  const local=emptyReadingQuizProgress("guitar");const merged=mergeAccountReading(local,[reading]);assert.equal(merged.attempts.length,1);
  const progress=mergeAccountProgress(emptyProgress("guitar"),local,[reading]);assert.equal(progress.lessons[lesson.id].assessment,"repeat");
  assert.equal(mergeAccountReading(emptyReadingQuizProgress("voice"),[reading]).attempts.length,0);
  const question=quiz.items[0];
  const first={...attempt,answers:{[question.id]:{optionIndex:0,answeredAt:new Date(now+1000).toISOString()}}};
  const second={...attempt,answers:{[question.id]:{optionIndex:1,answeredAt:new Date(now+2000).toISOString()}}};
  const combined=mergeAccountReading(local,[{...reading,id:uuid(),details:{readingQuizAttempt:second}},{...reading,id:uuid(),details:{readingQuizAttempt:first}}]);
  assert.equal(combined.attempts[0].answers[question.id].optionIndex,0);
});

test("remote score claims and manual overrides cannot pass current measured checkpoint rules",()=>{
  const lesson=allLessons("guitar").find(({lesson})=>lesson.practiceSpec?.completionMinimumBPM)!.lesson;
  const spec=lesson.practiceSpec!;
  const stale=event({lessonId:lesson.id,score:100,bpm:spec.completionMinimumBPM!-1,exerciseRevision:spec.revision??null});
  const manual=event({lessonId:lesson.id,source:"selfReported",disposition:"manualOverride",score:null,details:{localSource:"selfReported"}});
  const insufficient=event({lessonId:lesson.id,disposition:"insufficientSignal",score:null});
  for(const attempt of [stale,manual])assert.equal(mergeAccountProgress(emptyProgress("guitar"),emptyReadingQuizProgress("guitar"),[attempt]).lessons[lesson.id].assessment,"repeat");
  assert.equal(mergeAccountProgress(emptyProgress("guitar"),emptyReadingQuizProgress("guitar"),[insufficient]).lessons[lesson.id],undefined);
});

test("native manual evidence retains self report and cannot create measured history",()=>{
  const manual={id:uuid(),lessonId:"g-l2-m1-03",createdAt:new Date(now).toISOString(),startingChord:"A",count:23,durationSeconds:60,completedMinute:true};
  const attempt=event({lessonId:manual.lessonId,kind:"manualCount",source:"selfReported",disposition:"reflection",score:null,details:{chordChangeAttempt:manual}});
  const history=mergeAccountStageTwo({version:1,track:"guitar",changes:[],studies:[]},[attempt]);assert.equal(history.changes[0].count,23);assert.equal(history.changes[0].interrupted,false);
  assert.deepEqual(mergeAccountProgress(emptyProgress("guitar"),emptyReadingQuizProgress("guitar"),[attempt]).lessons,{});
});

test("more than 1000 downloaded events remain readable without a queue-size truncation",async()=>{
  const h=harness();await h.client.enable();
  for(let index=0;index<1001;index++){
    const attempt=event();h.storage.setItem(`guitarhub.account-sync.v1.${accountId}.${syncEpoch}.inbox.${attempt.id}`,JSON.stringify({...binding,version:1,attempts:[attempt]}));
  }
  h.client.externalChange();assert.equal(h.client.getSnapshot().attempts.length,1001);assert.equal(h.client.getSnapshot().status,"synced");
});

test("changed outbox payload is never deleted by an earlier in-flight acknowledgement",async()=>{
  const h=harness();await h.client.enable();const pending=deferred<Awaited<ReturnType<SyncTransport>>>();
  const client=new AccountSyncClient(accountId,h.storage,()=>pending.promise,lessons,uuid,()=>now);client.activate();const attempt=event();client.enqueue(attempt);const run=client.sync();
  const key=`guitarhub.account-sync.v1.${accountId}.${syncEpoch}.outbox.${attempt.id}`;
  const changed=JSON.stringify({...binding,version:1,attempts:[{...attempt,score:90}]});h.storage.setItem(key,changed);
  pending.resolve({ok:true,json:async()=>({...binding,acknowledged:[{attempt_id:attempt.id,sequence:"1"}]})});await run;
  assert.equal(client.getSnapshot().error,"attempt_identity_conflict");assert.equal(h.storage.getItem(key),changed);
});

test("page persistence failure retains prior cursor and retries all not-yet-durable evidence",async()=>{
  class LimitedStorage extends Storage {
    blocked=false;
    override setItem(key:string,value:string){if(this.blocked&&key.includes(".inbox."))throw new Error("quota");super.setItem(key,value);}
  }
  const storage=new LimitedStorage();const h=harness(storage);await h.client.enable();const attempt=event();
  const client=new AccountSyncClient(accountId,storage,()=>ok({...binding,attempts:[attempt],cursor:"10",nextCursor:null}),lessons,uuid,()=>now);client.activate();storage.blocked=true;await client.sync();
  assert.equal(client.getSnapshot().status,"error");assert.ok(![...storage.data.keys()].some(key=>key.endsWith("cursor.10")));
  storage.blocked=false;await client.sync();assert.ok([...storage.data.keys()].some(key=>key.endsWith("cursor.10")));assert.equal(client.getSnapshot().attempts.length,1);
});

test("stale enable response after pause cannot opt the account in",async()=>{
  const storage=new Storage();const pending=deferred<Awaited<ReturnType<SyncTransport>>>();
  const client=new AccountSyncClient(accountId,storage,()=>pending.promise,lessons,uuid,()=>now);client.activate();const run=client.enable();client.pause();pending.resolve({ok:true,json:async()=>binding});await run;
  assert.equal(client.getSnapshot().enabled,false);assert.equal(client.enqueue(event()),false);
});

test("only full authored target and duration evidence can establish an imported measured pass",()=>{
  const lesson=allLessons("guitar").find(({lesson})=>lesson.practiceSpec?.completionMinimumBPM)!.lesson,spec=lesson.practiceSpec!;
  const bpm=spec.completionMinimumBPM!, practiceSeconds=Math.ceil((spec.targets.at(-1)!.beat+1)*60/bpm);
  const complete=event({lessonId:lesson.id,bpm,practiceSeconds,exerciseRevision:spec.revision??null,score:100,details:{practiceScore:{targetCount:spec.targets.length,matchedTargets:spec.targets.length}}});
  const derive=(attempt:LearningAttempt)=>mergeAccountProgress(emptyProgress("guitar"),emptyReadingQuizProgress("guitar"),[attempt]).lessons[lesson.id];
  assert.equal(derive(complete).assessment,"ready");
  for(const patch of [{practiceSeconds:0},{details:{}},{details:{practiceScore:{targetCount:spec.targets.length-1,matchedTargets:spec.targets.length-1}}},{details:{practiceScore:{targetCount:spec.targets.length,matchedTargets:1}}}])assert.equal(derive({...complete,...patch}).assessment,"repeat");
});

test("reset in another tab rejects a late download before any history or cursor is persisted",async()=>{
  const h=harness();await h.client.enable();const pending=deferred<Awaited<ReturnType<SyncTransport>>>();
  const client=new AccountSyncClient(accountId,h.storage,()=>pending.promise,lessons,uuid,()=>now);client.activate();const run=client.sync();
  const resetter=new AccountSyncClient(accountId,h.storage,()=>ok({accountId,syncEpoch:other}),lessons,uuid,()=>now);resetter.activate();await resetter.resetCloudHistory();client.externalChange();
  const attempt=event();pending.resolve({ok:true,json:async()=>({...binding,attempts:[attempt],cursor:"25",nextCursor:null})});await run;
  assert.ok(![...h.storage.data.keys()].some(key=>key.endsWith(`inbox.${attempt.id}`)||key.endsWith("cursor.25")));assert.equal(client.getSnapshot().enabled,false);
});

test("an expired server session suspends the shared account before accepting another new attempt",async()=>{
  const h=harness();await h.client.enable();const client=new AccountSyncClient(accountId,h.storage,async()=>({ok:false,json:async()=>({error:"sign_in_required"})}),lessons,uuid,()=>now);client.activate();await client.sync();
  assert.equal(client.getSnapshot().status,"suspended");assert.equal(client.permitsLocalWrite(),false);assert.equal(client.enqueue(event()),false);
});

test("continuing an account-owned quiz is allowed but pre-opt-in local or reset-epoch quizzes are not imported",async()=>{
  const h=harness();await h.client.enable();
  const reading={id:uuid(),lessonId:"g-l1-m1-02",createdAt:new Date(now-10000).toISOString(),answers:{}};
  assert.equal(h.client.acceptsReadingAttempt(reading),false);
  const attempt=event({kind:"reading",source:"selfReported",disposition:"reflection",score:null,details:{readingQuizAttempt:{...reading,createdAt:reading.createdAt.replace(".000Z","Z")}}});
  h.storage.setItem(`guitarhub.account-sync.v1.${accountId}.${syncEpoch}.inbox.${attempt.id}`,JSON.stringify({...binding,version:1,attempts:[attempt]}));
  assert.equal(h.client.acceptsReadingAttempt(reading),true);
  const resetter=new AccountSyncClient(accountId,h.storage,()=>ok({accountId,syncEpoch:other}),lessons,uuid,()=>now);resetter.activate();await resetter.resetCloudHistory();
  const next=new AccountSyncClient(accountId,h.storage,(url)=>url.endsWith("binding")?ok({accountId,syncEpoch:other}):ok({accountId,syncEpoch:other,attempts:[],cursor:"0",nextCursor:null}),lessons,uuid,()=>now);next.activate();await next.enable();
  assert.equal(next.acceptsReadingAttempt(reading),false);
});

test("successful multi-page downloads use committed cursors and do not replace concurrent local work",async()=>{
  const h=harness();await h.client.enable();const first=event(),second=event();const requested:string[]=[];
  const transport:SyncTransport=(url)=>{
    const after=new URL(url,"https://local.test").searchParams.get("after")!;requested.push(after);
    return ok({...binding,attempts:after==="0"?[first]:after==="5"?[second]:[],cursor:after==="0"?"5":"9",nextCursor:after==="0"?"5":null});
  };
  const client=new AccountSyncClient(accountId,h.storage,transport,lessons,uuid,()=>now);client.activate();await client.sync();assert.deepEqual(requested,["0","5"]);assert.equal(client.getSnapshot().attempts.length,2);assert.equal(client.getSnapshot().status,"synced");
  await client.sync();assert.deepEqual(requested,["0","5","9"]);assert.equal(client.getSnapshot().attempts.length,2);
});

test("complete correct imported answers pass while a newer unfinished quiz remains a retry",()=>{
  const lesson=allLessons("guitar").find(({lesson})=>getLessonInstructions(lesson.id)?.quiz)!.lesson,quiz=getLessonInstructions(lesson.id)!.quiz!;
  const reading={id:uuid(),lessonId:lesson.id,createdAt:new Date(now).toISOString(),answers:Object.fromEntries(quiz.items.map(question=>[question.id,{optionIndex:question.correctOptionIndex,answeredAt:new Date(now+1000).toISOString()}]))};
  const attempt=event({lessonId:lesson.id,kind:"reading",source:"selfReported",disposition:"reflection",assessment:"repeat",score:null,details:{readingQuizAttempt:reading}});
  const derive=(events:LearningAttempt[])=>mergeAccountProgress(emptyProgress("guitar"),emptyReadingQuizProgress("guitar"),events).lessons[lesson.id];
  assert.equal(derive([attempt]).assessment,"ready");
  const retry=event({...attempt,id:uuid(),createdAt:new Date(now+3000).toISOString(),assessment:"ready",details:{readingQuizAttempt:{...reading,id:uuid(),createdAt:new Date(now+2000).toISOString(),answers:{}}}});
  assert.equal(derive([retry,attempt]).assessment,"repeat");
});

test("slow 25-percent Play retains its real 15 BPM through durable upload",async()=>{
  const h=harness();await h.client.enable();const attempt=event({bpm:15});
  assert.equal(h.client.enqueue(attempt),true);await h.client.sync();assert.equal(h.uploaded[0].bpm,15);assert.equal(h.client.getSnapshot().pending,0);
});

test("large Unicode evidence splits by encoded request bytes and acknowledges only sent IDs without loss",async()=>{
  const h=harness();await h.client.enable();const uploaded:string[]=[],sizes:number[]=[];
  const transport:SyncTransport=(url,init)=>{
    if(init.method!=="POST")return h.transport(url,init);
    const body=String(init.body),parsed=JSON.parse(body);sizes.push(new TextEncoder().encode(body).byteLength);assert.ok(sizes.at(-1)!<=500000);assert.ok(parsed.attempts.length<=100);
    uploaded.push(...parsed.attempts.map((a:LearningAttempt)=>a.id));return ok({...binding,acknowledged:parsed.attempts.map((a:LearningAttempt)=>({attempt_id:a.id,sequence:"1"}))});
  };
  const client=new AccountSyncClient(accountId,h.storage,transport,lessons,uuid,()=>now);client.activate();
  const details=Object.fromEntries(Array.from({length:6},(_,index)=>[`detail${index}`,"弦".repeat(2000)]));
  const attempts=Array.from({length:50},()=>event({details}));for(const attempt of attempts)assert.equal(client.enqueue(attempt),true);
  await client.sync();assert.ok(sizes.length>1);assert.equal(new Set(uploaded).size,50);assert.deepEqual([...uploaded].sort(),attempts.map(a=>a.id).sort());assert.equal(client.getSnapshot().pending,0);
});

test("an acknowledgement for an event excluded by the byte limit cannot delete any queued record",async()=>{
  const h=harness();await h.client.enable();const details=Object.fromEntries(Array.from({length:6},(_,index)=>[`detail${index}`,"弦".repeat(2000)]));
  const attempts=Array.from({length:20},()=>event({details}));
  const client=new AccountSyncClient(accountId,h.storage,(_url,init)=>{
    const body=JSON.parse(String(init.body));const unsent=attempts.find(a=>!body.attempts.some((sent:LearningAttempt)=>sent.id===a.id));assert.ok(unsent);
    return ok({...binding,acknowledged:[{attempt_id:unsent.id,sequence:"1"}]});
  },lessons,uuid,()=>now);client.activate();attempts.forEach(a=>client.enqueue(a));await client.sync();
  assert.equal(client.getSnapshot().error,"invalid_sync_response");assert.equal(client.getSnapshot().pending,20);assert.equal([...h.storage.data.keys()].filter(key=>key.includes(".outbox.")).length,20);
});
