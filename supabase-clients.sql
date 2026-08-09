-- Client identity migration
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null unique
    references public.intake_submissions(id)
    on delete cascade,

  auth_user_id uuid unique
    references auth.users(id)
    on delete set null,

  program text,

  status text not null default 'Active'
    check (status in ('Active', 'Paused', 'Completed', 'Inactive')),

  onboarding_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_auth_user_id_idx
on public.clients (auth_user_id);

alter table public.clients enable row level security;

drop policy if exists "Clients can read own record"
on public.clients;

drop policy if exists "Admins can manage clients"
on public.clients;

create policy "Clients can read own record"
on public.clients
for select
to authenticated
using (
  (select auth.uid()) = auth_user_id
);

create policy "Admins can manage clients"
on public.clients
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
