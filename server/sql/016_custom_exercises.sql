-- Apply after 004, 006 and 007. No existing row changes ownership.
BEGIN;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE;
-- Let the owner cascade finish before checking the existing author reference.
ALTER TABLE public.exercises ALTER CONSTRAINT exercises_created_by_fkey DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX IF NOT EXISTS exercises_owner_idx ON public.exercises(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE OR REPLACE VIEW public.exercise_catalog
WITH (security_invoker = true)
AS
SELECT
  e.id, e.slug, e.name, e.description,
  e.difficulty, e.tracking_type,
  e.movement_pattern, e.instructions,
  e.tips, e.mistakes, e.safety_notes,
  e.breathing_tip, e.status,
  e.created_at, e.updated_at,

  c.code AS category,
  c.label AS category_label,
  a.code AS activity_type,
  a.label AS activity_label,
  r.code AS body_region,
  r.label AS region_label,

  COALESCE((
    SELECT array_agg(m.code ORDER BY m.sort_order)
    FROM public.exercise_muscles em
    JOIN public.exercise_muscle_groups m ON m.id = em.muscle_id
    WHERE em.exercise_id = e.id AND em.role = 'primary'
  ), ARRAY[]::text[]) AS primary_muscles,

  COALESCE((
    SELECT array_agg(m.code ORDER BY m.sort_order)
    FROM public.exercise_muscles em
    JOIN public.exercise_muscle_groups m ON m.id = em.muscle_id
    WHERE em.exercise_id = e.id AND em.role = 'secondary'
  ), ARRAY[]::text[]) AS secondary_muscles,

  COALESCE((
    SELECT array_agg(t.code ORDER BY t.sort_order)
    FROM public.exercise_equipment ee
    JOIN public.exercise_equipment_types t ON t.id = ee.equipment_id
    WHERE ee.exercise_id = e.id
  ), ARRAY[]::text[]) AS equipment,

  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', em.id,
        'kind', em.kind,
        'provider', em.provider,
        'path', em.storage_path,
        'url', em.delivery_url,
        'altText', em.alt_text,
        'sourceUrl', em.source_url,
        'credit', em.credit,
        'license', em.license
      )
      ORDER BY em.sort_order, em.created_at
    )
    FROM public.exercise_media em
    WHERE em.exercise_id = e.id
  ), '[]'::jsonb) AS media,
  e.owner_user_id

FROM public.exercises e
JOIN public.exercise_categories c ON c.id = e.category_id
JOIN public.exercise_activity_types a ON a.id = e.activity_type_id
JOIN public.exercise_body_regions r ON r.id = e.body_region_id;


-- Private exercises share the normal logger's foreign keys, never the public feed.
CREATE OR REPLACE FUNCTION public.save_fitsync_custom_exercise(p_actor uuid, p_id uuid, p_data jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_id uuid; v_category uuid; v_activity uuid; v_region uuid; v_tracking text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id=p_actor) THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE='42501';
  END IF;
  SELECT id INTO v_category FROM public.exercise_categories WHERE code=p_data->>'category';
  SELECT id INTO v_activity FROM public.exercise_activity_types WHERE code=p_data->>'activityType' AND category_id=v_category;
  SELECT id INTO v_region FROM public.exercise_body_regions WHERE code=p_data->>'bodyRegion';
  IF v_category IS NULL OR v_activity IS NULL OR v_region IS NULL THEN
    RAISE EXCEPTION 'Invalid exercise classification' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_data->'primaryMuscles') x(code) WHERE NOT EXISTS (SELECT 1 FROM public.exercise_muscle_groups m WHERE m.code=x.code))
    OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_data->'secondaryMuscles') x(code) WHERE NOT EXISTS (SELECT 1 FROM public.exercise_muscle_groups m WHERE m.code=x.code))
    OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_data->'equipment') x(code) WHERE NOT EXISTS (SELECT 1 FROM public.exercise_equipment_types e WHERE e.code=x.code)) THEN
    RAISE EXCEPTION 'Invalid muscle or equipment' USING ERRCODE='22023';
  END IF;
  IF p_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO public.exercises(id,slug,name,description,category_id,activity_type_id,body_region_id,difficulty,tracking_type,movement_pattern,instructions,tips,mistakes,safety_notes,breathing_tip,status,created_by,owner_user_id)
    VALUES(v_id,'custom-'||v_id::text,p_data->>'name',p_data->>'description',v_category,v_activity,v_region,p_data->>'difficulty',p_data->>'trackingType',p_data->>'movementPattern',p_data->'instructions',p_data->'tips',p_data->'mistakes',p_data->'safetyNotes',p_data->>'breathingTip','published',p_actor,p_actor);
  ELSE
    SELECT tracking_type INTO v_tracking FROM public.exercises WHERE id=p_id AND owner_user_id=p_actor FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found' USING ERRCODE='P0002'; END IF;
    IF v_tracking IS DISTINCT FROM p_data->>'trackingType' AND (
      EXISTS(SELECT 1 FROM public.workout_session_exercises WHERE exercise_id=p_id) OR
      EXISTS(SELECT 1 FROM public.workout_template_exercises WHERE exercise_id=p_id)
    ) THEN RAISE EXCEPTION 'Tracking type cannot change after an exercise is used. Create another exercise for the new tracking type.' USING ERRCODE='22023'; END IF;
    UPDATE public.exercises SET name=p_data->>'name',description=p_data->>'description',category_id=v_category,activity_type_id=v_activity,body_region_id=v_region,difficulty=p_data->>'difficulty',tracking_type=p_data->>'trackingType',movement_pattern=p_data->>'movementPattern',instructions=p_data->'instructions',tips=p_data->'tips',mistakes=p_data->'mistakes',safety_notes=p_data->'safetyNotes',breathing_tip=p_data->>'breathingTip',updated_at=now()
    WHERE id=p_id AND owner_user_id=p_actor;
    v_id := p_id;
  END IF;
  DELETE FROM public.exercise_muscles WHERE exercise_id=v_id;
  DELETE FROM public.exercise_equipment WHERE exercise_id=v_id;
  INSERT INTO public.exercise_muscles(exercise_id,muscle_id,role)
    SELECT v_id,m.id,'primary' FROM jsonb_array_elements_text(p_data->'primaryMuscles') x(code) JOIN public.exercise_muscle_groups m ON m.code=x.code;
  INSERT INTO public.exercise_muscles(exercise_id,muscle_id,role)
    SELECT v_id,m.id,'secondary' FROM jsonb_array_elements_text(p_data->'secondaryMuscles') x(code) JOIN public.exercise_muscle_groups m ON m.code=x.code;
  INSERT INTO public.exercise_equipment(exercise_id,equipment_id)
    SELECT v_id,e.id FROM jsonb_array_elements_text(p_data->'equipment') x(code) JOIN public.exercise_equipment_types e ON e.code=x.code;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.save_fitsync_custom_exercise(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_fitsync_custom_exercise(uuid,uuid,jsonb) TO service_role;
-- A private movement can never be inserted into a shared catalog routine.
CREATE OR REPLACE FUNCTION public.guard_fitsync_private_catalog_exercise()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.exercises WHERE id=NEW.exercise_id AND owner_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Private exercises cannot be used in the public training catalog.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_fitsync_private_catalog_exercise() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_private_catalog_exercise ON public.training_routine_exercises;
CREATE TRIGGER guard_private_catalog_exercise BEFORE INSERT OR UPDATE OF exercise_id ON public.training_routine_exercises
FOR EACH ROW EXECUTE FUNCTION public.guard_fitsync_private_catalog_exercise();
COMMIT;
NOTIFY pgrst, 'reload schema';
