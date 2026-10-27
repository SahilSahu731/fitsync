-- TEST ONLY. Use a fresh database named fitsync_program_test on a local server.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database()<>'fitsync_program_test' THEN RAISE EXCEPTION 'Use a disposable fitsync_program_test database'; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
-- Minimal pre-workout schema; the real workout/catalog/following migrations run below.
CREATE TABLE public.app_users(id uuid PRIMARY KEY);
CREATE TABLE public.exercises(id uuid PRIMARY KEY, name text, tracking_type text, status text);
CREATE TABLE public.user_settings(user_id uuid PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,workout_reminders boolean DEFAULT false);
CREATE TABLE public.auth_sessions(id uuid PRIMARY KEY, user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,refresh_hash text,expires_at timestamptz,revoked_at timestamptz);
\ir ../../sql/006_workouts.sql
\ir ../../sql/007_training_catalog.sql
\ir ../../sql/008_program_following.sql
\ir program-following.sql
