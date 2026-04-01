-- ============================================================
-- BirdDex — Social / friends schema additions
-- Run in Supabase SQL Editor after 001_initial.sql
-- ============================================================

-- ── Index for fast username lookups ─────────────────────────
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- ── Allow reading sightings of public profiles ───────────────
-- (The existing sightings_select_friends policy covers friends;
--  this policy lets anyone read sightings from is_public=true profiles)
DROP POLICY IF EXISTS "sightings_select_public_profiles" ON public.sightings;
CREATE POLICY "sightings_select_public_profiles" ON public.sightings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.sightings.user_id
        AND p.is_public = true
    )
  );

-- ── Sighting count helper (optional, for performance) ────────
-- This view makes it cheap to get per-user species counts
CREATE OR REPLACE VIEW public.profile_sighting_counts AS
  SELECT
    user_id,
    COUNT(DISTINCT species_code) AS species_count,
    MAX(spotted_date)            AS last_spotted_at
  FROM public.sightings
  GROUP BY user_id;

-- Grant read access to authenticated users
GRANT SELECT ON public.profile_sighting_counts TO authenticated;
