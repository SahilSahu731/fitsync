-- Apply after 014, 016 and 017. Atomic, owner-scoped focus blocks; no live data is rewritten on migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.apply_fitsync_focus_block(p_user_id uuid,p_plan_id uuid,p_request_id uuid,p_request_data jsonb,p_config jsonb,p_days jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE prior public.coaching_commands%ROWTYPE; plan public.coaching_plans%ROWTYPE;
  item jsonb; day public.coaching_days%ROWTYPE; source jsonb; old_focus public.companion_records%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.' USING ERRCODE='P0002'; END IF;
  SELECT * INTO prior FROM public.coaching_commands WHERE user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF prior.action<>'focus' OR prior.request_data<>p_request_data THEN RAISE EXCEPTION 'This request key was used for another change.' USING ERRCODE='40001'; END IF;
    RETURN prior.result_id;
  END IF;
  SELECT * INTO plan FROM public.coaching_plans WHERE id=p_plan_id AND user_id=p_user_id AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current plan not found.' USING ERRCODE='P0002'; END IF;
  IF jsonb_typeof(p_days)<>'array' OR jsonb_array_length(p_days) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Preview a complete focus change.' USING ERRCODE='22023'; END IF;
  IF (p_config->>'weeks')::integer NOT IN (4,8) OR (p_config->>'additionalSetsPerWeek')::integer NOT BETWEEN 1 AND 2 OR (p_config->>'startsOn')::date < (now() AT TIME ZONE plan.timezone)::date THEN RAISE EXCEPTION 'Invalid focus window.' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.coaching_days WHERE plan_id=plan.id)<>jsonb_array_length(p_request_data->'expectedRevisions') OR EXISTS(
    SELECT 1 FROM public.coaching_days d WHERE d.plan_id=plan.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_request_data->'expectedRevisions') r WHERE (r->>'id')::uuid=d.id AND (r->>'revision')::integer=d.revision)
  ) THEN RAISE EXCEPTION 'Your plan changed. Preview the focus block again.' USING ERRCODE='40001'; END IF;
  SELECT * INTO old_focus FROM public.companion_records WHERE user_id=p_user_id AND id='focus_active' FOR UPDATE;
  IF FOUND AND NOT old_focus.deleted AND (old_focus.data->>'startsOn')::date+(old_focus.data->>'weeks')::integer*7-1 >= (p_config->>'startsOn')::date THEN RAISE EXCEPTION 'An existing focus window overlaps this block. Review or end it first.' USING ERRCODE='40001'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    SELECT * INTO day FROM public.coaching_days WHERE id=(item->>'id')::uuid AND plan_id=plan.id FOR UPDATE;
    IF NOT FOUND OR day.revision<>(item->>'expectedRevision')::integer THEN RAISE EXCEPTION 'A session changed. Preview again.' USING ERRCODE='40001'; END IF;
    IF day.scheduled_date NOT BETWEEN (p_config->>'startsOn')::date AND (p_config->>'startsOn')::date+(p_config->>'weeks')::integer*7-1 THEN RAISE EXCEPTION 'A session is outside the focus window.' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM public.coaching_workouts c JOIN public.workout_sessions w ON w.id=c.workout_id WHERE c.day_id=day.id AND w.status IN ('active','completed')) THEN RAISE EXCEPTION 'An active or completed workout cannot change.' USING ERRCODE='40001'; END IF;
    IF jsonb_typeof(item->'prescription'->'exercises')<>'array' OR jsonb_array_length(item->'prescription'->'exercises') NOT BETWEEN 2 AND 12 OR (item->'prescription'->>'minutes')::integer NOT BETWEEN 15 AND 90 THEN RAISE EXCEPTION 'Invalid focus prescription.' USING ERRCODE='22023'; END IF;
    FOR source IN SELECT value FROM jsonb_array_elements(item->'prescription'->'exercises') LOOP
      IF NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(source->>'exerciseId')::uuid AND status='published' AND owner_user_id IS NULL) OR (source->>'sets')::integer NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'An exercise changed. Refresh the preview.' USING ERRCODE='40001'; END IF;
    END LOOP;
    UPDATE public.coaching_days SET prescription=item->'prescription',revision=revision+1 WHERE id=day.id;
  END LOOP;
  INSERT INTO public.companion_records(user_id,id,kind,data,revision) VALUES(p_user_id,'focus_active','specialisation',p_config,1)
  ON CONFLICT(user_id,id) DO UPDATE SET kind='specialisation',data=EXCLUDED.data,deleted=false,date=NULL,revision=companion_records.revision+1,updated_at=now();
  INSERT INTO public.coaching_commands(user_id,request_id,action,request_data,result_id) VALUES(p_user_id,p_request_id,'focus',p_request_data,plan.id);
  RETURN plan.id;
END $$;
REVOKE ALL ON FUNCTION public.apply_fitsync_focus_block(uuid,uuid,uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_fitsync_focus_block(uuid,uuid,uuid,jsonb,jsonb,jsonb) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
