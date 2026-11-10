-- GuitarHub sell-first ledger: Stripe purchases, per-account free module, email leads
-- and Apple purchase claims. Extends 20260908044358_guitarhub_account_learning_ledger.
-- The service verifies Stripe signatures and Supabase identity before calling these RPCs.
begin;

create table public.guitarhub_stripe_purchases (
  checkout_session_id text primary key,
  payment_intent_id text not null unique,
  email text not null check (email = lower(btrim(email))),
  livemode boolean not null,
  amount_total integer not null,
  currency text not null,
  purchased_at timestamptz not null,
  refunded_at timestamptz,
  received_at timestamptz not null default now()
);
create index guitarhub_stripe_purchase_email on public.guitarhub_stripe_purchases(email);

create table public.guitarhub_stripe_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table public.guitarhub_free_modules (
  account_id uuid primary key references auth.users(id) on delete cascade,
  module_id text not null check (module_id in ('g-l2-m1', 'g-l4-m1', 'g-l5-m4')),
  chosen_at timestamptz not null default now()
);

create table public.guitarhub_leads (
  email text primary key check (email = lower(btrim(email))),
  source text not null check (source in ('plan', 'guide')),
  placement text check (placement in ('beginner', 'intermediate', 'advanced')),
  guide_id text,
  created_at timestamptz not null default now(),
  emails_sent smallint not null default 0 check (emails_sent between 0 and 5),
  last_sent_at timestamptz,
  unsubscribed_at timestamptz
);

alter table public.guitarhub_apple_purchases
  add column claimed boolean not null default false,
  add column owner_email text;

alter table public.guitarhub_stripe_purchases enable row level security;
alter table public.guitarhub_stripe_events enable row level security;
alter table public.guitarhub_free_modules enable row level security;
alter table public.guitarhub_leads enable row level security;

-- No policies: client roles have no access. service_role bypasses RLS and holds the only grants.
revoke all on public.guitarhub_stripe_purchases, public.guitarhub_stripe_events, public.guitarhub_free_modules, public.guitarhub_leads from public, anon, authenticated;
grant select, insert, update, delete on public.guitarhub_stripe_purchases, public.guitarhub_leads to service_role;
grant select, insert on public.guitarhub_stripe_events to service_role;
grant select, insert, delete on public.guitarhub_free_modules to service_role;

-- The first migration's record function inserts a whole row variable, which now includes the
-- new claimed column; it must default to false instead of null. Behavior is otherwise unchanged,
-- and an already linked row keeps its claimed value.
create or replace function public.guitarhub_record_apple_purchase(p_account_id uuid, p_purchase jsonb)
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
  incoming.claimed := false;
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

-- One transaction records the event id and the purchase. A repeated event id or checkout
-- session is a duplicate and changes nothing, so a late purchase event never clears refunded_at.
create function public.guitarhub_record_stripe_purchase(p_event_id text, p_type text, p_purchase jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare inserted integer;
begin
  insert into public.guitarhub_stripe_events(event_id, type) values (p_event_id, p_type)
    on conflict (event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;
  insert into public.guitarhub_stripe_purchases(checkout_session_id, payment_intent_id, email, livemode, amount_total, currency, purchased_at)
    values (
      p_purchase->>'checkoutSessionId',
      p_purchase->>'paymentIntentId',
      lower(btrim(p_purchase->>'email')),
      (p_purchase->>'livemode')::boolean,
      (p_purchase->>'amountTotal')::integer,
      p_purchase->>'currency',
      (p_purchase->>'purchasedAt')::timestamptz
    )
    on conflict (checkout_session_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;
  return 'recorded';
end;
$$;

-- An unknown payment intent stores nothing, so the same event can be redelivered after the
-- purchase event arrives.
create function public.guitarhub_refund_stripe_purchase(p_event_id text, p_payment_intent_id text, p_refunded_at timestamptz)
returns text language plpgsql security invoker set search_path = '' as $$
declare inserted integer;
begin
  perform 1 from public.guitarhub_stripe_purchases where payment_intent_id = p_payment_intent_id for update;
  if not found then return 'unknown_purchase'; end if;
  insert into public.guitarhub_stripe_events(event_id, type) values (p_event_id, 'charge.refunded')
    on conflict (event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;
  update public.guitarhub_stripe_purchases set refunded_at = coalesce(refunded_at, p_refunded_at)
    where payment_intent_id = p_payment_intent_id;
  return 'refunded';
end;
$$;

create function public.guitarhub_set_free_module(p_account_id uuid, p_module_id text) returns text
language plpgsql security invoker set search_path = '' as $$
declare result text;
begin
  insert into public.guitarhub_free_modules(account_id, module_id) values (p_account_id, p_module_id)
    on conflict (account_id) do nothing;
  select module_id into strict result from public.guitarhub_free_modules where account_id = p_account_id;
  return result;
end;
$$;

-- Like guitarhub_record_apple_purchase, but the purchase carries its own appAccountToken
-- (the buyer's binding) and the row is marked claimed. A row left by a deleted account
-- (account_id null) is re-linked only to a claimant whose verified email matches owner_email.
create function public.guitarhub_claim_apple_purchase(p_account_id uuid, p_purchase jsonb, p_email text)
returns public.guitarhub_apple_purchases language plpgsql security invoker set search_path = '' as $$
declare incoming public.guitarhub_apple_purchases; existing public.guitarhub_apple_purchases; claimant_email text := lower(btrim(p_email));
begin
  incoming.environment := p_purchase->>'environment';
  incoming.original_transaction_id := p_purchase->>'originalTransactionId';
  incoming.transaction_id := p_purchase->>'transactionId';
  incoming.account_id := p_account_id;
  incoming.app_account_token := (p_purchase->>'appAccountToken')::uuid;
  incoming.bundle_id := p_purchase->>'bundleId';
  incoming.product_id := p_purchase->>'productId';
  incoming.purchased_at := (p_purchase->>'purchasedAt')::timestamptz;
  incoming.signed_at := (p_purchase->>'signedAt')::timestamptz;
  incoming.revoked_at := (p_purchase->>'revokedAt')::timestamptz;
  incoming.received_at := now();
  incoming.claimed := true;
  insert into public.guitarhub_apple_purchases select incoming.* on conflict (environment, original_transaction_id) do nothing;
  select * into strict existing from public.guitarhub_apple_purchases
    where environment = incoming.environment and original_transaction_id = incoming.original_transaction_id for update;
  if existing.account_id is distinct from p_account_id then
    if existing.account_id is null and claimant_email is not null and existing.owner_email = claimant_email then
      update public.guitarhub_apple_purchases set account_id = p_account_id
        where environment = incoming.environment and original_transaction_id = incoming.original_transaction_id returning * into existing;
    else
      raise exception 'purchase_already_linked' using errcode = '23514';
    end if;
  end if;
  if existing.app_account_token <> incoming.app_account_token or existing.transaction_id <> incoming.transaction_id or existing.bundle_id <> incoming.bundle_id or existing.product_id <> incoming.product_id or existing.purchased_at <> incoming.purchased_at then
    raise exception 'purchase_owner_conflict' using errcode = '23514';
  end if;
  if incoming.signed_at = existing.signed_at and incoming.revoked_at is distinct from existing.revoked_at then
    raise exception 'purchase_event_conflict' using errcode = '23514';
  end if;
  update public.guitarhub_apple_purchases
    set claimed = true,
        signed_at = greatest(signed_at, incoming.signed_at),
        revoked_at = case when incoming.signed_at > signed_at then incoming.revoked_at else revoked_at end,
        received_at = case when incoming.signed_at > signed_at then now() else received_at end
    where environment = incoming.environment and original_transaction_id = incoming.original_transaction_id returning * into existing;
  return existing;
end;
$$;

-- Removes the account's learning data, free-module choice and lead. Stripe purchases are kept.
-- Apple purchase rows keep the owner's email so a later sign-in with it can claim them, and the
-- binding token stays while any Apple purchase references it.
create function public.guitarhub_delete_account(p_account_id uuid, p_email text) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner text := lower(btrim(p_email));
begin
  delete from public.guitarhub_attempts where account_id = p_account_id;
  delete from public.guitarhub_free_modules where account_id = p_account_id;
  if owner is not null then
    delete from public.guitarhub_leads where email = owner;
  end if;
  update public.guitarhub_apple_purchases set owner_email = coalesce(owner, owner_email) where account_id = p_account_id;
  if not exists (select 1 from public.guitarhub_apple_purchases where account_id = p_account_id) then
    delete from public.guitarhub_account_tokens where account_id = p_account_id;
  end if;
end;
$$;

-- The other Suede products share this Supabase project, but their schema is not in this
-- repository. Until it is checked, report the identity as in use so deleting a GuitarHub
-- account never deletes the shared sign-in. See Task 8 and Task 17 of the plan.
create function public.guitarhub_identity_in_use(p_account_id uuid) returns boolean
language sql security invoker set search_path = '' as $$
  select true;
$$;

revoke all on function
  public.guitarhub_record_stripe_purchase(text, text, jsonb),
  public.guitarhub_refund_stripe_purchase(text, text, timestamptz),
  public.guitarhub_set_free_module(uuid, text),
  public.guitarhub_claim_apple_purchase(uuid, jsonb, text),
  public.guitarhub_delete_account(uuid, text),
  public.guitarhub_identity_in_use(uuid)
  from public, anon, authenticated;
grant execute on function
  public.guitarhub_record_stripe_purchase(text, text, jsonb),
  public.guitarhub_refund_stripe_purchase(text, text, timestamptz),
  public.guitarhub_set_free_module(uuid, text),
  public.guitarhub_claim_apple_purchase(uuid, jsonb, text),
  public.guitarhub_delete_account(uuid, text),
  public.guitarhub_identity_in_use(uuid)
  to service_role;
commit;
