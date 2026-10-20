
ALTER TABLE public.fitness_profiles
ADD COLUMN IF NOT EXISTS body_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fitness_profiles_body_type_check'
  ) THEN
    ALTER TABLE public.fitness_profiles
    ADD CONSTRAINT fitness_profiles_body_type_check
    CHECK (
      body_type IS NULL
      OR body_type IN ('slim', 'medium', 'broad')
    );
  END IF;
END $$;
