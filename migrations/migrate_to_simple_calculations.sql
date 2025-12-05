-- migrations/migrate_to_simple_calculations.sql
-- Non-destructive migration to add simple columns to existing `calculations` table
-- and populate them from existing detailed columns.
--
-- WARNING: BACKUP your data before running. You can export the table via Supabase Table Editor
-- or run `select to_jsonb(t) from public.calculations t;` to dump rows.
--
-- This script will:
-- 1) Add `power_consumption`, `cost_per_kwh`, and `result` columns if they don't exist.
-- 2) Populate those columns from existing columns (`kwh` -> `power_consumption`, `rate` -> `cost_per_kwh`, `total` -> `result`).
-- 3) Ensure an index and RLS policies exist (create/replace style).
-- 4) Leaves original detailed columns in place so you can verify results before dropping them.

BEGIN;

-- 1) Add new columns if missing
ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS power_consumption numeric;

ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS cost_per_kwh numeric;

ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS result numeric;

-- 2) Populate from existing columns where values are NULL
-- Use appropriate fallback logic if some columns don't exist.
DO $$
BEGIN
  -- Only run update if the source column exists
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='calculations' AND column_name='kwh') THEN
    UPDATE public.calculations SET power_consumption = kwh WHERE power_consumption IS NULL;
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='calculations' AND column_name='rate') THEN
    UPDATE public.calculations SET cost_per_kwh = rate WHERE cost_per_kwh IS NULL;
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='calculations' AND column_name='total') THEN
    UPDATE public.calculations SET result = total WHERE result IS NULL;
  END IF;
END$$;

-- 3) Create index for user + created_at if missing
CREATE INDEX IF NOT EXISTS idx_calculations_user_created ON public.calculations (user_id, created_at desc);

-- 4) Ensure RLS is enabled and policies are present and correct
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

-- drop and recreate policies (safe to run multiple times)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'insert_own_calculations' AND polrelid = 'public.calculations'::regclass) THEN
    EXECUTE 'DROP POLICY insert_own_calculations ON public.calculations';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'select_own_calculations' AND polrelid = 'public.calculations'::regclass) THEN
    EXECUTE 'DROP POLICY select_own_calculations ON public.calculations';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'update_own_calculations' AND polrelid = 'public.calculations'::regclass) THEN
    EXECUTE 'DROP POLICY update_own_calculations ON public.calculations';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'delete_own_calculations' AND polrelid = 'public.calculations'::regclass) THEN
    EXECUTE 'DROP POLICY delete_own_calculations ON public.calculations';
  END IF;
END$$;

-- Recreate policies
CREATE POLICY insert_own_calculations ON public.calculations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY select_own_calculations ON public.calculations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY update_own_calculations ON public.calculations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_calculations ON public.calculations
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;

-- After running this script you can verify the data with e.g.
-- SELECT id, user_id, month, power_consumption, cost_per_kwh, result FROM public.calculations LIMIT 50;
-- If everything looks good you may optionally drop the old columns (kwh, rate, total, generation, etc.).

-- To drop old detailed columns (UNCOMMENT WHEN READY):
-- ALTER TABLE public.calculations DROP COLUMN IF EXISTS kwh, DROP COLUMN IF EXISTS rate, DROP COLUMN IF EXISTS generation, DROP COLUMN IF EXISTS transmission, DROP COLUMN IF EXISTS distribution, DROP COLUMN IF EXISTS universal, DROP COLUMN IF EXISTS other_charges, DROP COLUMN IF EXISTS subtotal, DROP COLUMN IF EXISTS tax, DROP COLUMN IF EXISTS total;
