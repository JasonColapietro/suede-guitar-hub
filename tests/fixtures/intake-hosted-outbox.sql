-- Exclusively synthetic assertions for a disposable network-isolated PostgreSQL.
DO $$
DECLARE receipt_id text; old_job jsonb; new_job jsonb; prior_body jsonb;
BEGIN
  receipt_id := public.guitarhub_intake_enqueue('application:synthetic-0001','application','{"kind":"application","id":"application:synthetic-0001"}',NULL);
  IF receipt_id <> 'application:synthetic-0001' THEN RAISE EXCEPTION 'bad enqueue'; END IF;
  PERFORM public.guitarhub_intake_enqueue(receipt_id,'application','{"kind":"application","id":"application:synthetic-0001"}',NULL);
  BEGIN
    PERFORM public.guitarhub_intake_enqueue(receipt_id,'application','{"kind":"application","changed":true}',NULL);
    RAISE EXCEPTION 'missing identity conflict';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'intake_identity_conflict' THEN RAISE; END IF; END;
  old_job := public.guitarhub_intake_claim();
  IF old_job->>'id' <> receipt_id OR public.guitarhub_intake_claim() IS NOT NULL THEN RAISE EXCEPTION 'claim duplicates'; END IF;
  UPDATE guitarhub_intake_private.jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE jobs.id=receipt_id;
  new_job := public.guitarhub_intake_claim();
  IF old_job->>'token' = new_job->>'token' THEN RAISE EXCEPTION 'token not fenced'; END IF;
  IF public.guitarhub_intake_finish(receipt_id,(old_job->>'token')::uuid,'delivered',NULL,0) THEN RAISE EXCEPTION 'stale worker completion'; END IF;
  IF NOT public.guitarhub_intake_finish(receipt_id,(new_job->>'token')::uuid,'blocked','http-401',0) THEN RAISE EXCEPTION 'block failed'; END IF;
  SELECT body INTO prior_body FROM guitarhub_intake_private.jobs WHERE jobs.id=receipt_id;
  IF public.guitarhub_intake_claim() IS NOT NULL THEN RAISE EXCEPTION 'blocked record dispatched'; END IF;
  IF NOT public.guitarhub_intake_repair(receipt_id) THEN RAISE EXCEPTION 'repair failed'; END IF;
  new_job := public.guitarhub_intake_claim();
  IF new_job->'body' IS DISTINCT FROM prior_body THEN RAISE EXCEPTION 'repair changed bytes'; END IF;
  IF NOT public.guitarhub_intake_finish(receipt_id,(new_job->>'token')::uuid,'pending','http-429',120000) THEN RAISE EXCEPTION 'retry failed'; END IF;
  IF public.guitarhub_intake_claim() IS NOT NULL THEN RAISE EXCEPTION 'retry ran too soon'; END IF;
  FOR i IN 1..100 LOOP
    PERFORM public.guitarhub_intake_enqueue('spam:synthetic:'||i,'spam','{"category":"spam"}','held');
    PERFORM public.guitarhub_intake_enqueue('canary:synthetic:'||i,'canary','{"category":"canary"}','held');
  END LOOP;
  BEGIN
    PERFORM public.guitarhub_intake_enqueue('spam:synthetic:overflow','spam','{"category":"spam"}','held');
    RAISE EXCEPTION 'missing capacity enforcement';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'intake_lane_capacity' THEN RAISE; END IF; END;
  PERFORM public.guitarhub_intake_enqueue('purchase:synthetic-0001','purchase','{"kind":"purchase"}',NULL);
  new_job := public.guitarhub_intake_claim();
  IF new_job->>'id' <> 'purchase:synthetic-0001' THEN RAISE EXCEPTION 'spam consumed purchase capacity'; END IF;
  IF NOT public.guitarhub_intake_finish(new_job->>'id',(new_job->>'token')::uuid,'delivered',NULL,0) THEN RAISE EXCEPTION 'purchase ack failed'; END IF;
  PERFORM public.guitarhub_intake_enqueue('failure:synthetic','failure','{"code":"application-notification-failed"}','failure-alert-contract');
  IF public.guitarhub_intake_repair('failure:synthetic') THEN RAISE EXCEPTION 'unsupported protocol repaired'; END IF;
END $$;
