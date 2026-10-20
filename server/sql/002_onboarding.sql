-- =====================================================
-- FITSYNC
-- Migration: 002_onboarding.sql
-- =====================================================

BEGIN;

-- Add body build preference.

ALTER TABLE public.fitness_profiles
ADD COLUMN IF NOT EXISTS body_type TEXT;


-- Allow an optional body build.
-- This is a descriptive preference, not a diagnosis.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid =
            'public.fitness_profiles'::regclass
          AND conname =
            'fitness_profiles_body_type_check'
    ) THEN

        ALTER TABLE public.fitness_profiles
        ADD CONSTRAINT fitness_profiles_body_type_check
        CHECK (
            body_type IS NULL
            OR body_type IN (
                'slim',
                'medium',
                'broad'
            )
        );

    END IF;
END $$;

COMMIT;