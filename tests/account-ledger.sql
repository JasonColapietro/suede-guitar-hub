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
insert into auth.users values ('a1111111-1111-4111-8111-111111111111'), ('b2222222-2222-4222-8222-222222222222');
\ir ../docs/account/ledger-proposal.sql

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
  next_epoch := public.guitarhub_clear_history(a);
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
    perform public.guitarhub_clear_history('a1111111-1111-4111-8111-111111111111');
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
select 'Account ledger permission, idempotence, conflict, revocation, environment and deletion tests passed' as result;
