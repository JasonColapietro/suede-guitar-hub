-- PROPOSAL ONLY. Apply only after scoped database/credential approval.
-- New GuitarHub objects only; existing Apple ledger and shared auth policies unchanged.
begin;
create table public.guitarhub_web_orders (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references auth.users(id) on delete cascade,
 livemode boolean not null,
 price_id text not null check (price_id like 'price_%'),
 product_id text not null check (product_id like 'prod_%'),
 checkout_session_id text unique check(checkout_session_id like 'cs_%'),
 payment_intent_id text unique check(payment_intent_id like 'pi_%'),
 state text not null default 'pending' check(state in ('pending','paid','refunded','disputed','expired')),
 revision integer not null default 0 check(revision>=0),
 observed_at timestamptz not null default '-infinity',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.guitarhub_web_orders enable row level security;
revoke all on public.guitarhub_web_orders from public, anon, authenticated;
grant select, insert, update on public.guitarhub_web_orders to service_role;
create index guitarhub_web_orders_account on public.guitarhub_web_orders(account_id,livemode);
create unique index guitarhub_web_orders_active on public.guitarhub_web_orders(account_id,livemode) where state in ('pending','paid','disputed');

create function public.guitarhub_reserve_web_order(p_account_id uuid,p_livemode boolean,p_price_id text,p_product_id text)
returns setof public.guitarhub_web_orders language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.guitarhub_web_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_account_id::text||p_livemode::text,0));
 select * into r from public.guitarhub_web_orders where account_id=p_account_id and livemode=p_livemode and state in ('pending','paid','disputed') for update;
 if not found then
  insert into public.guitarhub_web_orders(account_id,livemode,price_id,product_id) values(p_account_id,p_livemode,p_price_id,p_product_id) returning * into r;
 end if;
 return next r;
end;$$;
create function public.guitarhub_bind_web_order(p_id uuid,p_account_id uuid,p_session_id text)
returns setof public.guitarhub_web_orders language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.guitarhub_web_orders;
begin
 if p_session_id not like 'cs_%' then raise exception 'invalid_purchase';end if;
 select * into strict r from public.guitarhub_web_orders where id=p_id and account_id=p_account_id for update;
 if r.checkout_session_id is not null and r.checkout_session_id<>p_session_id then raise exception 'purchase_owner_conflict';end if;
 update public.guitarhub_web_orders set checkout_session_id=p_session_id,updated_at=now() where id=p_id returning * into r;
 return next r;
end;$$;
create function public.guitarhub_record_web_order(p_id uuid,p_session_id text,p_payment_id text,p_state text,p_observed_at timestamptz,p_revision integer)
returns setof public.guitarhub_web_orders language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.guitarhub_web_orders;
begin
 if p_state in ('paid','refunded','disputed') and (p_payment_id is null or p_payment_id not like 'pi_%') then raise exception 'invalid_purchase';end if;
 if p_revision is null or p_revision<0 or p_state not in ('pending','paid','refunded','disputed','expired') or p_observed_at>now()+interval '1 minute' then raise exception 'invalid_purchase';end if;
 select * into strict r from public.guitarhub_web_orders where id=p_id and checkout_session_id=p_session_id for update;
 if r.payment_intent_id is not null and p_payment_id is distinct from r.payment_intent_id then raise exception 'purchase_owner_conflict';end if;
 -- Provider requests can finish out of order. Fresh denial evidence always
 -- wins, even when that request started earlier. Refunds remain terminal.
 -- A revision fence rejects paid reads already in flight before a denial,
 -- regardless of app/database clock skew or network request ordering.
 -- Restoring disputed access also requires a strictly newer observation; ties
 -- cannot prove that a paid response is newer than the denial.
 if r.state='refunded'
  or (p_state not in ('refunded','disputed') and r.observed_at>p_observed_at)
  or (r.state='disputed' and p_state='paid' and (r.revision<>p_revision or r.observed_at>=p_observed_at))
  or (r.state in ('paid','disputed') and p_state in ('pending','expired')) then return next r;return;end if;
 update public.guitarhub_web_orders set payment_intent_id=coalesce(p_payment_id,payment_intent_id),state=p_state,revision=revision+1,observed_at=greatest(observed_at,p_observed_at),updated_at=now() where id=p_id returning * into r;
 return next r;
end;$$;
revoke all on function public.guitarhub_reserve_web_order(uuid,boolean,text,text) from public,anon,authenticated;
revoke all on function public.guitarhub_bind_web_order(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.guitarhub_record_web_order(uuid,text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.guitarhub_reserve_web_order(uuid,boolean,text,text) to service_role;
grant execute on function public.guitarhub_bind_web_order(uuid,uuid,text) to service_role;
grant execute on function public.guitarhub_record_web_order(uuid,text,text,text,timestamptz,integer) to service_role;
commit;
