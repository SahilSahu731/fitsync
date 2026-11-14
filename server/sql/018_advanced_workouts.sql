-- Apply after 006_workouts.sql, before deploying the updated API.
BEGIN;
ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS superset_group text CHECK (superset_group IS NULL OR superset_group ~ '^[A-Za-z0-9_-]{1,24}$');
ALTER TABLE public.workout_session_exercises
  ADD COLUMN IF NOT EXISTS superset_group text CHECK (superset_group IS NULL OR superset_group ~ '^[A-Za-z0-9_-]{1,24}$');
ALTER TABLE public.workout_template_sets
  ADD COLUMN IF NOT EXISTS rest_seconds integer CHECK (rest_seconds BETWEEN 0 AND 900),
  ADD COLUMN IF NOT EXISTS tempo text CHECK (tempo IS NULL OR tempo ~ '^([0-9]|X)-([0-9]|X)-([0-9]|X)-([0-9]|X)$');
ALTER TABLE public.workout_logged_sets
  ADD COLUMN IF NOT EXISTS rest_seconds integer CHECK (rest_seconds BETWEEN 0 AND 900),
  ADD COLUMN IF NOT EXISTS tempo text CHECK (tempo IS NULL OR tempo ~ '^([0-9]|X)-([0-9]|X)-([0-9]|X)-([0-9]|X)$');
ALTER TABLE public.workout_template_sets DROP CONSTRAINT IF EXISTS workout_template_sets_set_type_check;
ALTER TABLE public.workout_template_sets ADD CONSTRAINT workout_template_sets_set_type_check
  CHECK (set_type IN ('warmup','normal','heavy','failure','drop','rest_pause'));
ALTER TABLE public.workout_logged_sets DROP CONSTRAINT IF EXISTS workout_logged_sets_set_type_check;
ALTER TABLE public.workout_logged_sets ADD CONSTRAINT workout_logged_sets_set_type_check
  CHECK (set_type IN ('warmup','normal','heavy','failure','drop','rest_pause'));
COMMIT;
NOTIFY pgrst, 'reload schema';
