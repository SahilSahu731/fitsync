-- =====================================================
-- FITSYNC
-- Migration: 003_storage.sql
-- =====================================================

-- Only the Express backend should access this bucket
-- with its Supabase server-side privileged key.
--
-- Express converts uploaded profile images to WebP.

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'profile-images',
    'profile-images',
    FALSE,
    3145728,
    ARRAY['image/webp']::text[]
)
ON CONFLICT (id)
DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No public access policies are created for
-- storage.objects.
--
-- The service-role client on Express can access
-- the private bucket and generate signed URLs.