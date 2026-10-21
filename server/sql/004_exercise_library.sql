
BEGIN;

-- Add an admin role without changing existing users.
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.app_users
ADD CONSTRAINT app_users_role_check
CHECK (role IN ('user', 'admin'));

-- Enforce one administrator at the database level.
CREATE UNIQUE INDEX idx_fitsync_single_admin
ON public.app_users ((role))
WHERE role = 'admin';

-- Lookup tables: all filters come from the backend.
CREATE TABLE public.exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercise_activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.exercise_categories(id),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercise_body_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercise_muscle_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercise_equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  category_id UUID NOT NULL REFERENCES public.exercise_categories(id),
  activity_type_id UUID NOT NULL REFERENCES public.exercise_activity_types(id),
  body_region_id UUID NOT NULL REFERENCES public.exercise_body_regions(id),

  difficulty TEXT NOT NULL CHECK (
    difficulty IN ('beginner', 'intermediate', 'advanced')
  ),

  tracking_type TEXT NOT NULL CHECK (
    tracking_type IN (
      'reps_weight', 'reps', 'duration', 'distance_duration'
    )
  ),

  movement_pattern TEXT NOT NULL CHECK (
    movement_pattern IN (
      'push', 'pull', 'squat', 'hinge', 'lunge',
      'carry', 'rotation', 'locomotion', 'mobility',
      'stillness', 'other'
    )
  ),

  instructions JSONB NOT NULL DEFAULT '[]',
  tips JSONB NOT NULL DEFAULT '[]',
  mistakes JSONB NOT NULL DEFAULT '[]',
  safety_notes JSONB NOT NULL DEFAULT '[]',
  breathing_tip TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),

  created_by UUID NOT NULL REFERENCES public.app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT exercise_slug_format CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  CONSTRAINT exercise_instructions_array CHECK (
    jsonb_typeof(instructions) = 'array'
  )
);

-- An exercise can have several muscles.
CREATE TABLE public.exercise_muscles (
  exercise_id UUID NOT NULL REFERENCES public.exercises(id)
    ON DELETE CASCADE,
  muscle_id UUID NOT NULL REFERENCES public.exercise_muscle_groups(id),
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary')),
  PRIMARY KEY (exercise_id, muscle_id)
);

-- An exercise can require several equipment types.
CREATE TABLE public.exercise_equipment (
  exercise_id UUID NOT NULL REFERENCES public.exercises(id)
    ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.exercise_equipment_types(id),
  PRIMARY KEY (exercise_id, equipment_id)
);

-- Images live in Supabase; videos live in Cloudinary.
CREATE TABLE public.exercise_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id)
    ON DELETE CASCADE,

  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  provider TEXT NOT NULL CHECK (provider IN ('supabase', 'cloudinary')),

  -- Supabase object path OR Cloudinary public_id.
  storage_path TEXT NOT NULL,

  -- Cloudinary secure_url. Images use the Supabase public URL.
  delivery_url TEXT,

  alt_text TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT '',

  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, storage_path),

  CONSTRAINT correct_media_provider CHECK (
    (kind = 'image' AND provider = 'supabase')
    OR
    (kind = 'video' AND provider = 'cloudinary')
  ),

  CONSTRAINT video_has_url CHECK (
    kind <> 'video' OR delivery_url IS NOT NULL
  )
);

CREATE INDEX idx_exercises_status_name
ON public.exercises(status, name);

CREATE INDEX idx_exercises_category
ON public.exercises(category_id);

CREATE INDEX idx_exercises_region
ON public.exercises(body_region_id);

CREATE INDEX idx_exercise_muscle_lookup
ON public.exercise_muscles(muscle_id);

CREATE INDEX idx_exercise_equipment_lookup
ON public.exercise_equipment(equipment_id);

CREATE INDEX idx_exercise_media_lookup
ON public.exercise_media(exercise_id, sort_order);

-- Categories
INSERT INTO public.exercise_categories(code,label,sort_order) VALUES
('strength','Strength Training',1),
('cardio','Cardio',2),
('calisthenics','Calisthenics',3),
('mobility','Mobility & Stretching',4),
('yoga','Yoga',5),
('meditation','Meditation & Breathwork',6);

-- Activity types
INSERT INTO public.exercise_activity_types(category_id,code,label,sort_order)
SELECT c.id, x.code, x.label, x.ord
FROM (VALUES
('strength','weight-training','Weight Training',1),
('strength','functional-training','Functional Training',2),
('cardio','running','Running',1),
('cardio','walking','Walking',2),
('cardio','cycling','Cycling',3),
('cardio','rowing','Rowing',4),
('cardio','jump-rope','Jump Rope',5),
('cardio','hiit','HIIT',6),
('calisthenics','bodyweight-strength','Bodyweight Strength',1),
('calisthenics','skills','Calisthenics Skills',2),
('mobility','stretching','Stretching',1),
('mobility','joint-mobility','Joint Mobility',2),
('yoga','yoga-flow','Yoga Flow',1),
('yoga','yoga-pose','Yoga Pose',2),
('meditation','guided-meditation','Guided Meditation',1),
('meditation','breathwork','Breathwork',2)
) AS x(category,code,label,ord)
JOIN public.exercise_categories c ON c.code = x.category;

-- Body regions
INSERT INTO public.exercise_body_regions(code,label,sort_order) VALUES
('upper-body','Upper Body',1),
('lower-body','Lower Body',2),
('core','Core',3),
('full-body','Full Body',4),
('mind-body','Mind & Body',5);

-- Muscle groups
INSERT INTO public.exercise_muscle_groups(code,label,sort_order) VALUES
('chest','Chest',1),
('lats','Lats',2),
('upper-back','Upper Back',3),
('lower-back','Lower Back',4),
('front-delts','Front Delts',5),
('side-delts','Side Delts',6),
('rear-delts','Rear Delts',7),
('biceps','Biceps',8),
('triceps','Triceps',9),
('forearms','Forearms',10),
('abs','Abdominals',11),
('obliques','Obliques',12),
('glutes','Glutes',13),
('quads','Quadriceps',14),
('hamstrings','Hamstrings',15),
('calves','Calves',16),
('hip-flexors','Hip Flexors',17),
('traps','Trapezius',18),
('adductors','Adductors',19),
('abductors','Hip Abductors',20);

-- Equipment types
INSERT INTO public.exercise_equipment_types(code,label,sort_order) VALUES
('bodyweight','Bodyweight',1),
('dumbbell','Dumbbell',2),
('barbell','Barbell',3),
('cable','Cable',4),
('machine','Machine',5),
('kettlebell','Kettlebell',6),
('resistance-band','Resistance Band',7),
('pull-up-bar','Pull-up Bar',8),
('bench','Bench',9),
('treadmill','Treadmill',10),
('stationary-bike','Stationary Bike',11),
('rowing-machine','Rowing Machine',12),
('jump-rope','Jump Rope',13),
('yoga-mat','Yoga Mat',14),
('none','No Equipment',15),
('ez-bar','EZ Curl Bar',16),
('medicine-ball','Medicine Ball',17),
('exercise-ball','Exercise Ball',18),
('foam-roller','Foam Roller',19),
('smith-machine','Smith Machine',20),
('other','Other Equipment',21);

-- Database view for fast, consistent API responses.
CREATE VIEW public.exercise_catalog
WITH (security_invoker = true)
AS
SELECT
  e.id, e.slug, e.name, e.description,
  e.difficulty, e.tracking_type,
  e.movement_pattern, e.instructions,
  e.tips, e.mistakes, e.safety_notes,
  e.breathing_tip, e.status,
  e.created_at, e.updated_at,

  c.code AS category,
  c.label AS category_label,
  a.code AS activity_type,
  a.label AS activity_label,
  r.code AS body_region,
  r.label AS region_label,

  COALESCE((
    SELECT array_agg(m.code ORDER BY m.sort_order)
    FROM public.exercise_muscles em
    JOIN public.exercise_muscle_groups m ON m.id = em.muscle_id
    WHERE em.exercise_id = e.id AND em.role = 'primary'
  ), ARRAY[]::text[]) AS primary_muscles,

  COALESCE((
    SELECT array_agg(m.code ORDER BY m.sort_order)
    FROM public.exercise_muscles em
    JOIN public.exercise_muscle_groups m ON m.id = em.muscle_id
    WHERE em.exercise_id = e.id AND em.role = 'secondary'
  ), ARRAY[]::text[]) AS secondary_muscles,

  COALESCE((
    SELECT array_agg(t.code ORDER BY t.sort_order)
    FROM public.exercise_equipment ee
    JOIN public.exercise_equipment_types t ON t.id = ee.equipment_id
    WHERE ee.exercise_id = e.id
  ), ARRAY[]::text[]) AS equipment,

  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', em.id,
        'kind', em.kind,
        'provider', em.provider,
        'path', em.storage_path,
        'url', em.delivery_url,
        'altText', em.alt_text,
        'sourceUrl', em.source_url,
        'credit', em.credit,
        'license', em.license
      )
      ORDER BY em.sort_order, em.created_at
    )
    FROM public.exercise_media em
    WHERE em.exercise_id = e.id
  ), '[]'::jsonb) AS media

FROM public.exercises e
JOIN public.exercise_categories c ON c.id = e.category_id
JOIN public.exercise_activity_types a ON a.id = e.activity_type_id
JOIN public.exercise_body_regions r ON r.id = e.body_region_id;

-- Atomic exercise creation/update with relational data.
CREATE FUNCTION public.save_fitsync_exercise(
  p_id UUID,
  p_actor UUID,
  p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_category UUID;
  v_activity UUID;
  v_activity_category UUID;
  v_region UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = p_actor AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_category
  FROM public.exercise_categories
  WHERE code = p_data->>'category';

  SELECT id, category_id INTO v_activity, v_activity_category
  FROM public.exercise_activity_types
  WHERE code = p_data->>'activityType';

  SELECT id INTO v_region
  FROM public.exercise_body_regions
  WHERE code = p_data->>'bodyRegion';

  IF v_category IS NULL
    OR v_activity IS NULL
    OR v_region IS NULL
    OR v_activity_category IS DISTINCT FROM v_category
  THEN
    RAISE EXCEPTION 'Invalid exercise classification'
      USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.exercises (
      slug, name, description,
      category_id, activity_type_id, body_region_id,
      difficulty, tracking_type, movement_pattern,
      instructions, tips, mistakes, safety_notes,
      breathing_tip, status, created_by
    )
    VALUES (
      p_data->>'slug', p_data->>'name',
      p_data->>'description',
      v_category, v_activity, v_region,
      p_data->>'difficulty',
      p_data->>'trackingType',
      p_data->>'movementPattern',
      p_data->'instructions',
      p_data->'tips',
      p_data->'mistakes',
      p_data->'safetyNotes',
      p_data->>'breathingTip',
      p_data->>'status',
      p_actor
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.exercises SET
      slug = p_data->>'slug',
      name = p_data->>'name',
      description = p_data->>'description',
      category_id = v_category,
      activity_type_id = v_activity,
      body_region_id = v_region,
      difficulty = p_data->>'difficulty',
      tracking_type = p_data->>'trackingType',
      movement_pattern = p_data->>'movementPattern',
      instructions = p_data->'instructions',
      tips = p_data->'tips',
      mistakes = p_data->'mistakes',
      safety_notes = p_data->'safetyNotes',
      breathing_tip = p_data->>'breathingTip',
      status = p_data->>'status',
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Exercise not found'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF p_data->>'status' = 'published'
  AND NOT EXISTS (
    SELECT 1 FROM public.exercise_media
    WHERE exercise_id = v_id
  ) THEN
    RAISE EXCEPTION 'Add demonstration media before publishing'
      USING ERRCODE = '22023';
  END IF;

  IF p_data->>'status' = 'published'
  AND EXISTS (
    SELECT 1 FROM public.exercise_media
    WHERE exercise_id = v_id AND btrim(license) = ''
  ) THEN
    RAISE EXCEPTION 'Every media file must have usage rights recorded'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.exercise_muscles WHERE exercise_id = v_id;
  DELETE FROM public.exercise_equipment WHERE exercise_id = v_id;

  INSERT INTO public.exercise_muscles(exercise_id,muscle_id,role)
  SELECT v_id, m.id, 'primary'
  FROM jsonb_array_elements_text(p_data->'primaryMuscles') x(code)
  JOIN public.exercise_muscle_groups m ON m.code = x.code;

  INSERT INTO public.exercise_muscles(exercise_id,muscle_id,role)
  SELECT v_id, m.id, 'secondary'
  FROM jsonb_array_elements_text(p_data->'secondaryMuscles') x(code)
  JOIN public.exercise_muscle_groups m ON m.code = x.code;

  INSERT INTO public.exercise_equipment(exercise_id,equipment_id)
  SELECT v_id, t.id
  FROM jsonb_array_elements_text(p_data->'equipment') x(code)
  JOIN public.exercise_equipment_types t ON t.code = x.code;

  RETURN v_id;
END;
$$;

-- The mobile app cannot call these tables/functions directly.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'exercise_categories',
    'exercise_activity_types',
    'exercise_body_regions',
    'exercise_muscle_groups',
    'exercise_equipment_types',
    'exercises',
    'exercise_muscles',
    'exercise_equipment',
    'exercise_media'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END;
$$;

REVOKE ALL ON public.exercise_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.exercise_catalog TO service_role;

REVOKE ALL ON FUNCTION public.save_fitsync_exercise(UUID,UUID,JSONB)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_fitsync_exercise(UUID,UUID,JSONB)
TO service_role;

-- Photos only. Videos never enter this bucket.
INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'exercise-images',
  'exercise-images',
  true,
  3145728,
  ARRAY['image/webp']::text[]
);

COMMIT;

NOTIFY pgrst, 'reload schema';
