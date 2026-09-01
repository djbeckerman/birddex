-- ============================================================
-- BirdDex — Remove profile_sighting_counts (Security Definer View)
--
-- Supabase's security advisor flagged this view as CRITICAL: it was
-- created by a privileged role and granted to all authenticated users,
-- so it runs with the view owner's permissions rather than the querying
-- user's — bypassing the RLS policies on public.sightings. That means
-- any signed-in user could read every user's sighting counts and
-- last-spotted dates, not just friends'.
--
-- It's unused by the app (sightingsService/friendsService compute counts
-- directly against public.sightings, which IS covered by RLS), so the
-- simplest fix is to drop it rather than patch its permissions.
-- ============================================================

DROP VIEW IF EXISTS public.profile_sighting_counts;
