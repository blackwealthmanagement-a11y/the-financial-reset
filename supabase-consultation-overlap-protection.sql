-- Repeatable migration for global overlap protection on scheduled consultation events.
-- This will fail if overlapping scheduled appointments already exist.
-- Review existing data before applying in production if overlaps are present.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE consultation_events
DROP CONSTRAINT IF EXISTS consultation_events_scheduled_overlap_excl;

ALTER TABLE consultation_events
ADD CONSTRAINT consultation_events_scheduled_overlap_excl
EXCLUDE USING gist (
  status WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
)
WHERE (status = 'scheduled');
