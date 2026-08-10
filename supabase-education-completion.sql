create table if not exists public.education_path_completion_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  client_id uuid not null references public.clients (id) on delete cascade,
  learning_path_id uuid not null references public.education_learning_paths (id) on delete cascade,
  completed_at timestamptz not null default now(),
  email_sent boolean not null default false,
  activity_logged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.education_path_completion_events enable row level security;

create index if not exists education_path_completion_events_client_idx on public.education_path_completion_events (client_id, learning_path_id, completed_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'education_path_completion_events_client_learning_path_key'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.education_path_completion_events
    add constraint education_path_completion_events_client_learning_path_key unique (client_id, learning_path_id);
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists trg_education_path_completion_events_updated_at on public.education_path_completion_events;
create trigger trg_education_path_completion_events_updated_at
before update on public.education_path_completion_events
for each row
execute function public.set_updated_at();

drop policy if exists "Clients can view own completion events" on public.education_path_completion_events;
create policy "Clients can view own completion events"
on public.education_path_completion_events
for select
to authenticated
using (
  client_id in (
    select c.id from public.clients c where c.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can manage completion events" on public.education_path_completion_events;
create policy "Admins can manage completion events"
on public.education_path_completion_events
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);
