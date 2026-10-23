BEGIN;

CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id)
    ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL
    REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL
    REFERENCES public.exercises(id),
  position INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  rest_seconds INTEGER NOT NULL DEFAULT 90
    CHECK (rest_seconds BETWEEN 0 AND 900),
  UNIQUE (template_id, position)
);

CREATE TABLE public.workout_template_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_exercise_id UUID NOT NULL
    REFERENCES public.workout_template_exercises(id)
    ON DELETE CASCADE,
  position INTEGER NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal'
    CHECK (set_type IN (
      'warmup', 'normal', 'heavy', 'failure', 'drop'
    )),
  target_reps INTEGER CHECK (target_reps BETWEEN 1 AND 1000),
  target_weight NUMERIC(8,2)
    CHECK (target_weight >= 0),
  target_duration_seconds INTEGER
    CHECK (target_duration_seconds >= 0),
  UNIQUE (template_exercise_id, position)
);

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id)
    ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id)
    ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'discarded')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  elapsed_seconds INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'active' AND finished_at IS NULL)
    OR (status <> 'active' AND finished_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX one_active_workout_per_user
ON public.workout_sessions(user_id)
WHERE status = 'active';

CREATE TABLE public.workout_session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL
    REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  exercise_name TEXT NOT NULL,
  tracking_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  rest_seconds INTEGER NOT NULL DEFAULT 90
    CHECK (rest_seconds BETWEEN 0 AND 900),
  UNIQUE (session_id, position)
);

CREATE TABLE public.workout_logged_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL
    REFERENCES public.workout_session_exercises(id)
    ON DELETE CASCADE,
  position INTEGER NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal'
    CHECK (set_type IN (
      'warmup', 'normal', 'heavy', 'failure', 'drop'
    )),
  weight_kg NUMERIC(8,2)
    CHECK (weight_kg >= 0),
  reps INTEGER CHECK (reps >= 0),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  distance_meters NUMERIC(10,2)
    CHECK (distance_meters >= 0),
  rpe NUMERIC(3,1) CHECK (rpe BETWEEN 1 AND 10),
  rir INTEGER CHECK (rir BETWEEN 0 AND 10),
  completed_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE (session_exercise_id, position)
);

CREATE INDEX idx_workout_templates_user
ON public.workout_templates(user_id, created_at DESC);

CREATE INDEX idx_workout_sessions_user
ON public.workout_sessions(user_id, started_at DESC);

CREATE INDEX idx_workout_session_exercises_session
ON public.workout_session_exercises(session_id);

CREATE INDEX idx_workout_logged_sets_exercise
ON public.workout_logged_sets(session_exercise_id);

-- Service-role backend owns writes. Never expose these tables
-- directly through anonymous client access.
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logged_sets ENABLE ROW LEVEL SECURITY;

COMMIT;