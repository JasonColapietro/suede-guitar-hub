-- GuitarHub account, purchase and attempt ledger. Existing product tables are unchanged.
-- The service verifies Supabase identity and Apple signatures before calling these RPCs.
begin;

create table public.guitarhub_account_tokens (
  account_id uuid primary key references auth.users(id) on delete cascade,
  app_account_token uuid not null unique default gen_random_uuid(),
  sync_epoch uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.guitarhub_apple_purchases (
  environment text not null check (environment in ('Production', 'Sandbox')),
  original_transaction_id text not null check (original_transaction_id ~ '^[0-9]{1,40}$'),
  transaction_id text not null check (transaction_id ~ '^[0-9]{1,40}$'),
  -- A deleted account cannot be silently replaced by the next claimant.
  account_id uuid references auth.users(id) on delete set null,
  app_account_token uuid not null,
  bundle_id text not null check (bundle_id = 'org.guitarhub.app'),
  product_id text not null check (product_id = 'org.guitarhub.app.complete.lifetime'),
  purchased_at timestamptz not null,
  signed_at timestamptz not null,
  revoked_at timestamptz,
  received_at timestamptz not null default now(),
  primary key (environment, original_transaction_id),
  unique (environment, transaction_id),
  check (signed_at >= purchased_at)
);
create index guitarhub_purchase_account on public.guitarhub_apple_purchases(account_id, environment);

create table public.guitarhub_attempts (
  account_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  sequence bigint generated always as identity unique,
  body jsonb not null check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 32768),
  received_at timestamptz not null default now(),
  primary key (account_id, attempt_id),
  check (body ?& array['version', 'id', 'track', 'source', 'disposition']),
  check (body->>'version' = '1'),
  check (body->>'id' = attempt_id::text),
  check (body->>'track' in ('guitar', 'voice')),
  check (body->>'source' in ('measured', 'selfReported', 'legacy')),
  check (body->>'disposition' in ('scored', 'insufficientSignal', 'manualOverride', 'reflection', 'imported'))
);
create index guitarhub_attempt_account_cursor on public.guitarhub_attempts(account_id, sequence);

alter table public.guitarhub_account_tokens enable row level security;
alter table public.guitarhub_apple_purchases enable row level security;
alter table public.guitarhub_attempts enable row level security;

revoke all on public.guitarhub_account_tokens, public.guitarhub_apple_purchases, public.guitarhub_attempts from public, anon, authenticated;
revoke all on sequence public.guitarhub_attempts_sequence_seq from public, anon, authenticated;
grant select on public.guitarhub_account_tokens, public.guitarhub_apple_purchases, public.guitarhub_attempts to authenticated;
grant select, insert, update, delete on public.guitarhub_account_tokens, public.guitarhub_apple_purchases to service_role;
grant select, insert, delete on public.guitarhub_attempts to service_role;
grant usage, select on sequence public.guitarhub_attempts_sequence_seq to service_role;

create policy guitarhub_read_own_token on public.guitarhub_account_tokens for select to authenticated using ((select auth.uid()) = account_id);
create policy guitarhub_read_own_purchase on public.guitarhub_apple_purchases for select to authenticated using ((select auth.uid()) = account_id);
create policy guitarhub_read_own_attempts on public.guitarhub_attempts for select to authenticated using ((select auth.uid()) = account_id);

create function public.guitarhub_get_account_token(p_account_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  insert into public.guitarhub_account_tokens(account_id) values (p_account_id)
    on conflict (account_id) do nothing;
  select app_account_token into strict result from public.guitarhub_account_tokens where account_id = p_account_id;
  return result;
end;
$$;

-- Exact account, environment and original-transaction ownership are immutable.
-- Newer verified events can revoke or restore access; old delivery cannot reverse them.
create function public.guitarhub_record_apple_purchase(p_account_id uuid, p_purchase jsonb)
returns public.guitarhub_apple_purchases language plpgsql security invoker set search_path = '' as $$
declare incoming public.guitarhub_apple_purchases; existing public.guitarhub_apple_purchases; expected_token uuid;
begin
  select app_account_token into expected_token from public.guitarhub_account_tokens where account_id = p_account_id;
  if expected_token is null or expected_token is distinct from (p_purchase->>'appAccountToken')::uuid then
    raise exception 'purchase_owner_conflict' using errcode = '23514';
  end if;
  incoming.environment := p_purchase->>'environment';
  incoming.original_transaction_id := p_purchase->>'originalTransactionId';
  incoming.transaction_id := p_purchase->>'transactionId';
  incoming.account_id := p_account_id;
  incoming.app_account_token := expected_token;
  incoming.bundle_id := p_purchase->>'bundleId';
  incoming.product_id := p_purchase->>'productId';
  incoming.purchased_at := (p_purchase->>'purchasedAt')::timestamptz;
  incoming.signed_at := (p_purchase->>'signedAt')::timestamptz;
  incoming.revoked_at := (p_purchase->>'revokedAt')::timestamptz;
  incoming.received_at := now();
  insert into public.guitarhub_apple_purchases select incoming.* on conflict (environment, original_transaction_id) do nothing;
  select * into strict existing from public.guitarhub_apple_purchases
    where environment = incoming.environment and original_transaction_id = incoming.original_transaction_id for update;
  if existing.account_id is distinct from p_account_id or existing.app_account_token <> expected_token or existing.transaction_id <> incoming.transaction_id or existing.bundle_id <> incoming.bundle_id or existing.product_id <> incoming.product_id or existing.purchased_at <> incoming.purchased_at then
    raise exception 'purchase_owner_conflict' using errcode = '23514';
  end if;
  if incoming.signed_at = existing.signed_at and incoming.revoked_at is distinct from existing.revoked_at then
    raise exception 'purchase_event_conflict' using errcode = '23514';
  end if;
  if incoming.signed_at > existing.signed_at then
    update public.guitarhub_apple_purchases set signed_at = incoming.signed_at, revoked_at = incoming.revoked_at, received_at = now()
      where environment = incoming.environment and original_transaction_id = incoming.original_transaction_id returning * into existing;
  end if;
  return existing;
end;
$$;

-- The route validates every attempt with parseLearningAttempt before this atomic RPC.
-- Identical retries acknowledge the existing row; a changed duplicate rolls back the batch.
create function public.guitarhub_append_attempts(p_account_id uuid, p_sync_epoch uuid, p_attempts jsonb)
returns table (attempt_id uuid, sequence text) language plpgsql security invoker set search_path = '' as $$
declare attempt jsonb; current_body jsonb; current_id uuid; current_epoch uuid;
begin
  -- Serializes against reset: an accepted old batch is removed by reset, and a
  -- batch arriving after reset cannot recreate the deleted history.
  select sync_epoch into current_epoch from public.guitarhub_account_tokens where account_id = p_account_id for update;
  if current_epoch is null or current_epoch is distinct from p_sync_epoch then
    raise exception 'sync_epoch_changed' using errcode = '23514';
  end if;
  if jsonb_typeof(p_attempts) is distinct from 'array' or jsonb_array_length(p_attempts) > 100 then
    raise exception 'invalid_attempt_batch' using errcode = '23514';
  end if;
  for attempt in select value from jsonb_array_elements(p_attempts) loop
    current_id := (attempt->>'id')::uuid;
    insert into public.guitarhub_attempts(account_id, attempt_id, body) values (p_account_id, current_id, attempt)
      on conflict on constraint guitarhub_attempts_pkey do nothing;
    select stored.body into strict current_body from public.guitarhub_attempts stored
      where stored.account_id = p_account_id and stored.attempt_id = current_id;
    if current_body is distinct from attempt then raise exception 'attempt_identity_conflict' using errcode = '23514'; end if;
    return query select stored.attempt_id, stored.sequence::text from public.guitarhub_attempts stored
      where stored.account_id = p_account_id and stored.attempt_id = current_id;
  end loop;
end;
$$;

create function public.guitarhub_clear_history(p_account_id uuid, p_sync_epoch uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare current_epoch uuid; next_epoch uuid;
begin
  select sync_epoch into current_epoch from public.guitarhub_account_tokens where account_id = p_account_id for update;
  if current_epoch is null or current_epoch is distinct from p_sync_epoch then
    raise exception 'sync_epoch_changed' using errcode = '23514';
  end if;
  update public.guitarhub_account_tokens set sync_epoch = gen_random_uuid() where account_id = p_account_id returning sync_epoch into next_epoch;
  if next_epoch is null then raise exception 'account_binding_missing' using errcode = '23514'; end if;
  delete from public.guitarhub_attempts where account_id = p_account_id;
  return next_epoch;
end;
$$;

revoke all on function public.guitarhub_get_account_token(uuid), public.guitarhub_record_apple_purchase(uuid, jsonb), public.guitarhub_append_attempts(uuid, uuid, jsonb), public.guitarhub_clear_history(uuid, uuid) from public, anon, authenticated;
grant execute on function public.guitarhub_get_account_token(uuid), public.guitarhub_record_apple_purchase(uuid, jsonb), public.guitarhub_append_attempts(uuid, uuid, jsonb), public.guitarhub_clear_history(uuid, uuid) to service_role;
commit;
