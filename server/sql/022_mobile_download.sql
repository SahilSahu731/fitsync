BEGIN;

CREATE TABLE IF NOT EXISTS public.site_mobile_download (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  url text NOT NULL CHECK (url ~ '^https?://' AND length(url) BETWEEN 1 AND 2000),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0)
);

ALTER TABLE public.site_mobile_download ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_mobile_download FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_mobile_download TO service_role;

-- The public dialog identifies this listing as a sample until the admin replaces it.
INSERT INTO public.site_mobile_download (url)
VALUES ('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')
ON CONFLICT (id) DO NOTHING;

COMMIT;
NOTIFY pgrst, 'reload schema';
