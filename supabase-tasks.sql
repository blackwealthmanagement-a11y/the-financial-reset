-- CRM Tasks migration
-- 1) Create a dedicated table for lead tasks so admins can track follow-up work without changing the intake submission table.
create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.intake_submissions(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'Medium',
  status text not null default 'Pending',
  due_date timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2) Add useful indexes to keep task lookups fast for a single lead and for dashboard summaries.
create index if not exists crm_tasks_lead_id_idx on public.crm_tasks (lead_id, created_at desc);
create index if not exists crm_tasks_due_date_idx on public.crm_tasks (due_date, status, completed);
create index if not exists crm_tasks_priority_idx on public.crm_tasks (priority, completed, status);

-- 3) Enable Row Level Security so only the existing administrator account can access CRM task data.
alter table public.crm_tasks enable row level security;

-- 4) Reuse the existing administrator UUID policy already used throughout the CRM.
drop policy if exists "Admin can view crm tasks" on public.crm_tasks;
drop policy if exists "Admin can insert crm tasks" on public.crm_tasks;
drop policy if exists "Admin can update crm tasks" on public.crm_tasks;
drop policy if exists "Admin can delete crm tasks" on public.crm_tasks;

create policy "Admin can view crm tasks"
on public.crm_tasks
for select
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can insert crm tasks"
on public.crm_tasks
for insert
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can update crm tasks"
on public.crm_tasks
for update
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can delete crm tasks"
on public.crm_tasks
for delete
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
