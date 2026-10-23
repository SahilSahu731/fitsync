BEGIN;

CREATE TABLE public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.training_programs(id) ON DELETE SET NULL,
  saved_program_id uuid REFERENCES public.user_saved_programs(id) ON DELETE SET NULL,
  program_name text NOT NULL,
  cover_url text,
  duration_weeks integer NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  days_per_week integer NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  weekly_plan jsonb NOT NULL,
  start_date date NOT NULL,
  timezone text NOT NULL,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_hour integer NOT NULL DEFAULT 18 CHECK (reminder_hour BETWEEN 0 AND 23),
  reminder_minute integer NOT NULL DEFAULT 0 CHECK (reminder_minute BETWEEN 0 AND 59),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','switched','stopped','completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE UNIQUE INDEX one_followed_program_per_user ON public.program_enrollments(user_id) WHERE status='active';
CREATE INDEX program_enrollment_history ON public.program_enrollments(user_id,started_at DESC);

CREATE TABLE public.program_workout_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  routine_name text NOT NULL,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  scheduled_date date NOT NULL,
  UNIQUE(enrollment_id,week_number,day_number)
);
ALTER TABLE public.workout_sessions ADD COLUMN program_slot_id uuid REFERENCES public.program_workout_slots(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX one_logged_workout_per_program_slot ON public.workout_sessions(program_slot_id)
 WHERE program_slot_id IS NOT NULL AND status IN ('active','completed');
CREATE INDEX workout_program_slot ON public.workout_sessions(program_slot_id) WHERE program_slot_id IS NOT NULL;
CREATE TABLE public.program_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type IN ('started','switched','stopped','completed','reminders_updated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE FUNCTION public.follow_fitsync_program(p_user_id uuid,p_program_id uuid,p_start_date date,p_timezone text,
 p_reminder_enabled boolean,p_hour integer,p_minute integer,p_expected_active_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
  program public.training_programs%ROWTYPE;
  previous public.program_enrollments%ROWTYPE;
  saved_id uuid; enrollment_id uuid := gen_random_uuid(); template uuid; exercise_item uuid;
  routine record; exercise record; day record; week integer; plan jsonb;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO previous FROM public.program_enrollments WHERE user_id=p_user_id AND status='active';
  IF previous.program_id=p_program_id THEN RETURN previous.id; END IF;
  IF previous.id IS DISTINCT FROM p_expected_active_id THEN
    RAISE EXCEPTION 'Your active program changed. Refresh before switching.' USING ERRCODE='40001';
  END IF;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=p_user_id AND status='active') THEN
    RAISE EXCEPTION 'Finish or discard your current workout before changing programs.' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN
    RAISE EXCEPTION 'Invalid timezone' USING ERRCODE='22023';
  END IF;
  IF p_start_date < (now() AT TIME ZONE p_timezone)::date OR p_start_date > (now() AT TIME ZONE p_timezone)::date+30 THEN
    RAISE EXCEPTION 'Choose a start date between today and 30 days from now.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO program FROM public.training_programs WHERE id=p_program_id AND published;
  IF NOT FOUND THEN RAISE EXCEPTION 'Program is unavailable' USING ERRCODE='P0002'; END IF;
  IF (SELECT count(*) FROM public.training_program_days WHERE program_id=p_program_id AND routine_id IS NOT NULL) <> program.days_per_week THEN
    RAISE EXCEPTION 'This program needs a complete weekly schedule before it can be followed.' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.training_program_days d JOIN public.training_routines r ON r.id=d.routine_id
    WHERE d.program_id=p_program_id AND (NOT r.published OR NOT EXISTS(SELECT 1 FROM public.training_routine_exercises e WHERE e.routine_id=r.id)))
    OR EXISTS(SELECT 1 FROM public.training_program_days d JOIN public.training_routine_exercises re ON re.routine_id=d.routine_id
      JOIN public.exercises e ON e.id=re.exercise_id WHERE d.program_id=p_program_id AND e.status<>'published') THEN
    RAISE EXCEPTION 'Some program exercises or routines are unavailable.' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.user_saved_programs(user_id,program_id) VALUES(p_user_id,p_program_id)
    ON CONFLICT(user_id,program_id) DO UPDATE SET program_id=excluded.program_id RETURNING id INTO saved_id;
  FOR routine IN SELECT DISTINCT r.* FROM public.training_program_days d JOIN public.training_routines r ON r.id=d.routine_id WHERE d.program_id=p_program_id LOOP
    SELECT l.template_id INTO template FROM public.user_saved_program_routines l JOIN public.workout_templates t ON t.id=l.template_id
      WHERE l.saved_program_id=saved_id AND l.source_routine_id=routine.id AND t.user_id=p_user_id;
    IF template IS NULL THEN
      INSERT INTO public.workout_templates(user_id,name,description) VALUES(p_user_id,routine.name,routine.description) RETURNING id INTO template;
      FOR exercise IN SELECT re.*,e.tracking_type FROM public.training_routine_exercises re JOIN public.exercises e ON e.id=re.exercise_id WHERE re.routine_id=routine.id ORDER BY re.position LOOP
        INSERT INTO public.workout_template_exercises(template_id,exercise_id,position,notes,rest_seconds)
          VALUES(template,exercise.exercise_id,exercise.position,exercise.notes,exercise.rest_seconds) RETURNING id INTO exercise_item;
        INSERT INTO public.workout_template_sets(template_exercise_id,position,set_type,target_reps,target_duration_seconds)
          SELECT exercise_item,n,exercise.set_type,
            CASE WHEN exercise.tracking_type IN ('duration','distance_duration') THEN NULL ELSE exercise.max_reps END,
            CASE WHEN exercise.tracking_type IN ('duration','distance_duration') THEN exercise.max_reps ELSE NULL END
          FROM generate_series(0,exercise.sets-1) n;
      END LOOP;
      INSERT INTO public.user_saved_program_routines(saved_program_id,source_routine_id,template_id) VALUES(saved_id,routine.id,template);
    END IF;
  END LOOP;
  SELECT jsonb_agg(jsonb_build_object('day_number',n,'label',coalesce(d.label,'Rest day'),'routine_name',r.name,'rest',d.routine_id IS NULL) ORDER BY n)
    INTO plan FROM generate_series(1,7) n LEFT JOIN public.training_program_days d ON d.program_id=p_program_id AND d.day_number=n
    LEFT JOIN public.training_routines r ON r.id=d.routine_id;
  IF previous.id IS NOT NULL THEN
    UPDATE public.program_enrollments SET status='switched',ended_at=now() WHERE id=previous.id;
    INSERT INTO public.program_events(enrollment_id,event_type,details) VALUES(previous.id,'switched',jsonb_build_object('next_enrollment_id',enrollment_id,'next_program_name',program.name));
  END IF;
  INSERT INTO public.program_enrollments(id,user_id,program_id,saved_program_id,program_name,cover_url,duration_weeks,days_per_week,weekly_plan,start_date,timezone,reminder_enabled,reminder_hour,reminder_minute)
    VALUES(enrollment_id,p_user_id,p_program_id,saved_id,program.name,program.cover_url,program.duration_weeks,program.days_per_week,plan,p_start_date,p_timezone,p_reminder_enabled,p_hour,p_minute);
  INSERT INTO public.program_workout_slots(enrollment_id,template_id,routine_name,week_number,day_number,scheduled_date)
    SELECT enrollment_id,l.template_id,r.name,w,d.day_number,p_start_date+(w-1)*7+d.day_number-1
    FROM generate_series(1,program.duration_weeks) w JOIN public.training_program_days d ON d.program_id=p_program_id
    JOIN public.training_routines r ON r.id=d.routine_id
    JOIN public.user_saved_program_routines l ON l.saved_program_id=saved_id AND l.source_routine_id=r.id;
  INSERT INTO public.program_events(enrollment_id,event_type) VALUES(enrollment_id,'started');
  UPDATE public.user_settings SET workout_reminders=p_reminder_enabled WHERE user_id=p_user_id;
  RETURN enrollment_id;
END $$;

CREATE FUNCTION public.stop_fitsync_program(p_user_id uuid,p_enrollment_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE user_id=p_user_id AND status='active') THEN
    RAISE EXCEPTION 'Finish or discard your current workout before stopping your program.' USING ERRCODE='23514';
  END IF;
  UPDATE public.program_enrollments SET status='stopped',ended_at=now() WHERE id=p_enrollment_id AND user_id=p_user_id AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active program not found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.program_events(enrollment_id,event_type) VALUES(p_enrollment_id,'stopped');
END $$;

CREATE FUNCTION public.update_fitsync_program_reminders(p_user_id uuid,p_enrollment_id uuid,p_timezone text,p_enabled boolean,p_hour integer,p_minute integer)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=p_user_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN
    RAISE EXCEPTION 'Invalid timezone' USING ERRCODE='22023';
  END IF;
  UPDATE public.program_enrollments SET timezone=p_timezone,reminder_enabled=p_enabled,reminder_hour=p_hour,reminder_minute=p_minute
    WHERE id=p_enrollment_id AND user_id=p_user_id AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active program not found' USING ERRCODE='P0002'; END IF;
  UPDATE public.user_settings SET workout_reminders=p_enabled WHERE user_id=p_user_id;
  INSERT INTO public.program_events(enrollment_id,event_type,details) VALUES(p_enrollment_id,'reminders_updated',
    jsonb_build_object('enabled',p_enabled,'hour',p_hour,'minute',p_minute,'timezone',p_timezone));
END $$;

CREATE FUNCTION public.guard_fitsync_program_workout() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE enrollment public.program_enrollments%ROWTYPE; slot public.program_workout_slots%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.app_users WHERE id=NEW.user_id FOR UPDATE;
  IF NEW.program_slot_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO slot FROM public.program_workout_slots WHERE id=NEW.program_slot_id;
  SELECT * INTO enrollment FROM public.program_enrollments WHERE id=slot.enrollment_id;
  IF enrollment.user_id IS DISTINCT FROM NEW.user_id OR enrollment.status IS DISTINCT FROM 'active' OR NEW.template_id IS DISTINCT FROM slot.template_id THEN
    RAISE EXCEPTION 'This program session is no longer available.' USING ERRCODE='23514';
  END IF;
  IF NEW.status='completed' AND NOT EXISTS(SELECT 1 FROM public.workout_session_exercises e JOIN public.workout_logged_sets s ON s.session_exercise_id=e.id WHERE e.session_id=NEW.id AND s.completed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Log at least one set before completing a program workout.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_program_workout BEFORE INSERT OR UPDATE OF status ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_fitsync_program_workout();

CREATE FUNCTION public.complete_fitsync_program() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_enrollment_id uuid;
BEGIN
  IF NEW.program_slot_id IS NULL OR NEW.status<>'completed' THEN RETURN NEW; END IF;
  SELECT s.enrollment_id INTO v_enrollment_id FROM public.program_workout_slots s WHERE s.id=NEW.program_slot_id;
  IF NOT EXISTS(SELECT 1 FROM public.program_workout_slots s WHERE s.enrollment_id=v_enrollment_id AND NOT EXISTS(SELECT 1 FROM public.workout_sessions w WHERE w.program_slot_id=s.id AND w.status='completed')) THEN
    UPDATE public.program_enrollments SET status='completed',ended_at=now() WHERE id=v_enrollment_id AND status='active';
    IF FOUND THEN INSERT INTO public.program_events(enrollment_id,event_type) VALUES(v_enrollment_id,'completed'); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER complete_program AFTER UPDATE OF status ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.complete_fitsync_program();

CREATE FUNCTION public.guard_followed_template_delete() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE id=OLD.user_id) AND EXISTS(SELECT 1 FROM public.program_workout_slots s JOIN public.program_enrollments e ON e.id=s.enrollment_id WHERE s.template_id=OLD.id AND e.status='active') THEN
    RAISE EXCEPTION 'Stop following this program before deleting its routines.' USING ERRCODE='23514';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER protect_followed_routine BEFORE DELETE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.guard_followed_template_delete();

CREATE TABLE public.program_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.auth_sessions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE, enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.program_reminder_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES public.program_enrollments(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.program_push_devices(id) ON DELETE CASCADE,
  local_date date NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','sent','failed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), attempted_at timestamptz, ticket_id text, error_code text,
  UNIQUE(device_id,local_date)
);
CREATE INDEX program_pending_reminders ON public.program_reminder_jobs(created_at) WHERE status='pending';
CREATE FUNCTION public.queue_fitsync_program_reminders(p_now timestamptz DEFAULT now()) RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE queued integer;
BEGIN
  INSERT INTO public.program_reminder_jobs(enrollment_id,device_id,local_date)
    SELECT e.id,d.id,(p_now AT TIME ZONE e.timezone)::date
    FROM public.program_enrollments e JOIN public.program_push_devices d ON d.user_id=e.user_id AND d.enabled
    WHERE e.status='active' AND e.reminder_enabled
    AND EXISTS(SELECT 1 FROM public.auth_sessions auth WHERE auth.id=d.session_id AND auth.user_id=e.user_id AND auth.revoked_at IS NULL AND auth.expires_at>p_now)
    AND EXISTS(SELECT 1 FROM public.user_settings us WHERE us.user_id=e.user_id AND us.workout_reminders)
    AND (p_now AT TIME ZONE e.timezone)::date>=e.start_date
    AND (p_now AT TIME ZONE e.timezone)::time>=make_time(e.reminder_hour,e.reminder_minute,0)
    AND p_now-(((p_now AT TIME ZONE e.timezone)::date+make_time(e.reminder_hour,e.reminder_minute,0)) AT TIME ZONE e.timezone)<interval '6 hours'
    AND NOT EXISTS(SELECT 1 FROM public.workout_sessions w JOIN public.program_workout_slots s ON s.id=w.program_slot_id WHERE s.enrollment_id=e.id AND w.status='completed' AND (w.finished_at AT TIME ZONE e.timezone)::date=(p_now AT TIME ZONE e.timezone)::date)
    ON CONFLICT(device_id,local_date) DO NOTHING;
  GET DIAGNOSTICS queued=ROW_COUNT;
  RETURN queued;
END $$;
CREATE FUNCTION public.claim_fitsync_program_reminders(p_limit integer DEFAULT 50) RETURNS SETOF public.program_reminder_jobs LANGUAGE sql SET search_path='' AS $$
  UPDATE public.program_reminder_jobs SET status='sending',attempted_at=now()
  WHERE id IN(SELECT id FROM public.program_reminder_jobs WHERE status='pending' ORDER BY created_at LIMIT least(greatest(p_limit,1),100) FOR UPDATE SKIP LOCKED) RETURNING *;
$$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['program_enrollments','program_workout_slots','program_events','program_push_devices','program_reminder_jobs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.follow_fitsync_program(uuid,uuid,date,text,boolean,integer,integer,uuid), public.stop_fitsync_program(uuid,uuid), public.update_fitsync_program_reminders(uuid,uuid,text,boolean,integer,integer), public.queue_fitsync_program_reminders(timestamptz), public.claim_fitsync_program_reminders(integer), public.guard_fitsync_program_workout(), public.complete_fitsync_program(), public.guard_followed_template_delete() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.follow_fitsync_program(uuid,uuid,date,text,boolean,integer,integer,uuid), public.stop_fitsync_program(uuid,uuid), public.update_fitsync_program_reminders(uuid,uuid,text,boolean,integer,integer), public.queue_fitsync_program_reminders(timestamptz), public.claim_fitsync_program_reminders(integer) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
