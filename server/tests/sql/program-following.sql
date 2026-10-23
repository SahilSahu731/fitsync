-- Run on a disposable PostgreSQL database after migrations 006, 007, 008.
-- Rolls back all fixtures. Intentionally uses no live user data.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
DO $$
DECLARE u uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); ex uuid:=gen_random_uuid();
 r uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid();
 e uuid; e2 uuid; slot uuid; template uuid; workout uuid; item uuid; device uuid; auth uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.app_users(id) VALUES(u),(stranger);
 INSERT INTO public.auth_sessions(id,user_id,refresh_hash,expires_at) VALUES(auth,u,auth::text,now()+interval '30 days');
 INSERT INTO public.user_settings(user_id,workout_reminders) VALUES(u,true);
 INSERT INTO public.exercises(id,name,tracking_type,status) VALUES(ex,'Fixture press','weight_reps','published');
 INSERT INTO public.training_routines(id,slug,name,description,level,goal,equipment,published)
 VALUES(r,r::text,'Fixture routine','','beginner','strength','gym',true);
 INSERT INTO public.training_routine_exercises(routine_id,exercise_id,position,sets,min_reps,max_reps) VALUES(r,ex,0,3,8,12);
 INSERT INTO public.training_programs(id,slug,name,description,level,goal,equipment,duration_weeks,days_per_week,published)
 VALUES(p,p::text,'Program A','','beginner','strength','gym',2,1,true),(p2,p2::text,'Program B','','beginner','strength','gym',1,1,true);
 INSERT INTO public.training_program_days(program_id,day_number,routine_id,label) VALUES(p,1,r,'Lift'),(p2,1,r,'Lift');
 e:=public.follow_fitsync_program(u,p,current_date,'UTC',true,0,0);
 ASSERT (SELECT count(*) FROM public.program_workout_slots WHERE enrollment_id=e)=2, 'Generate all weeks';
 ASSERT (SELECT jsonb_array_length(weekly_plan) FROM public.program_enrollments WHERE id=e)=7, 'Include rest days';
 ASSERT public.follow_fitsync_program(u,p,current_date,'UTC',true,0,0)=e, 'Following same program is idempotent';
 BEGIN
  PERFORM public.follow_fitsync_program(u,p2,current_date,'UTC',false,18,0);
  RAISE EXCEPTION 'Expected stale switch to fail';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 SELECT id,template_id INTO slot,template FROM public.program_workout_slots WHERE enrollment_id=e ORDER BY scheduled_date LIMIT 1;
 BEGIN
  DELETE FROM public.workout_templates WHERE id=template;
  RAISE EXCEPTION 'Expected active routine deletion to fail';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.workout_sessions(user_id,template_id,program_slot_id,name) VALUES(stranger,template,slot,'Foreign workout');
  RAISE EXCEPTION 'Expected foreign slot to fail';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO public.workout_sessions(user_id,template_id,program_slot_id,name) VALUES(u,template,slot,'Lift') RETURNING id INTO workout;
 BEGIN
  PERFORM public.follow_fitsync_program(u,p2,current_date,'UTC',false,18,0,e);
  RAISE EXCEPTION 'Expected switch during workout to fail';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.workout_sessions SET status='completed',finished_at=now() WHERE id=workout;
  RAISE EXCEPTION 'Expected empty completion to fail';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.workout_sessions SET status='discarded',finished_at=now() WHERE id=workout;
 INSERT INTO public.workout_sessions(user_id,template_id,program_slot_id,name) VALUES(u,template,slot,'Retry') RETURNING id INTO workout;
 INSERT INTO public.workout_session_exercises(session_id,exercise_id,exercise_name,tracking_type,position) VALUES(workout,ex,'Press','weight_reps',0) RETURNING id INTO item;
 INSERT INTO public.workout_logged_sets(session_exercise_id,position,weight_kg,reps,completed_at) VALUES(item,0,50,10,now());
 UPDATE public.workout_sessions SET status='completed',finished_at=now(),elapsed_seconds=600 WHERE id=workout;
 ASSERT (SELECT status FROM public.program_enrollments WHERE id=e)='active', 'One remaining workout';
 e2:=public.follow_fitsync_program(u,p2,current_date,'UTC',true,0,0,e);
 ASSERT (SELECT status FROM public.program_enrollments WHERE id=e)='switched', 'Keep old enrollment';
 ASSERT (SELECT count(*) FROM public.workout_sessions WHERE program_slot_id=slot AND status='completed')=1,'Keep old logs';
 ASSERT (SELECT count(*) FROM public.program_enrollments WHERE user_id=u AND status='active')=1,'Only one active program';
 INSERT INTO public.program_push_devices(user_id,session_id,token) VALUES(u,auth,'ExpoPushToken[fixture]') RETURNING id INTO device;
 ASSERT public.queue_fitsync_program_reminders(current_date+interval '1 hour')=1,'Queue due reminder';
 ASSERT public.queue_fitsync_program_reminders(current_date+interval '1 hour')=0,'Deduplicate reminder';
 ASSERT (SELECT count(*) FROM public.claim_fitsync_program_reminders())=1,'Claim once';
 ASSERT (SELECT count(*) FROM public.claim_fitsync_program_reminders())=0,'Do not claim twice';
 UPDATE public.user_settings SET workout_reminders=false WHERE user_id=u;
 ASSERT public.queue_fitsync_program_reminders(current_date+interval '1 day 1 hour')=0,'Respect global opt out';
 UPDATE public.user_settings SET workout_reminders=true WHERE user_id=u;
 ASSERT public.queue_fitsync_program_reminders(current_date+interval '1 day 8 hours')=0,'Do not send old reminders';
 UPDATE public.auth_sessions SET revoked_at=now() WHERE id=auth;
 ASSERT public.queue_fitsync_program_reminders(current_date+interval '1 day 1 hour')=0,'No reminders after sign out';
 UPDATE public.auth_sessions SET revoked_at=NULL WHERE id=auth;
 PERFORM public.update_fitsync_program_reminders(u,e2,'Asia/Kolkata',false,19,30);
 ASSERT (SELECT NOT workout_reminders FROM public.user_settings WHERE user_id=u),'Reminder updates sync global preference';
 ASSERT (SELECT timezone FROM public.program_enrollments WHERE id=e2)='Asia/Kolkata','Timezone is saved';
 PERFORM public.update_fitsync_program_reminders(u,e2,'UTC',true,0,0);
 SELECT id,template_id INTO slot,template FROM public.program_workout_slots WHERE enrollment_id=e2;
 INSERT INTO public.workout_sessions(user_id,template_id,program_slot_id,name) VALUES(u,template,slot,'Finish') RETURNING id INTO workout;
 INSERT INTO public.workout_session_exercises(session_id,exercise_id,exercise_name,tracking_type,position) VALUES(workout,ex,'Press','weight_reps',0) RETURNING id INTO item;
 INSERT INTO public.workout_logged_sets(session_exercise_id,position,weight_kg,reps,completed_at) VALUES(item,0,50,10,now());
 UPDATE public.workout_sessions SET status='completed',finished_at=now() WHERE id=workout;
 ASSERT (SELECT status FROM public.program_enrollments WHERE id=e2)='completed','Auto complete program';
 ASSERT (SELECT count(*) FROM public.program_events WHERE enrollment_id=e2 AND event_type='completed')=1,'Record completion';
 ASSERT public.queue_fitsync_program_reminders(current_date+interval '1 day 1 hour')=0,'No reminders after completion';
 e:=public.follow_fitsync_program(u,p,current_date,'UTC',false,18,0);
 DELETE FROM public.app_users WHERE id=u;
 ASSERT NOT EXISTS(SELECT 1 FROM public.program_enrollments WHERE user_id=u),'Account deletion cascades';
END $$;
DO $$ BEGIN
 ASSERT NOT has_function_privilege('authenticated','public.follow_fitsync_program(uuid,uuid,date,text,boolean,integer,integer,uuid)','EXECUTE'),'Clients cannot impersonate users';
 ASSERT NOT has_table_privilege('anon','public.program_push_devices','SELECT'),'Push tokens are private';
END $$;
ROLLBACK;
