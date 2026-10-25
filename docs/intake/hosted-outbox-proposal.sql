-- PREPARED ONLY. Never applied by this task. No RLS or auth triggers.
-- Operator must verify authoritative project/schema, role privileges, backups,
-- retention and query/readback before separately authorizing installation.
-- Private table + SECURITY INVOKER RPCs; no browser/anon access is granted.
BEGIN;
CREATE SCHEMA guitarhub_intake_private;
REVOKE ALL ON SCHEMA guitarhub_intake_private FROM PUBLIC;
CREATE TABLE guitarhub_intake_private.jobs (
  id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9:_.-]{7,127}$'),
  lane text NOT NULL CHECK (lane IN ('application','purchase','lifecycle','failure','spam','canary')),
  body jsonb NOT NULL CHECK (jsonb_typeof(body) = 'object' AND octet_length(body::text) <= 65536),
  state text NOT NULL CHECK (state IN ('pending','working','blocked','delivered')),
  reason text,
  attempts integer NOT NULL DEFAULT 0,
  token uuid,
  lease_until timestamptz,
  next_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON guitarhub_intake_private.jobs FROM PUBLIC;
CREATE INDEX jobs_pending ON guitarhub_intake_private.jobs (next_at,id) WHERE state IN ('pending','working');
CREATE INDEX jobs_lane ON guitarhub_intake_private.jobs (lane);

CREATE FUNCTION public.guitarhub_intake_enqueue(p_id text,p_lane text,p_body jsonb,p_blocked_reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE prior guitarhub_intake_private.jobs%ROWTYPE; capacity integer;
BEGIN
  capacity := CASE p_lane WHEN 'application' THEN 10000 WHEN 'purchase' THEN 10000 WHEN 'lifecycle' THEN 10000 WHEN 'failure' THEN 1000 WHEN 'spam' THEN 100 WHEN 'canary' THEN 100 ELSE NULL END;
  IF capacity IS NULL OR (p_lane NOT IN ('application','purchase','canary') AND p_blocked_reason IS NULL) THEN RAISE EXCEPTION 'invalid_intake_lane'; END IF;
  -- Serializes admission per lane so concurrent writers cannot exceed its cap.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('guitarhub-intake:' || p_lane,0));
  SELECT * INTO prior FROM guitarhub_intake_private.jobs WHERE id=p_id;
  IF FOUND THEN
    IF prior.lane IS DISTINCT FROM p_lane OR prior.body IS DISTINCT FROM p_body THEN RAISE EXCEPTION 'intake_identity_conflict'; END IF;
    RETURN p_id;
  END IF;
  IF (SELECT count(*) FROM guitarhub_intake_private.jobs WHERE lane=p_lane) >= capacity THEN RAISE EXCEPTION 'intake_lane_capacity'; END IF;
  INSERT INTO guitarhub_intake_private.jobs(id,lane,body,state,reason)
    VALUES(p_id,p_lane,p_body,CASE WHEN p_blocked_reason IS NULL THEN 'pending' ELSE 'blocked' END,p_blocked_reason);
  RETURN p_id;
END $$;

CREATE FUNCTION public.guitarhub_intake_claim()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed guitarhub_intake_private.jobs%ROWTYPE;
BEGIN
  WITH candidate AS (
    SELECT id FROM guitarhub_intake_private.jobs WHERE lane IN ('application','purchase','canary') AND
      ((state='pending' AND next_at<=clock_timestamp()) OR (state='working' AND lease_until<=clock_timestamp()))
    ORDER BY next_at,id FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE guitarhub_intake_private.jobs AS j SET state='working',token=gen_random_uuid(),
      lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1
    FROM candidate WHERE j.id=candidate.id RETURNING j.* INTO claimed;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id',claimed.id,'body',claimed.body,'token',claimed.token,'attempts',claimed.attempts);
END $$;

CREATE FUNCTION public.guitarhub_intake_finish(p_id text,p_token uuid,p_state text,p_reason text,p_delay_ms integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE changed integer;
BEGIN
  IF p_state NOT IN ('pending','blocked','delivered') OR p_delay_ms<0 OR p_delay_ms>86400000 OR length(p_reason)>120 THEN RAISE EXCEPTION 'invalid_intake_completion'; END IF;
  UPDATE guitarhub_intake_private.jobs SET state=p_state,reason=p_reason,
    next_at=clock_timestamp()+p_delay_ms*interval '1 millisecond',token=NULL,lease_until=NULL
    WHERE id=p_id AND token=p_token AND state='working' AND lease_until>clock_timestamp();
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;

CREATE FUNCTION public.guitarhub_intake_repair(p_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE changed integer;
BEGIN
  UPDATE guitarhub_intake_private.jobs SET state='pending',reason=NULL,next_at=clock_timestamp()
    WHERE id=p_id AND lane IN ('application','purchase','canary') AND body->>'kind' IN ('application','purchase') AND state='blocked';
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.guitarhub_intake_enqueue(text,text,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guitarhub_intake_claim() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guitarhub_intake_finish(text,uuid,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guitarhub_intake_repair(text) FROM PUBLIC;
-- No role grants here. Operator privilege mapping and readback remain gates.
COMMIT;
