-- Disposable fixtures only. Also runnable after the real migrations in a fresh local DB.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
DO $$
DECLARE u uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); ex uuid:=gen_random_uuid(); ex2 uuid:=gen_random_uuid();
  request uuid:=gen_random_uuid(); start_request uuid:=gen_random_uuid(); retry_request uuid:=gen_random_uuid();
  first_plan uuid; second_plan uuid; first_day uuid; second_day uuid; workout uuid; retried_workout uuid;
  data jsonb; input jsonb; prescription jsonb; days jsonb; before_date date; invitation uuid; snapshot jsonb;
BEGIN
  INSERT INTO public.app_users(id) VALUES(u),(stranger);
  INSERT INTO public.exercises(id,name,tracking_type,status) VALUES(ex,'Fixture squat','reps_weight','published'),(ex2,'Fixture press','reps_weight','published');
  prescription:=jsonb_build_object('minutes',30,'equipment','gym','effort','normal','explanation','[]'::jsonb,'exercises',jsonb_build_array(
    jsonb_build_object('exerciseId',ex,'name','Fixture squat','pattern','squat','trackingType','reps_weight','sets',2,'repsMin',8,'repsMax',12,'weightKg',NULL,'durationSeconds',NULL,'restSeconds',90,'reason','Choose a manageable load'),
    jsonb_build_object('exerciseId',ex2,'name','Fixture press','pattern','push','trackingType','reps_weight','sets',2,'repsMin',8,'repsMax',12,'weightKg',NULL,'durationSeconds',NULL,'restSeconds',90,'reason','Choose a manageable load')));
  SELECT jsonb_agg(jsonb_build_object('week',n,'day',1,'date',current_date+(n-1)*7,'name','Full body A','prescription',prescription) ORDER BY n) INTO days FROM generate_series(1,4) n;
  input:=jsonb_build_object('startDate',current_date,'timezone','UTC');
  data:=jsonb_build_object('name','Personal plan','startDate',current_date,'timezone','UTC','profile',jsonb_build_object('goal','strength','experience','beginner','equipment','gym','trainingDays',1,'minutesPerWorkout',30),'explanation','[]'::jsonb,'sessions',days);
  first_plan:=public.create_fitsync_coaching_plan(u,request,input,data);
  ASSERT (SELECT count(*) FROM public.coaching_days WHERE plan_id=first_plan)=4,'Generate all four weeks';
  ASSERT (SELECT count(DISTINCT template_id) FROM public.coaching_days WHERE plan_id=first_plan)=1,'Reuse baseline routine across weeks';
  ASSERT public.create_fitsync_coaching_plan(u,request,input,data)=first_plan,'Create retry returns original plan';
  ASSERT (SELECT count(*) FROM public.coaching_plans WHERE user_id=u)=1,'Retry never creates a duplicate plan';
  BEGIN
    PERFORM public.create_fitsync_coaching_plan(u,request,input||jsonb_build_object('startDate',current_date+1),data);
    RAISE EXCEPTION 'Expected conflicting request replay to fail';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  SELECT id INTO first_day FROM public.coaching_days WHERE plan_id=first_plan ORDER BY sequence LIMIT 1;
  SELECT id,scheduled_date INTO second_day,before_date FROM public.coaching_days WHERE plan_id=first_plan ORDER BY sequence LIMIT 1 OFFSET 1;
  BEGIN
    PERFORM public.start_fitsync_coaching_day(stranger,first_day,gen_random_uuid());
    RAISE EXCEPTION 'Expected foreign session to fail';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  workout:=public.start_fitsync_coaching_day(u,first_day,start_request);
  ASSERT public.start_fitsync_coaching_day(u,first_day,start_request)=workout,'Start retry is idempotent';
  ASSERT public.start_fitsync_coaching_day(u,first_day,gen_random_uuid())=workout,'Another request resumes same day';
  ASSERT (SELECT count(*) FROM public.workout_session_exercises WHERE session_id=workout)=2,'Normal logger receives real exercises';
  ASSERT (SELECT count(*) FROM public.workout_logged_sets s JOIN public.workout_session_exercises e ON e.id=s.session_exercise_id WHERE e.session_id=workout)=4,'Normal logger receives real set prescriptions';
  BEGIN
    UPDATE public.workout_sessions SET status='completed',finished_at=now() WHERE id=workout;
    RAISE EXCEPTION 'Expected an empty completion to fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    PERFORM public.change_fitsync_coaching_day(u,first_day,gen_random_uuid(),'adapt',jsonb_build_object('dayId',first_day,'expectedRevision',0,'minutes',15),prescription);
    RAISE EXCEPTION 'Expected adapting started session to fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.workout_logged_sets SET completed_at=now(),weight_kg=50,reps=10 WHERE id=(SELECT s.id FROM public.workout_logged_sets s JOIN public.workout_session_exercises e ON e.id=s.session_exercise_id WHERE e.session_id=workout LIMIT 1);
  UPDATE public.workout_sessions SET status='completed',finished_at=now(),elapsed_seconds=600 WHERE id=workout;
  ASSERT EXISTS(SELECT 1 FROM public.coaching_workouts c JOIN public.workout_sessions w ON w.id=c.workout_id WHERE c.day_id=first_day AND w.status='completed'),'Completion derives from the real logged workout';
  workout:=public.start_fitsync_coaching_day(u,second_day,gen_random_uuid());
  UPDATE public.workout_sessions SET status='discarded',finished_at=now() WHERE id=workout;
  request:=gen_random_uuid(); input:=jsonb_build_object('dayId',second_day,'expectedRevision',0,'date',current_date+10);
  ASSERT public.change_fitsync_coaching_day(u,second_day,request,'reschedule',input)=first_plan,'Reschedule retains plan';
  ASSERT (SELECT scheduled_date FROM public.coaching_days WHERE id=second_day)=current_date+10,'Move chosen missed/future day';
  ASSERT (SELECT max(scheduled_date) FROM public.coaching_days WHERE plan_id=first_plan)=current_date+24,'Preserve later-session spacing';
  ASSERT (SELECT scheduled_date FROM public.coaching_days WHERE id=first_day)=current_date,'Never move completed history';
  PERFORM public.change_fitsync_coaching_day(u,second_day,request,'reschedule',input);
  ASSERT (SELECT revision FROM public.coaching_days WHERE id=second_day)=1,'A replay does not shift again';
  BEGIN
    PERFORM public.change_fitsync_coaching_day(u,second_day,gen_random_uuid(),'adapt',jsonb_build_object('dayId',second_day,'expectedRevision',0),prescription);
    RAISE EXCEPTION 'Expected stale revision to fail';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  request:=gen_random_uuid(); input:=jsonb_build_object('dayId',second_day,'expectedRevision',1,'minutes',15);
  PERFORM public.change_fitsync_coaching_day(u,second_day,request,'adapt',input,prescription||jsonb_build_object('minutes',15));
  ASSERT (SELECT revision FROM public.coaching_days WHERE id=second_day)=2,'Accepted changes increment revision';
  retried_workout:=public.start_fitsync_coaching_day(u,second_day,retry_request);
  ASSERT retried_workout<>workout,'A discarded session can be retried with a new request';
  UPDATE public.workout_sessions SET status='discarded',finished_at=now() WHERE id=retried_workout;
  input:=jsonb_build_object('startDate',current_date,'timezone','UTC','replacePlanId',first_plan);
  second_plan:=public.create_fitsync_coaching_plan(u,gen_random_uuid(),input,data);
  ASSERT (SELECT status FROM public.coaching_plans WHERE id=first_plan)='archived','Replacing preserves old plan';
  ASSERT (SELECT count(*) FROM public.coaching_plans WHERE user_id=u AND status='active')=1,'Only one active plan';
  ASSERT EXISTS(SELECT 1 FROM public.coaching_workouts c JOIN public.coaching_days d ON d.id=c.day_id JOIN public.workout_sessions w ON w.id=c.workout_id WHERE d.plan_id=first_plan AND w.status='completed'),'Replacing preserves actual completed logs';
  snapshot:=public.billing_store_snapshot(u,'{"tier":"free","active":false}'::jsonb,100);
  snapshot:=public.billing_store_snapshot(u,'{"tier":"pro","active":true}'::jsonb,99);
  ASSERT snapshot->'entitlement'->>'tier'='free','Older entitlement snapshots cannot overwrite newer canonical state';
  INSERT INTO public.wellness_commitments(user_id,week,target,habit) VALUES(u,current_date,3,'walk');
  PERFORM public.fitsync_commitment_checkin(u,current_date,current_date,true);
  PERFORM public.fitsync_commitment_checkin(u,current_date,current_date,true);
  ASSERT (SELECT cardinality(completed_dates) FROM public.wellness_commitments WHERE user_id=u)=1,'Repeated check-in does not add another day';
  PERFORM public.fitsync_commitment_checkin(u,current_date,current_date+1,true);
  ASSERT (SELECT cardinality(completed_dates) FROM public.wellness_commitments WHERE user_id=u)=2,'Separate days are preserved';
  PERFORM public.fitsync_commitment_checkin(u,current_date,current_date,false);
  ASSERT (SELECT completed_dates FROM public.wellness_commitments WHERE user_id=u)=ARRAY[current_date+1],'Clearing one day preserves another check-in';
  BEGIN
    PERFORM public.fitsync_commitment_checkin(stranger,current_date,current_date,true);
    RAISE EXCEPTION 'Expected a foreign commitment check-in to fail' USING ERRCODE='XX000';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN
    PERFORM public.fitsync_commitment_checkin(u,current_date,current_date+7,true);
    RAISE EXCEPTION 'Expected outside-week check-in to fail' USING ERRCODE='XX000';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  INSERT INTO public.accountability_partners(owner_id,token_hash,expires_at) VALUES(u,'fixture-hash',now()+interval '1 hour') RETURNING id INTO invitation;
  BEGIN
    PERFORM public.fitsync_join_partner(u,'fixture-hash');
    RAISE EXCEPTION 'Expected joining own invite to fail' USING ERRCODE='XX000';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  ASSERT (SELECT partner_id IS NULL FROM public.accountability_partners WHERE id=invitation),'Cannot join yourself';
  ASSERT public.fitsync_join_partner(stranger,'fixture-hash')=invitation,'Explicit invitation can join a partner';
  ASSERT (SELECT token_hash IS NULL FROM public.accountability_partners WHERE id=invitation),'Invitation is consumed';
  BEGIN
    PERFORM public.fitsync_join_partner(stranger,'fixture-hash');
    RAISE EXCEPTION 'Expected consumed invitation to fail' USING ERRCODE='XX000';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  DELETE FROM public.app_users WHERE id=u;
  ASSERT NOT EXISTS(SELECT 1 FROM public.coaching_plans WHERE user_id=u),'Account deletion cascades coaching records';
END $$;
DO $$ BEGIN
  ASSERT NOT has_function_privilege('authenticated','public.start_fitsync_coaching_day(uuid,uuid,uuid)','EXECUTE'),'Client role cannot impersonate another account';
  ASSERT NOT has_table_privilege('anon','public.coaching_plans','SELECT'),'Plans are private';
  ASSERT NOT has_table_privilege('authenticated','public.billing_entitlements','UPDATE'),'Entitlements are server verified';
  ASSERT NOT has_table_privilege('authenticated','public.accountability_partners','SELECT'),'Partners are private';
  ASSERT has_function_privilege('service_role','public.change_fitsync_coaching_day(uuid,uuid,uuid,text,jsonb,jsonb)','EXECUTE'),'API can execute plan mutations';
  ASSERT has_table_privilege('service_role','public.wellness_commitments','UPDATE'),'API can update wellness check-ins';
END $$;
ROLLBACK;
