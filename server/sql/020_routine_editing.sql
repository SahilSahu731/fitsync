-- Personal routine editing. Apply after 008, 014, 016 and 018, before deploying the API.
BEGIN;
ALTER TABLE public.workout_templates ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0 CHECK(revision>=0);
CREATE OR REPLACE FUNCTION public.bump_fitsync_template_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.revision := OLD.revision+1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bump_fitsync_template_revision() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS fitsync_template_revision ON public.workout_templates;
CREATE TRIGGER fitsync_template_revision BEFORE UPDATE ON public.workout_templates
FOR EACH ROW EXECUTE FUNCTION public.bump_fitsync_template_revision();

CREATE OR REPLACE FUNCTION public.edit_fitsync_workout_template(
  p_user_id uuid,p_template_id uuid,p_expected_revision integer,p_data jsonb
) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$
DECLARE saved public.workout_templates; item jsonb; dose jsonb; item_position integer:=0; dose_position integer;
  exercise_row public.exercises; inserted_exercise uuid; existing_exercises uuid[];
BEGIN
  SELECT * INTO saved FROM public.workout_templates WHERE id=p_template_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Routine not found.' USING ERRCODE='P0002'; END IF;
  IF saved.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'This routine changed on another device. Reload the saved routine before applying your edits.' USING ERRCODE='40001'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_saved_routines WHERE template_id=p_template_id)
    OR EXISTS(SELECT 1 FROM public.user_saved_program_routines WHERE template_id=p_template_id)
    OR EXISTS(SELECT 1 FROM public.coaching_days WHERE template_id=p_template_id)
    OR EXISTS(SELECT 1 FROM public.program_workout_slots WHERE template_id=p_template_id) THEN
    RAISE EXCEPTION 'Only routines you created can be edited. Save a personal copy instead.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR length(btrim(coalesce(p_data->>'name',''))) NOT BETWEEN 1 AND 100
    OR length(coalesce(p_data->>'description',''))>2000 OR jsonb_typeof(p_data->'exercises') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid routine input.' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_data->'exercises') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Choose 1 to 50 exercises.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(array_agg(exercise_id),ARRAY[]::uuid[]) INTO existing_exercises FROM public.workout_template_exercises WHERE template_id=p_template_id;
  -- Validate all selected catalog rows before replacing anything. Keep rows stable for this transaction.
  FOR item IN SELECT value FROM jsonb_array_elements(p_data->'exercises') LOOP
    SELECT * INTO exercise_row FROM public.exercises WHERE id=(item->>'exerciseId')::uuid FOR SHARE;
    IF NOT FOUND OR NOT coalesce((
      ((exercise_row.owner_user_id IS NULL OR exercise_row.owner_user_id=p_user_id) AND exercise_row.status='published')
      OR (exercise_row.owner_user_id=p_user_id AND exercise_row.status='archived' AND exercise_row.id=ANY(existing_exercises))
    ),false) THEN RAISE EXCEPTION 'An exercise is unavailable to your account. Choose an available exercise.' USING ERRCODE='22023'; END IF;
    IF jsonb_typeof(item->'sets') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Add sets for every exercise.' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(item->'sets') NOT BETWEEN 1 AND 30 OR length(coalesce(item->>'notes',''))>1000 THEN RAISE EXCEPTION 'Invalid exercise targets.' USING ERRCODE='22023'; END IF;
  END LOOP;
  UPDATE public.workout_templates SET name=btrim(p_data->>'name'),description=coalesce(p_data->>'description','') WHERE id=p_template_id;
  DELETE FROM public.workout_template_exercises WHERE template_id=p_template_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_data->'exercises') LOOP
    INSERT INTO public.workout_template_exercises(template_id,exercise_id,position,notes,rest_seconds,superset_group)
      VALUES(p_template_id,(item->>'exerciseId')::uuid,item_position,coalesce(item->>'notes',''),coalesce((item->>'restSeconds')::integer,90),nullif(item->>'supersetGroup','')) RETURNING id INTO inserted_exercise;
    dose_position:=0;
    FOR dose IN SELECT value FROM jsonb_array_elements(item->'sets') LOOP
      INSERT INTO public.workout_template_sets(template_exercise_id,position,set_type,target_reps,target_weight,target_duration_seconds,rest_seconds,tempo)
        VALUES(inserted_exercise,dose_position,coalesce(dose->>'setType','normal'),(dose->>'targetReps')::integer,(dose->>'targetWeight')::numeric,(dose->>'targetDurationSeconds')::integer,(dose->>'restSeconds')::integer,nullif(dose->>'tempo',''));
      dose_position:=dose_position+1;
    END LOOP;
    item_position:=item_position+1;
  END LOOP;
  RETURN p_template_id;
END $$;
REVOKE ALL ON FUNCTION public.edit_fitsync_workout_template(uuid,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edit_fitsync_workout_template(uuid,uuid,integer,jsonb) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
