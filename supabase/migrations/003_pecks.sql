-- ============================================================
-- BirdDex — Pecks (lightweight friend-to-friend "poke")
-- Run in Supabase SQL Editor after 002_social.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pecks (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_at      TIMESTAMPTZ,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS pecks_recipient_idx ON public.pecks(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pecks_sender_idx    ON public.pecks(sender_id, created_at DESC);

ALTER TABLE public.pecks ENABLE ROW LEVEL SECURITY;

-- Only accepted friends may peck each other
CREATE POLICY "pecks_insert_friends" ON public.pecks
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
              (f.requester_id = auth.uid() AND f.addressee_id = public.pecks.recipient_id)
           OR (f.addressee_id = auth.uid() AND f.requester_id = public.pecks.recipient_id)
        )
    )
  );

-- Each side can read pecks they sent or received
CREATE POLICY "pecks_select_own" ON public.pecks
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Recipient can mark their own pecks as seen
CREATE POLICY "pecks_update_recipient" ON public.pecks
  FOR UPDATE USING (recipient_id = auth.uid());
