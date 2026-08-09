-- Version 3.1 Phase 1
-- Consultation scheduling foundation

-- 1. Ensure the clients table can be referenced by the combination
-- of client id and its associated CRM lead.
create unique index if not exists clients_id_lead_id_unique_idx
on public.clients (id, lead_id);

-- 2. Create the appointment table.
create table if not exists public.consultation_events (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null,
  lead_id uuid not null,

  start_time timestamptz not null,
  end_time timestamptz not null,

  timezone text not null default 'America/New_York',

  meeting_type text not null default 'consultation'
    check (
      meeting_type in (
        'consultation',
        'follow_up',
        'coaching'
      )
    ),

  status text not null default 'scheduled'
    check (
      status in (
        'scheduled',
        'completed',
        'cancelled',
        'no_show'
      )
    ),

  meeting_link text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint consultation_events_valid_time
    check (end_time > start_time),

  constraint consultation_events_client_lead_fk
    foreign key (client_id, lead_id)
    references public.clients (id, lead_id)
    on delete cascade
);

-- 3. Add indexes used by CRM and portal scheduling views.

create index if not exists consultation_events_client_start_idx
on public.consultation_events (client_id, start_time);

create index if not exists consultation_events_lead_start_idx
on public.consultation_events (lead_id, start_time);

create index if not exists consultation_events_status_start_idx
on public.consultation_events (status, start_time);

-- 4. Enable Row Level Security.

alter table public.consultation_events
enable row level security;

-- 5. Replace policies safely.

drop policy if exists "Clients can view own consultation events"
on public.consultation_events;

drop policy if exists "Admins can manage consultation events"
on public.consultation_events;

-- 6. Portal clients may only READ appointments belonging to
-- their authenticated client identity.

create policy "Clients can view own consultation events"
on public.consultation_events
for select
to authenticated
using (
  client_id in (
    select c.id
    from public.clients c
    where c.auth_user_id = (select auth.uid())
  )
);

-- 7. CRM administrator retains full management access.

create policy "Admins can manage consultation events"
on public.consultation_events
for all
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
