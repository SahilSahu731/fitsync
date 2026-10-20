-- =====================================================
-- FITSYNC DATABASE
-- Migration: 001_init.sql
-- PostgreSQL / Supabase
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =====================================================
-- 1. USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    google_sub TEXT NOT NULL UNIQUE,

    email TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,

    bio VARCHAR(250) NOT NULL DEFAULT '',

    google_photo_url TEXT,
    avatar_path TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email
ON public.app_users (email);


-- =====================================================
-- 2. FITNESS PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fitness_profiles (
    user_id UUID PRIMARY KEY
        REFERENCES public.app_users(id)
        ON DELETE CASCADE,

    goal TEXT NOT NULL
        CHECK (
            goal IN (
                'muscle',
                'strength',
                'fat_loss',
                'fitness'
            )
        ),

    experience TEXT NOT NULL
        CHECK (
            experience IN (
                'beginner',
                'intermediate',
                'advanced'
            )
        ),

    gender TEXT NOT NULL
        DEFAULT 'prefer_not_to_say'
        CHECK (
            gender IN (
                'male',
                'female',
                'prefer_not_to_say'
            )
        ),

    height_cm NUMERIC(5,1) NOT NULL
        CHECK (
            height_cm BETWEEN 100 AND 250
        ),

    weight_kg NUMERIC(5,1) NOT NULL
        CHECK (
            weight_kg BETWEEN 25 AND 350
        ),

    training_days INTEGER NOT NULL
        CHECK (
            training_days BETWEEN 1 AND 7
        ),

    minutes_per_workout INTEGER NOT NULL
        CHECK (
            minutes_per_workout IN (30, 45, 60)
        ),

    equipment TEXT NOT NULL
        CHECK (
            equipment IN (
                'gym',
                'dumbbells',
                'bodyweight'
            )
        ),

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================
-- 3. USER SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY
        REFERENCES public.app_users(id)
        ON DELETE CASCADE,

    weight_unit TEXT NOT NULL DEFAULT 'kg'
        CHECK (
            weight_unit IN ('kg', 'lb')
        ),

    rest_seconds INTEGER NOT NULL DEFAULT 90
        CHECK (
            rest_seconds IN (
                30, 60, 90, 120, 180
            )
        ),

    workout_reminders BOOLEAN NOT NULL DEFAULT FALSE,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================
-- 4. AUTH SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.app_users(id)
        ON DELETE CASCADE,

    refresh_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
ON public.auth_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry
ON public.auth_sessions (expires_at);


-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.app_users
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fitness_profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_settings
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_sessions
ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 6. CLIENT ACCESS RESTRICTIONS
-- =====================================================

-- FitSync uses an Express backend.
-- The mobile app never accesses these tables directly.
--
-- The service-role/secret key must only be stored
-- on the Express server.

REVOKE ALL ON public.app_users
FROM anon, authenticated;

REVOKE ALL ON public.fitness_profiles
FROM anon, authenticated;

REVOKE ALL ON public.user_settings
FROM anon, authenticated;

REVOKE ALL ON public.auth_sessions
FROM anon, authenticated;

-- No client-access RLS policies are created.