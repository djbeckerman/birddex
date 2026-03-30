-- ============================================================
-- BirdDex — Initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  username              TEXT UNIQUE,
  spirit_bird_code      TEXT,
  spirit_bird_photo_url TEXT,
  avatar_url            TEXT,
  is_public             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sightings (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species_code    TEXT    NOT NULL,
  common_name     TEXT,
  scientific_name TEXT,
  spotted_date    TIMESTAMPTZ NOT NULL,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  location_name   TEXT,
  notes           TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sightings_user_id_idx      ON public.sightings(user_id);
CREATE INDEX IF NOT EXISTS sightings_species_code_idx ON public.sightings(species_code);
CREATE INDEX IF NOT EXISTS friendships_requester_idx  ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx  ON public.friendships(addressee_id);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sightings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- profiles: own row + any public profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- sightings: full CRUD on own, read friends' if accepted + public profile
CREATE POLICY "sightings_all_own" ON public.sightings
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sightings_select_friends" ON public.sightings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships f
      JOIN public.profiles p ON p.id = public.sightings.user_id
      WHERE (
            (f.requester_id = auth.uid() AND f.addressee_id = public.sightings.user_id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = public.sightings.user_id)
      )
      AND f.status = 'accepted'
      AND p.is_public = true
    )
  );

-- friendships: own rows; only addressee can update status
CREATE POLICY "friendships_select_own" ON public.friendships
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "friendships_insert_own" ON public.friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "friendships_update_addressee" ON public.friendships
  FOR UPDATE USING (addressee_id = auth.uid());

-- ── Auto-create profile row on sign-up ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
