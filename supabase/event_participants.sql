-- ============================================================
-- FitTribe: Event Participants
-- Add to supabase/schema.sql (or run in Supabase SQL editor)
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS event_participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)   -- one row per member per event
);

-- 2. Index for fast lookups per event
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id
  ON event_participants (event_id);

-- 3. Enable RLS
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see who's going to any event
CREATE POLICY "Members can view participants"
  ON event_participants FOR SELECT
  USING (auth.role() = 'authenticated');

-- Members can only sign themselves up
CREATE POLICY "Members can sign up"
  ON event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Members can only cancel their own sign-up
CREATE POLICY "Members can cancel their own sign-up"
  ON event_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Tribe leaders (admin role) can remove anyone (e.g. no-shows)
CREATE POLICY "Leaders can remove any participant"
  ON event_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- ============================================================
-- Helper view: participant count per event (used for badges)
-- ============================================================
CREATE OR REPLACE VIEW event_participant_counts AS
  SELECT event_id, COUNT(*) AS participant_count
  FROM event_participants
  GROUP BY event_id;
