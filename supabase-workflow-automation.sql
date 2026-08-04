-- Workflow automation migration
create table if not exists public.crm_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.intake_submissions(id) on delete cascade,
  automation_key text not null,
  event_type text not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  unique (lead_id, automation_key)
);

create index if not exists crm_workflow_runs_lead_event_idx
on public.crm_workflow_runs (lead_id, event_type, created_at desc);

create index if not exists crm_workflow_runs_status_idx
on public.crm_workflow_runs (status);

alter table public.crm_workflow_runs enable row level security;

alter table public.crm_tasks
  add column if not exists automation_key text;

alter table public.crm_lead_activity
  add column if not exists automation_key text;

create unique index if not exists crm_tasks_automation_key_idx
on public.crm_tasks (automation_key)
where automation_key is not null;

create unique index if not exists crm_lead_activity_automation_key_idx
on public.crm_lead_activity (automation_key)
where automation_key is not null;

drop policy if exists "Admin can view workflow runs"
on public.crm_workflow_runs;

drop policy if exists "Admin can insert workflow runs"
on public.crm_workflow_runs;

drop policy if exists "Admin can update workflow runs"
on public.crm_workflow_runs;

drop policy if exists "Admin can delete workflow runs"
on public.crm_workflow_runs;

create policy "Admin can view workflow runs"
on public.crm_workflow_runs
for select
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can insert workflow runs"
on public.crm_workflow_runs
for insert
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can update workflow runs"
on public.crm_workflow_runs
for update
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
