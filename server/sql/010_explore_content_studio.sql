-- Optional performance migration. The content studio works with existing SQL 009.
-- Calculators share explore_resources using a reserved fitsync:tool tag, so no
-- existing content, tables, constraints, or client permissions need to change.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_explore_resources_tags ON public.explore_resources USING GIN(tags);
COMMIT;
