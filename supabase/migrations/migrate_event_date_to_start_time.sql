-- ============================================================
-- FitTribe: rename event_date → event_date_start_time
-- Run in Supabase SQL editor (choose "Run without RLS")
-- ============================================================

-- 1. Add the new timestamptz column
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS event_date_start_time timestamptz;

-- 2. Copy existing date values, treating them as midnight Pacific time.
--    AT TIME ZONE converts the naive date (assumed Pacific) to UTC for storage.
UPDATE calendar_events
  SET event_date_start_time = (event_date::text || ' 00:00:00')::timestamp
    AT TIME ZONE 'America/Los_Angeles'
  WHERE event_date_start_time IS NULL
    AND event_date IS NOT NULL;

-- 3. Make the new column required going forward
ALTER TABLE calendar_events
  ALTER COLUMN event_date_start_time SET NOT NULL;

-- 4. Drop the old column (comment out if you want to keep it temporarily)
ALTER TABLE calendar_events
  DROP COLUMN IF EXISTS event_date;

-- 5. Update the ordering index (if you had one)
-- CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time
--   ON calendar_events (event_date_start_time);
