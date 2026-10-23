BEGIN;

CREATE TABLE IF NOT EXISTS public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  cover_url TEXT,
  level TEXT NOT NULL CHECK (
    level IN ('beginner', 'intermediate', 'advanced')
  ),
  goal TEXT NOT NULL CHECK (
    goal IN ('muscle', 'strength', 'fat_loss', 'endurance', 'general')
  ),
  equipment TEXT NOT NULL CHECK (
    equipment IN ('gym', 'dumbbells', 'bodyweight', 'bands', 'mixed')
  ),
  duration_weeks INTEGER NOT NULL DEFAULT 8
    CHECK (duration_weeks BETWEEN 1 AND 52),
  days_per_week INTEGER NOT NULL
    CHECK (days_per_week BETWEEN 1 AND 7),
  author TEXT NOT NULL DEFAULT 'FitSync',
  featured_rank INTEGER,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_routine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.training_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES
    public.training_routine_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  level TEXT NOT NULL CHECK (
    level IN ('beginner', 'intermediate', 'advanced')
  ),
  goal TEXT NOT NULL CHECK (
    goal IN ('muscle', 'strength', 'fat_loss', 'endurance', 'general')
  ),
  equipment TEXT NOT NULL CHECK (
    equipment IN ('gym', 'dumbbells', 'bodyweight', 'bands', 'mixed')
  ),
  estimated_minutes INTEGER NOT NULL DEFAULT 45,
  author TEXT NOT NULL DEFAULT 'FitSync',
  published BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.training_routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES
    public.training_routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES
    public.exercises(id),
  position INTEGER NOT NULL,
  sets INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 20),
  min_reps INTEGER NOT NULL CHECK (min_reps >= 1),
  max_reps INTEGER NOT NULL CHECK (max_reps >= min_reps),
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  set_type TEXT NOT NULL DEFAULT 'normal',
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE(routine_id, position)
);

CREATE TABLE IF NOT EXISTS public.training_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES
    public.training_programs(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  routine_id UUID REFERENCES
    public.training_routines(id),
  label TEXT NOT NULL,
  UNIQUE(program_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.user_saved_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES
    public.app_users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES
    public.training_programs(id),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id)
);

CREATE TABLE IF NOT EXISTS public.user_saved_program_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_program_id UUID NOT NULL REFERENCES
    public.user_saved_programs(id) ON DELETE CASCADE,
  source_routine_id UUID NOT NULL REFERENCES
    public.training_routines(id),
  template_id UUID NOT NULL REFERENCES
    public.workout_templates(id) ON DELETE CASCADE,
  UNIQUE(saved_program_id, source_routine_id)
);

CREATE TABLE IF NOT EXISTS public.user_saved_routines (
  user_id UUID NOT NULL REFERENCES
    public.app_users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES
    public.training_routines(id),
  template_id UUID NOT NULL REFERENCES
    public.workout_templates(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, routine_id)
);

CREATE INDEX IF NOT EXISTS idx_training_program_filters
ON public.training_programs
(level, goal, equipment)
WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_training_routine_category
ON public.training_routines(category_id)
WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_training_program_days
ON public.training_program_days(program_id, day_number);

CREATE INDEX IF NOT EXISTS idx_training_routine_exercises
ON public.training_routine_exercises(routine_id, position);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_routine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_program_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_routines ENABLE ROW LEVEL SECURITY;

COMMIT;