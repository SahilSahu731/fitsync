-- Adaptive coaching. Additive, service-role-only. Apply after 008 and 012.
BEGIN;
CREATE TABLE IF NOT EXISTS public.coaching_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  name text NOT NULL, profile jsonb NOT NULL, start_date date NOT NULL, timezone text NOT NULL,
  explanation jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coaching_one_active_plan ON public.coaching_plans(user_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS public.coaching_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES public.coaching_plans(id) ON DELETE CASCADE,
  sequence integer NOT NULL, week_number integer NOT NULL CHECK(week_number BETWEEN 1 AND 4), day_number integer NOT NULL CHECK(day_number BETWEEN 1 AND 7),
  scheduled_date date NOT NULL, name text NOT NULL, prescription jsonb NOT NULL CHECK(jsonb_typeof(prescription)='object'),
  revision integer NOT NULL DEFAULT 0 CHECK(revision>=0), template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  UNIQUE(plan_id,sequence), CONSTRAINT coaching_unique_date UNIQUE(plan_id,scheduled_date) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS public.coaching_workouts (
  day_id uuid NOT NULL REFERENCES public.coaching_days(id) ON DELETE CASCADE,
  workout_id uuid PRIMARY KEY REFERENCES public.workout_sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS coaching_workouts_day ON public.coaching_workouts(day_id);
CREATE TABLE IF NOT EXISTS public.coaching_commands (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE, request_id uuid NOT NULL,
  action text NOT NULL, request_data jsonb NOT NULL, result_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_id)
);

-- All mutations lock the account before checking the idempotency key. Concurrent retries
-- cannot create a second plan, a second workout or apply a schedule shift twice.
CREATE OR REPLACE FUNCTION public.create_fitsync_coaching_plan(p_user_id uuid,p_request_id uuid,p_request_data jsonb,p_plan jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE old public.coaching_commands%ROWTYPE; current_id uuid; plan_id uuid := gen_random_uuid();
  day jsonb; exercise jsonb; template uuid; exercise_item uuid; existing_key text; templates jsonb := '{}'; position integer; sequence integer := 0;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.' USING ERRCODE='P0002'; END IF;
  SELECT * INTO old FROM public.coaching_commands WHERE user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF old.action<>'create' OR old.request_data<>p_request_data THEN RAISE EXCEPTION 'This request key was already used for a different change.' USING ERRCODE='40001'; END IF;
    RETURN old.result_id;
  END IF;
  SELECT id INTO current_id FROM public.coaching_plans WHERE user_id=p_user_id AND status='active';
  IF current_id IS DISTINCT FROM (p_request_data->>'replacePlanId')::uuid THEN RAISE EXCEPTION 'Your plan changed. Refresh before replacing it.' USING ERRCODE='40001'; END IF;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=p_user_id AND status='active') THEN RAISE EXCEPTION 'Finish or discard your current workout before replacing a plan.' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_plan->>'timezone') THEN RAISE EXCEPTION 'Invalid timezone.' USING ERRCODE='22023'; END IF;
  IF (p_plan->>'startDate')::date < (now() AT TIME ZONE (p_plan->>'timezone'))::date OR (p_plan->>'startDate')::date > (now() AT TIME ZONE (p_plan->>'timezone'))::date+30 THEN RAISE EXCEPTION 'Choose a start date from today through 30 days ahead.' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_plan->'sessions')<>'array' OR jsonb_array_length(p_plan->'sessions') NOT BETWEEN 4 AND 20 THEN RAISE EXCEPTION 'A complete four-week plan is required.' USING ERRCODE='22023'; END IF;
  UPDATE public.coaching_plans SET status='archived' WHERE id=current_id;
  INSERT INTO public.coaching_plans(id,user_id,name,profile,start_date,timezone,explanation)
    VALUES(plan_id,p_user_id,p_plan->>'name',p_plan->'profile',(p_plan->>'startDate')::date,p_plan->>'timezone',p_plan->'explanation');
  FOR day IN SELECT value FROM jsonb_array_elements(p_plan->'sessions') LOOP
    existing_key := (day->>'day'); template := (templates->>existing_key)::uuid;
    IF template IS NULL THEN
      INSERT INTO public.workout_templates(user_id,name,description) VALUES(p_user_id,left(day->>'name',100),'Starter prescription from your FitSync coaching plan. Start from Coach for that day’s accepted changes.') RETURNING id INTO template;
      templates := jsonb_set(templates,ARRAY[existing_key],to_jsonb(template)); position := 0;
      FOR exercise IN SELECT value FROM jsonb_array_elements(day->'prescription'->'exercises') LOOP
        IF NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(exercise->>'exerciseId')::uuid AND status='published') THEN RAISE EXCEPTION 'A planned exercise is no longer published. Generate the plan again.' USING ERRCODE='23514'; END IF;
        INSERT INTO public.workout_template_exercises(template_id,exercise_id,position,notes,rest_seconds)
          VALUES(template,(exercise->>'exerciseId')::uuid,position,exercise->>'reason',(exercise->>'restSeconds')::integer) RETURNING id INTO exercise_item;
        INSERT INTO public.workout_template_sets(template_exercise_id,position,set_type,target_reps,target_weight,target_duration_seconds)
          SELECT exercise_item,n,'normal',(exercise->>'repsMax')::integer,(exercise->>'weightKg')::numeric,(exercise->>'durationSeconds')::integer FROM generate_series(0,(exercise->>'sets')::integer-1) n;
        position := position+1;
      END LOOP;
    END IF;
    INSERT INTO public.coaching_days(plan_id,sequence,week_number,day_number,scheduled_date,name,prescription,template_id)
      VALUES(plan_id,sequence,(day->>'week')::integer,(day->>'day')::integer,(day->>'date')::date,day->>'name',day->'prescription',template);
    sequence := sequence+1;
  END LOOP;
  INSERT INTO public.coaching_commands(user_id,request_id,action,request_data,result_id) VALUES(p_user_id,p_request_id,'create',p_request_data,plan_id);
  RETURN plan_id;
END $$;

CREATE OR REPLACE FUNCTION public.change_fitsync_coaching_day(p_user_id uuid,p_day_id uuid,p_request_id uuid,p_action text,p_request_data jsonb,p_prescription jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE old public.coaching_commands%ROWTYPE; day public.coaching_days%ROWTYPE; plan public.coaching_plans%ROWTYPE; shift integer; exercise jsonb;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  SELECT * INTO old FROM public.coaching_commands WHERE user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF old.action<>p_action OR old.request_data<>p_request_data THEN RAISE EXCEPTION 'This request key was already used for a different change.' USING ERRCODE='40001'; END IF;
    RETURN old.result_id;
  END IF;
  SELECT d.* INTO day FROM public.coaching_days d JOIN public.coaching_plans p ON p.id=d.plan_id WHERE d.id=p_day_id AND p.user_id=p_user_id FOR UPDATE OF d;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.' USING ERRCODE='P0002'; END IF;
  SELECT * INTO plan FROM public.coaching_plans WHERE id=day.plan_id;
  IF plan.status<>'active' THEN RAISE EXCEPTION 'This plan was replaced. Refresh your plan.' USING ERRCODE='40001'; END IF;
  IF day.revision<>(p_request_data->>'expectedRevision')::integer THEN RAISE EXCEPTION 'This session changed. Refresh before applying another change.' USING ERRCODE='40001'; END IF;
  IF EXISTS(SELECT 1 FROM public.coaching_workouts c JOIN public.workout_sessions w ON w.id=c.workout_id WHERE c.day_id=day.id AND w.status IN ('active','completed')) THEN RAISE EXCEPTION 'Only an unstarted session can be changed.' USING ERRCODE='23514'; END IF;
  IF p_action='reschedule' THEN
    IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=p_user_id AND status='active') THEN RAISE EXCEPTION 'Finish or discard the current workout before moving the schedule.' USING ERRCODE='23514'; END IF;
    IF (p_request_data->>'date')::date < (now() AT TIME ZONE plan.timezone)::date OR (p_request_data->>'date')::date > (now() AT TIME ZONE plan.timezone)::date+90 THEN RAISE EXCEPTION 'Choose a date from today through 90 days ahead.' USING ERRCODE='22023'; END IF;
    shift := (p_request_data->>'date')::date-day.scheduled_date;
    UPDATE public.coaching_days d SET scheduled_date=d.scheduled_date+shift, revision=d.revision+1
      WHERE d.plan_id=plan.id AND d.sequence>=day.sequence AND NOT EXISTS(SELECT 1 FROM public.coaching_workouts c JOIN public.workout_sessions w ON w.id=c.workout_id WHERE c.day_id=d.id AND w.status IN ('active','completed'));
  ELSIF p_action IN ('adapt','progression') THEN
    IF jsonb_typeof(p_prescription->'exercises')<>'array' OR jsonb_array_length(p_prescription->'exercises') NOT BETWEEN 2 AND 12 THEN RAISE EXCEPTION 'A complete session prescription is required.' USING ERRCODE='22023'; END IF;
    FOR exercise IN SELECT value FROM jsonb_array_elements(p_prescription->'exercises') LOOP
      IF NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(exercise->>'exerciseId')::uuid AND status='published') THEN RAISE EXCEPTION 'An exercise is no longer published. Refresh before applying.' USING ERRCODE='23514'; END IF;
    END LOOP;
    UPDATE public.coaching_days SET prescription=p_prescription,revision=revision+1 WHERE id=day.id;
  ELSE RAISE EXCEPTION 'Invalid coaching change.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.coaching_commands(user_id,request_id,action,request_data,result_id) VALUES(p_user_id,p_request_id,p_action,p_request_data,plan.id);
  RETURN plan.id;
END $$;

CREATE OR REPLACE FUNCTION public.start_fitsync_coaching_day(p_user_id uuid,p_day_id uuid,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE old public.coaching_commands%ROWTYPE; day public.coaching_days%ROWTYPE; workout uuid; active_id uuid; exercise jsonb; exercise_item uuid; source public.exercises%ROWTYPE; position integer := 0;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  SELECT * INTO old FROM public.coaching_commands WHERE user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF old.action<>'start' OR old.request_data<>jsonb_build_object('dayId',p_day_id) THEN RAISE EXCEPTION 'This request key was already used for a different change.' USING ERRCODE='40001'; END IF;
    RETURN old.result_id;
  END IF;
  SELECT d.* INTO day FROM public.coaching_days d JOIN public.coaching_plans p ON p.id=d.plan_id WHERE d.id=p_day_id AND p.user_id=p_user_id AND p.status='active' FOR UPDATE OF d;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found in your current plan.' USING ERRCODE='P0002'; END IF;
  SELECT w.id INTO workout FROM public.coaching_workouts c JOIN public.workout_sessions w ON w.id=c.workout_id WHERE c.day_id=day.id AND w.status IN ('active','completed') ORDER BY w.started_at DESC LIMIT 1;
  IF workout IS NOT NULL THEN
    -- Another request can safely resume this day, including a delayed response after completion.
    INSERT INTO public.coaching_commands(user_id,request_id,action,request_data,result_id) VALUES(p_user_id,p_request_id,'start',jsonb_build_object('dayId',p_day_id),workout);
    RETURN workout;
  END IF;
  SELECT id INTO active_id FROM public.workout_sessions WHERE user_id=p_user_id AND status='active';
  IF active_id IS NOT NULL THEN RAISE EXCEPTION 'Resume, finish or discard your active workout before starting another session.' USING ERRCODE='23514'; END IF;
  INSERT INTO public.workout_sessions(user_id,template_id,name,notes) VALUES(p_user_id,day.template_id,day.name,'Coaching prescription accepted before starting. Adjust loads and repetitions to your actual performance.') RETURNING id INTO workout;
  FOR exercise IN SELECT value FROM jsonb_array_elements(day.prescription->'exercises') LOOP
    SELECT * INTO source FROM public.exercises WHERE id=(exercise->>'exerciseId')::uuid AND status='published';
    IF NOT FOUND THEN RAISE EXCEPTION 'A planned exercise is no longer published. Adapt your session or choose another routine.' USING ERRCODE='23514'; END IF;
    INSERT INTO public.workout_session_exercises(session_id,exercise_id,exercise_name,tracking_type,position,notes,rest_seconds)
      VALUES(workout,source.id,source.name,source.tracking_type,position,exercise->>'reason',(exercise->>'restSeconds')::integer) RETURNING id INTO exercise_item;
    INSERT INTO public.workout_logged_sets(session_exercise_id,position,set_type,weight_kg,reps,duration_seconds)
      SELECT exercise_item,n,'normal',(exercise->>'weightKg')::numeric,(exercise->>'repsMax')::integer,(exercise->>'durationSeconds')::integer FROM generate_series(0,(exercise->>'sets')::integer-1) n;
    position := position+1;
  END LOOP;
  INSERT INTO public.coaching_workouts(day_id,workout_id) VALUES(day.id,workout);
  INSERT INTO public.coaching_commands(user_id,request_id,action,request_data,result_id) VALUES(p_user_id,p_request_id,'start',jsonb_build_object('dayId',p_day_id),workout);
  RETURN workout;
END $$;

CREATE OR REPLACE FUNCTION public.guard_fitsync_coaching_completion() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status<>'completed' AND EXISTS(SELECT 1 FROM public.coaching_workouts WHERE workout_id=NEW.id)
    AND NOT EXISTS(SELECT 1 FROM public.workout_session_exercises e JOIN public.workout_logged_sets s ON s.session_exercise_id=e.id WHERE e.session_id=NEW.id AND s.completed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Log at least one completed set before finishing this coaching session.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS coaching_completed_log ON public.workout_sessions;
CREATE TRIGGER coaching_completed_log BEFORE UPDATE OF status ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_fitsync_coaching_completion();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['coaching_plans','coaching_days','coaching_workouts','coaching_commands'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.create_fitsync_coaching_plan(uuid,uuid,jsonb,jsonb), public.change_fitsync_coaching_day(uuid,uuid,uuid,text,jsonb,jsonb), public.start_fitsync_coaching_day(uuid,uuid,uuid), public.guard_fitsync_coaching_completion() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_fitsync_coaching_plan(uuid,uuid,jsonb,jsonb), public.change_fitsync_coaching_day(uuid,uuid,uuid,text,jsonb,jsonb), public.start_fitsync_coaching_day(uuid,uuid,uuid) TO service_role;
COMMIT;
