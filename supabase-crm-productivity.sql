-- CRM Productivity migration
-- 1) Add follow-up and temperature columns to the existing intake_submissions table.
--    These fields are used by the CRM detail screen for lead prioritization and follow-up tracking.
alter table public.intake_submissions
  add column if not exists next_follow_up_date date;

alter table public.intake_submissions
  add column if not exists lead_temperature text;

-- 2) Create a dedicated table for internal notes so every lead can have unlimited notes.
--    Notes are stored separately from the intake record to avoid overloading the original intake payload.
create table if not exists public.crm_lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.intake_submissions(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists crm_lead_notes_lead_id_idx on public.crm_lead_notes (lead_id, created_at desc);

-- 3) Create an activity log table for the CRM timeline.
--    This stores status changes, follow-up updates, temperature changes, and note additions.
create table if not exists public.crm_lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.intake_submissions(id) on delete cascade,
  activity_type text not null,
  message text not null,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists crm_lead_activity_lead_id_idx on public.crm_lead_activity (lead_id, created_at desc);

-- 4) Enable RLS on the new tables and grant the administrator account access.
--    The same UUID policy used for the main intake_submissions table is reused here.
alter table public.crm_lead_notes enable row level security;
alter table public.crm_lead_activity enable row level security;

drop policy if exists "Admin can view lead notes" on public.crm_lead_notes;
drop policy if exists "Admin can insert lead notes" on public.crm_lead_notes;
drop policy if exists "Admin can view lead activity" on public.crm_lead_activity;
drop policy if exists "Admin can insert lead activity" on public.crm_lead_activity;

create policy "Admin can view lead notes"
on public.crm_lead_notes
for select
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can insert lead notes"
on public.crm_lead_notes
for insert
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can view lead activity"
on public.crm_lead_activity
for select
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can insert lead activity"
on public.crm_lead_activity
for insert
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
