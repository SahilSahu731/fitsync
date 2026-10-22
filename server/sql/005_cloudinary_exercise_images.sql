-- Run after 004_exercise_library.sql. Existing Supabase images remain readable.
BEGIN;
ALTER TABLE public.exercise_media DROP CONSTRAINT IF EXISTS correct_media_provider;
ALTER TABLE public.exercise_media ADD CONSTRAINT correct_media_provider CHECK (
  (kind = 'image' AND provider IN ('supabase', 'cloudinary')) OR
  (kind = 'video' AND provider = 'cloudinary')
);
ALTER TABLE public.exercise_media DROP CONSTRAINT IF EXISTS cloudinary_delivery_url;
ALTER TABLE public.exercise_media ADD CONSTRAINT cloudinary_delivery_url CHECK (
  provider <> 'cloudinary' OR delivery_url IS NOT NULL
);
COMMIT;
NOTIFY pgrst, 'reload schema';
