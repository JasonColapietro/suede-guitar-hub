-- Run only in a disposable local database. Fixtures deliberately have no real identities.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated;
insert into auth.users values ('a1111111-1111-4111-8111-111111111111'), ('b2222222-2222-4222-8222-222222222222'), ('c5555555-5555-4555-8555-555555555555');
\ir ../docs/account/ledger-proposal.sql
\ir ../supabase/migrations/20261110000000_guitarhub_sell_first.sql

set role service_role;
do $$
declare a uuid := 'a1111111-1111-4111-8111-111111111111'; b uuid := 'b2222222-2222-4222-8222-222222222222'; token_a uuid; token_b uuid; epoch_a uuid; epoch_b uuid; next_epoch uuid; p jsonb; result public.guitarhub_apple_purchases; attempt jsonb; count_rows integer;
begin
  token_a := public.guitarhub_get_account_token(a); token_b := public.guitarhub_get_account_token(b);
  select sync_epoch into epoch_a from public.guitarhub_account_tokens where account_id = a;
  select sync_epoch into epoch_b from public.guitarhub_account_tokens where account_id = b;
  if token_a <> public.guitarhub_get_account_token(a) or token_a = token_b then raise exception 'token stability/isolation failed'; end if;
  p := jsonb_build_object('environment','Production','originalTransactionId','123','transactionId','123','bundleId','org.guitarhub.app','productId','org.guitarhub.app.complete.lifetime','appAccountToken',token_a,'purchasedAt','2026-09-01T00:00:00Z','signedAt','2026-09-02T00:00:00Z','revokedAt',null);
  result := public.guitarhub_record_apple_purchase(a,p);
  result := public.guitarhub_record_apple_purchase(a,p);
  select count(*) into count_rows from public.guitarhub_apple_purchases;
  if count_rows <> 1 or result.account_id <> a then raise exception 'purchase idempotence failed'; end if;
  begin
    perform public.guitarhub_record_apple_purchase(b,p || jsonb_build_object('appAccountToken', token_b));
    raise exception 'owner conflict accepted';
  exception when check_violation then null; end;
  begin
    perform public.guitarhub_record_apple_purchase(a,p || '{"productId":"org.guitarhub.app.complete.annual"}');
    raise exception 'unknown product accepted';
  exception when check_violation then null; end;
  result := public.guitarhub_record_apple_purchase(a,p || '{"environment":"Sandbox"}');
  if result.environment <> 'Sandbox' then raise exception 'environment isolation failed'; end if;
  result := public.guitarhub_record_apple_purchase(a,p || '{"signedAt":"2026-09-03T00:00:00Z","revokedAt":"2026-09-03T00:00:00Z"}');
  result := public.guitarhub_record_apple_purchase(a,p);
  if result.revoked_at is null then raise exception 'old event resurrected revoked purchase'; end if;
  begin
    perform public.guitarhub_record_apple_purchase(a,p || '{"signedAt":"2026-09-03T00:00:00Z"}');
    raise exception 'conflicting duplicate event accepted';
  exception when check_violation then null; end;
  attempt := jsonb_build_object('version',1,'id','c3333333-3333-4333-8333-333333333333','track','guitar','source','selfReported','disposition','reflection');
  perform public.guitarhub_append_attempts(a,epoch_a,jsonb_build_array(attempt));
  perform public.guitarhub_append_attempts(a,epoch_a,jsonb_build_array(attempt));
  select count(*) into count_rows from public.guitarhub_attempts;
  if count_rows <> 1 then raise exception 'duplicate attempt inserted'; end if;
  begin
    perform public.guitarhub_append_attempts(a,epoch_a,jsonb_build_array(attempt || '{"id":"d4444444-4444-4444-8444-444444444444"}', attempt || '{"extra":1}'));
    raise exception 'changed duplicate accepted';
  exception when check_violation then null; end;
  select count(*) into count_rows from public.guitarhub_attempts;
  if count_rows <> 1 then raise exception 'conflicted batch was not atomic'; end if;
  perform public.guitarhub_append_attempts(b,epoch_b,jsonb_build_array(attempt));
  next_epoch := public.guitarhub_clear_history(a,epoch_a);
  if next_epoch = epoch_a or token_a <> public.guitarhub_get_account_token(a) then raise exception 'history reset changed purchase binding or kept old sync epoch'; end if;
  select count(*) into count_rows from public.guitarhub_apple_purchases where account_id = a;
  if count_rows <> 2 then raise exception 'history reset changed purchases'; end if;
  begin
    perform public.guitarhub_append_attempts(a,epoch_a,jsonb_build_array(attempt));
    raise exception 'old queue resurrected deleted history';
  exception when check_violation then null; end;
  select count(*) into count_rows from public.guitarhub_attempts where account_id = a;
  if count_rows <> 0 then raise exception 'reset did not delete history'; end if;
  perform public.guitarhub_append_attempts(a,next_epoch,jsonb_build_array(attempt || '{"id":"d4444444-4444-4444-8444-444444444444"}'));
  begin
    perform public.guitarhub_clear_history(a,epoch_a);
    raise exception 'replayed reset deleted new history';
  exception when check_violation then null; end;
  select count(*) into count_rows from public.guitarhub_attempts where account_id = a;
  if count_rows <> 1 then raise exception 'replayed reset lost new attempts'; end if;
  begin
    update public.guitarhub_attempts set body = body || '{"score":100}';
    raise exception 'attempt update accepted';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'b2222222-2222-4222-8222-222222222222';
do $$
declare count_rows integer;
begin
  select count(*) into count_rows from public.guitarhub_account_tokens;
  if count_rows <> 1 then raise exception 'token owner read isolation failed'; end if;
  select count(*) into count_rows from public.guitarhub_apple_purchases;
  if count_rows <> 0 then raise exception 'purchase leaked across accounts'; end if;
  select count(*) into count_rows from public.guitarhub_attempts;
  if count_rows <> 1 then raise exception 'attempt owner read isolation failed'; end if;
  begin
    perform public.guitarhub_get_account_token('a1111111-1111-4111-8111-111111111111');
    raise exception 'client invoked token RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform public.guitarhub_record_apple_purchase('a1111111-1111-4111-8111-111111111111','{}');
    raise exception 'client invoked grant RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform public.guitarhub_append_attempts('a1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','[]');
    raise exception 'client selected arbitrary upload account';
  exception when insufficient_privilege then null; end;
  begin
    perform public.guitarhub_clear_history('a1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111');
    raise exception 'client invoked another account reset';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.guitarhub_attempts;
    raise exception 'client deleted attempts';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
set role anon;
do $$
begin
  begin
    perform 1 from public.guitarhub_apple_purchases;
    raise exception 'anonymous read accepted';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

-- Account deletion removes progress and binding; purchase tombstone prevents silent transfer.
delete from auth.users where id = 'a1111111-1111-4111-8111-111111111111';
set role service_role;
do $$
declare p jsonb; token_b uuid; count_rows integer;
begin
  select count(*) into count_rows from public.guitarhub_attempts where account_id = 'a1111111-1111-4111-8111-111111111111';
  if count_rows <> 0 then raise exception 'deleted account retained progress'; end if;
  token_b := public.guitarhub_get_account_token('b2222222-2222-4222-8222-222222222222');
  p := jsonb_build_object('environment','Production','originalTransactionId','123','transactionId','123','bundleId','org.guitarhub.app','productId','org.guitarhub.app.complete.lifetime','appAccountToken',token_b,'purchasedAt','2026-09-01T00:00:00Z','signedAt','2026-09-04T00:00:00Z','revokedAt',null);
  begin
    perform public.guitarhub_record_apple_purchase('b2222222-2222-4222-8222-222222222222',p);
    raise exception 'deleted owner purchase was reassigned';
  exception when check_violation then null; end;
end;
$$;
reset role;
-- Sell-first ledger: Stripe purchases, free module, Apple claims, deletion and client privileges.
set role service_role;
do $$
declare b uuid := 'b2222222-2222-4222-8222-222222222222'; c uuid := 'c5555555-5555-4555-8555-555555555555'; token_c uuid; epoch_c uuid; p jsonb; ap jsonb; result public.guitarhub_apple_purchases; count_rows integer; r text; refunded timestamptz;
begin
  p := jsonb_build_object('checkoutSessionId','cs_test_1','paymentIntentId','pi_test_1','email','Buyer@Example.com ','livemode',false,'amountTotal',4900,'currency','usd','purchasedAt','2026-11-10T00:00:00Z');
  if public.guitarhub_record_stripe_purchase('evt_1','checkout.session.completed',p) <> 'recorded' then raise exception 'first stripe event not recorded'; end if;
  if public.guitarhub_record_stripe_purchase('evt_1','checkout.session.completed',p) <> 'duplicate' then raise exception 'repeated stripe event not duplicate'; end if;
  select count(*) into count_rows from public.guitarhub_stripe_purchases;
  if count_rows <> 1 then raise exception 'stripe event twice left % purchase rows', count_rows; end if;
  if (select email from public.guitarhub_stripe_purchases) <> 'buyer@example.com' then raise exception 'purchase email not normalized'; end if;
  if public.guitarhub_record_stripe_purchase('evt_2','checkout.session.async_payment_succeeded',p) <> 'duplicate' then raise exception 'second event for same checkout session not duplicate'; end if;
  select count(*) into count_rows from public.guitarhub_stripe_purchases;
  if count_rows <> 1 then raise exception 'second event for same session added a row'; end if;
  begin
    perform public.guitarhub_record_stripe_purchase('evt_bad','checkout.session.completed', p || '{"checkoutSessionId":"cs_test_bad","paymentIntentId":"pi_test_1"}');
    raise exception 'reused payment intent accepted';
  exception when unique_violation then null; end;

  r := public.guitarhub_refund_stripe_purchase('evt_r0','pi_unknown','2026-11-11T00:00:00Z');
  if r <> 'unknown_purchase' then raise exception 'unknown refund returned %', r; end if;
  select count(*) into count_rows from public.guitarhub_stripe_events where event_id = 'evt_r0';
  if count_rows <> 0 then raise exception 'unknown refund stored its event id'; end if;
  r := public.guitarhub_refund_stripe_purchase('evt_r1','pi_test_1','2026-11-11T00:00:00Z');
  if r <> 'refunded' then raise exception 'refund returned %', r; end if;
  if public.guitarhub_refund_stripe_purchase('evt_r1','pi_test_1','2026-11-12T00:00:00Z') <> 'duplicate' then raise exception 'repeated refund not duplicate'; end if;
  select refunded_at into refunded from public.guitarhub_stripe_purchases where checkout_session_id = 'cs_test_1';
  if refunded is distinct from '2026-11-11T00:00:00Z'::timestamptz then raise exception 'refund time not kept'; end if;
  if public.guitarhub_record_stripe_purchase('evt_3','checkout.session.completed',p) <> 'duplicate' then raise exception 'purchase after refund not duplicate'; end if;
  select refunded_at into refunded from public.guitarhub_stripe_purchases where checkout_session_id = 'cs_test_1';
  if refunded is null then raise exception 'purchase event after refund cleared refunded_at'; end if;

  if public.guitarhub_set_free_module(b,'g-l2-m1') <> 'g-l2-m1' then raise exception 'first free module not stored'; end if;
  if public.guitarhub_set_free_module(b,'g-l4-m1') <> 'g-l2-m1' then raise exception 'free module was changed'; end if;
  begin
    perform public.guitarhub_set_free_module(c,'g-l1-m1');
    raise exception 'unknown free module accepted';
  exception when check_violation then null; end;

  token_c := public.guitarhub_get_account_token(c);
  ap := jsonb_build_object('environment','Production','originalTransactionId','777','transactionId','777','bundleId','org.guitarhub.app','productId','org.guitarhub.app.complete.lifetime','appAccountToken',token_c,'purchasedAt','2026-09-01T00:00:00Z','signedAt','2026-09-02T00:00:00Z','revokedAt',null);
  result := public.guitarhub_claim_apple_purchase(c, ap, 'owner@example.com');
  if result.account_id <> c or not result.claimed then raise exception 'claim did not link and mark claimed'; end if;
  begin
    perform public.guitarhub_claim_apple_purchase(b, ap, 'other@example.com');
    raise exception 'second account claimed a claimed purchase';
  exception when others then
    if sqlerrm <> 'purchase_already_linked' then raise; end if;
  end;

  perform public.guitarhub_set_free_module(c,'g-l5-m4');
  insert into public.guitarhub_leads(email, source) values ('owner@example.com','plan'), ('keep@example.com','guide');
  insert into public.guitarhub_attempts(account_id, attempt_id, body) values (c,'e6666666-6666-4666-8666-666666666666',
    '{"version":1,"id":"e6666666-6666-4666-8666-666666666666","track":"guitar","source":"selfReported","disposition":"reflection"}');
  perform public.guitarhub_record_stripe_purchase('evt_4','checkout.session.completed', p || '{"checkoutSessionId":"cs_test_2","paymentIntentId":"pi_test_2","email":"owner@example.com"}');
  select sync_epoch into epoch_c from public.guitarhub_account_tokens where account_id = c;
  perform public.guitarhub_delete_account(c, 'Owner@Example.com');
  begin
    perform public.guitarhub_append_attempts(c, epoch_c, '[{"version":1,"id":"e7777777-7777-4777-8777-777777777777","track":"guitar","source":"selfReported","disposition":"reflection"}]');
    raise exception 'append with the pre-deletion epoch recreated history';
  exception when others then
    if sqlerrm <> 'sync_epoch_changed' then raise; end if;
  end;
  select count(*) into count_rows from public.guitarhub_attempts where account_id = c;
  if count_rows <> 0 then raise exception 'stale-epoch append left attempts after deletion'; end if;
  select count(*) into count_rows from public.guitarhub_attempts where account_id = c;
  if count_rows <> 0 then raise exception 'delete_account kept attempts'; end if;
  select count(*) into count_rows from public.guitarhub_free_modules where account_id = c;
  if count_rows <> 0 then raise exception 'delete_account kept free module'; end if;
  select count(*) into count_rows from public.guitarhub_leads where email = 'owner@example.com';
  if count_rows <> 0 then raise exception 'delete_account kept the lead'; end if;
  select count(*) into count_rows from public.guitarhub_leads where email = 'keep@example.com';
  if count_rows <> 1 then raise exception 'delete_account removed another lead'; end if;
  select count(*) into count_rows from public.guitarhub_stripe_purchases where email = 'owner@example.com';
  if count_rows <> 1 then raise exception 'delete_account removed the Stripe purchase'; end if;
  if (select owner_email from public.guitarhub_apple_purchases where original_transaction_id = '777') is distinct from 'owner@example.com' then raise exception 'delete_account did not record owner_email'; end if;
  select count(*) into count_rows from public.guitarhub_account_tokens where account_id = c;
  if count_rows <> 1 then raise exception 'delete_account removed the binding token of an Apple purchase owner'; end if;
  perform public.guitarhub_delete_account(b, null);
  select count(*) into count_rows from public.guitarhub_account_tokens where account_id = b;
  if count_rows <> 0 then raise exception 'delete_account kept a token with no Apple purchase'; end if;
  if public.guitarhub_identity_in_use(c) is not true then raise exception 'identity_in_use must default to true'; end if;
end;
$$;
reset role;

-- The purchase left behind by a deleted account is re-linked only to its verified email.
delete from auth.users where id = 'c5555555-5555-4555-8555-555555555555';
set role service_role;
do $$
declare b uuid := 'b2222222-2222-4222-8222-222222222222'; ap jsonb; result public.guitarhub_apple_purchases;
begin
  select jsonb_build_object('environment',environment,'originalTransactionId',original_transaction_id,'transactionId',transaction_id,'bundleId',bundle_id,'productId',product_id,'appAccountToken',app_account_token,'purchasedAt',purchased_at,'signedAt',signed_at,'revokedAt',revoked_at)
    into ap from public.guitarhub_apple_purchases where original_transaction_id = '777';
  begin
    perform public.guitarhub_claim_apple_purchase(b, ap, 'other@example.com');
    raise exception 'orphaned purchase claimed with another email';
  exception when others then
    if sqlerrm <> 'purchase_already_linked' then raise; end if;
  end;
  -- The real caller sends the claimant's own binding token, not the deleted account's.
  ap := ap || jsonb_build_object('appAccountToken', public.guitarhub_get_account_token(b));
  result := public.guitarhub_claim_apple_purchase(b, ap, 'Owner@example.com');
  if result.account_id <> b or not result.claimed then raise exception 'orphaned purchase not re-linked to its owner email'; end if;
  if result.app_account_token <> public.guitarhub_get_account_token(b) then raise exception 're-link did not bind the claimant token'; end if;
end;
$$;
reset role;

-- Client roles cannot write the new tables or call the new functions.
do $$
declare r text; t text; f text;
begin
  foreach r in array array['anon','authenticated'] loop
    execute format('set local role %I', r);
    foreach t in array array[
      $q$insert into public.guitarhub_stripe_purchases values ('x','y','x@example.com',false,1,'usd',now(),null,now())$q$,
      $q$insert into public.guitarhub_stripe_events(event_id, type) values ('x','y')$q$,
      $q$insert into public.guitarhub_free_modules(account_id, module_id) values ('b2222222-2222-4222-8222-222222222222','g-l2-m1')$q$,
      $q$insert into public.guitarhub_leads(email, source) values ('x@example.com','plan')$q$,
      $q$select 1 from public.guitarhub_stripe_purchases$q$,
      $q$select 1 from public.guitarhub_leads$q$,
      $q$update public.guitarhub_apple_purchases set claimed = true$q$
    ] loop
      begin
        execute t;
        raise exception '% ran: %', r, t;
      exception when insufficient_privilege then null; end;
    end loop;
    foreach f in array array[
      $q$public.guitarhub_record_stripe_purchase('e','t','{}')$q$,
      $q$public.guitarhub_refund_stripe_purchase('e','p',now())$q$,
      $q$public.guitarhub_set_free_module('b2222222-2222-4222-8222-222222222222','g-l2-m1')$q$,
      $q$public.guitarhub_claim_apple_purchase('b2222222-2222-4222-8222-222222222222','{}','x@example.com')$q$,
      $q$public.guitarhub_delete_account('b2222222-2222-4222-8222-222222222222','x@example.com')$q$,
      $q$public.guitarhub_identity_in_use('b2222222-2222-4222-8222-222222222222')$q$
    ] loop
      begin
        execute 'select ' || f;
        raise exception '% executed: %', r, f;
      exception when insufficient_privilege then null; end;
    end loop;
    reset role;
  end loop;
end;
$$;

select 'Account ledger permission, idempotence, conflict, revocation, environment, deletion, Stripe, free-module, claim and lead tests passed' as result;
