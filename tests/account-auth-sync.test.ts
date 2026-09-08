import test from "node:test";
import assert from "node:assert/strict";
import { emptyAccountSyncQueue, parseAccountSyncQueue, enqueueAccountAttempt, prepareAccountUpload, acknowledgeAccountUpload, parseAccountAttemptPage, attemptFromLessonRecord } from "../lib/learning-auth/sync.ts";
const id="a1111111-1111-4111-8111-111111111111", epoch="b2222222-2222-4222-8222-222222222222", attemptId="c3333333-3333-4333-8333-333333333333";
const binding={accountId:id,syncEpoch:epoch};
const lessons=new Map([["g-l1-m1-02","guitar" as const]]);
const record={updatedAt:"2026-09-08T01:00:00Z",practiceSeconds:60,assessment:"ready" as const,source:"measured" as const,score:80,bpm:80,practiceSpecRevision:2};
const attempt=attemptFromLessonRecord(attemptId,"guitar","g-l1-m1-02",record,lessons);
test("new attempts retain evidence and retries retain identity; old anonymous IDs cannot auto-import",()=>{
  assert.equal(attempt.exerciseRevision,2);assert.equal(attempt.source,"measured");assert.equal(attempt.id,attemptId);
  assert.throws(()=>attemptFromLessonRecord("legacy-old-id","guitar","g-l1-m1-02",record,lessons));
  const queue=enqueueAccountAttempt(emptyAccountSyncQueue(binding),binding,attempt,lessons);
  assert.equal(enqueueAccountAttempt(queue,binding,attempt,lessons),queue);
  assert.throws(()=>enqueueAccountAttempt(queue,binding,{...attempt,score:90},lessons),/conflict/);
  assert.equal(prepareAccountUpload(queue,binding).attempts.length,1);
});
test("account changes, reset epochs and foreign acknowledgements never delete queued local evidence",()=>{
  const queue=enqueueAccountAttempt(emptyAccountSyncQueue(binding),binding,attempt,lessons);
  for (const current of [{accountId:attemptId,syncEpoch:epoch},{accountId:id,syncEpoch:attemptId}]) {
    assert.throws(()=>prepareAccountUpload(queue,current));
    assert.throws(()=>acknowledgeAccountUpload(queue,current,{...current,acknowledged:[]}));
  }
  assert.throws(()=>acknowledgeAccountUpload(queue,binding,{...binding,acknowledged:[{attempt_id:id,sequence:"1"}]}));
  assert.equal(queue.attempts.length,1);
  const acknowledged=acknowledgeAccountUpload(queue,binding,{...binding,acknowledged:[{attempt_id:attemptId,sequence:"9007199254740993"}]});
  assert.equal(acknowledged.attempts.length,0);
});
test("history pages keep exact cursors and reject cross-account, stale or malformed evidence",()=>{
  const page={...binding,attempts:[attempt],cursor:"9007199254740993",nextCursor:null};
  assert.equal(parseAccountAttemptPage(page,binding,lessons).cursor,page.cursor);
  for (const changes of [{accountId:attemptId},{syncEpoch:attemptId},{cursor:9007199254740993},{attempts:[attempt,attempt]},{nextCursor:"5"}]) assert.throws(()=>parseAccountAttemptPage({...page,...changes},binding,lessons));
});
test("persisted queues validate their original owner and epoch without silent resets",()=>{
  const queue=enqueueAccountAttempt(emptyAccountSyncQueue(binding),binding,attempt,lessons);
  assert.deepEqual(parseAccountSyncQueue(JSON.stringify(queue),binding,lessons),queue);
  assert.throws(()=>parseAccountSyncQueue("{invalid",binding,lessons));
  assert.throws(()=>parseAccountSyncQueue(JSON.stringify(queue),{accountId:attemptId,syncEpoch:epoch},lessons));
  assert.throws(()=>parseAccountSyncQueue(JSON.stringify({...queue,attempts:[attempt,attempt]}),binding,lessons));
});
