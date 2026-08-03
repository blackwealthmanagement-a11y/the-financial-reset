ALTER TABLE public.intake_submissions
ADD COLUMN IF NOT EXISTS consultation_status text DEFAULT 'Not Booked',
ADD COLUMN IF NOT EXISTS consultation_date timestamptz,
ADD COLUMN IF NOT EXISTS consultation_outcome text,
ADD COLUMN IF NOT EXISTS consultation_summary text;
