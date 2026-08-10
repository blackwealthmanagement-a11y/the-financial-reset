create extension if not exists pgcrypto;

create table if not exists public.education_learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  slug text not null unique,
  description text,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_path_lessons (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.education_learning_paths (id) on delete cascade,
  lesson_id uuid not null references public.education_lessons (id) on delete cascade,
  sort_order integer not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint learning_path_lessons_unique unique (learning_path_id, lesson_id)
);

create table if not exists public.client_learning_path_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  learning_path_id uuid not null references public.education_learning_paths (id) on delete cascade,
  percent_complete numeric(5,2) not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_learning_path_progress_unique unique (client_id, learning_path_id),
  constraint client_learning_path_progress_percent_complete_check check (percent_complete >= 0 and percent_complete <= 100)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_learning_path_progress_percent_complete_check'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.client_learning_path_progress
    add constraint client_learning_path_progress_percent_complete_check
    check (percent_complete >= 0 and percent_complete <= 100);
  end if;
end;
$$;

alter table public.education_learning_paths enable row level security;
alter table public.learning_path_lessons enable row level security;
alter table public.client_learning_path_progress enable row level security;

create index if not exists education_learning_paths_published_idx on public.education_learning_paths (published, featured, sort_order, created_at desc);
create index if not exists learning_path_lessons_path_idx on public.learning_path_lessons (learning_path_id, sort_order, lesson_id);
create index if not exists client_learning_path_progress_client_idx on public.client_learning_path_progress (client_id, learning_path_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create or replace function public.recalculate_client_learning_path_progress(
  p_client_id uuid,
  p_lesson_id uuid default null,
  p_learning_path_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  path_row record;
  lesson_count integer;
  completed_count integer;
  progress_percent numeric(5,2);
  existing_progress record;
begin
  for path_row in
    select distinct lpl.learning_path_id
    from public.learning_path_lessons lpl
    where (p_learning_path_id is null or lpl.learning_path_id = p_learning_path_id)
      and (p_lesson_id is null or lpl.lesson_id = p_lesson_id)
  loop
    select count(*) into lesson_count
    from public.learning_path_lessons lpl
    where lpl.learning_path_id = path_row.learning_path_id
      and lpl.required = true;

    if lesson_count > 0 then
      select count(*) into completed_count
      from public.learning_path_lessons lpl
      join public.client_lesson_progress clp
        on clp.lesson_id = lpl.lesson_id
       and clp.client_id = p_client_id
       and clp.completed = true
      where lpl.learning_path_id = path_row.learning_path_id
        and lpl.required = true;

      progress_percent := pg_catalog.round((completed_count::numeric / lesson_count::numeric) * 100, 2);
    else
      progress_percent := 0;
    end if;

    select * into existing_progress
    from public.client_learning_path_progress clpp
    where clpp.client_id = p_client_id
      and clpp.learning_path_id = path_row.learning_path_id
    limit 1;

    if existing_progress.id is null then
      insert into public.client_learning_path_progress (
        client_id,
        learning_path_id,
        percent_complete,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      values (
        p_client_id,
        path_row.learning_path_id,
        progress_percent,
        pg_catalog.now(),
        case when progress_percent >= 100 then pg_catalog.now() else null end,
        pg_catalog.now(),
        pg_catalog.now()
      );
    else
      update public.client_learning_path_progress
      set percent_complete = progress_percent,
          completed_at = case when progress_percent >= 100 then pg_catalog.coalesce(completed_at, pg_catalog.now()) else null end,
          updated_at = pg_catalog.now()
      where id = existing_progress.id;
    end if;
  end loop;
end;
$$;

create or replace function public.sync_client_learning_path_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recalculate_client_learning_path_progress(OLD.client_id, OLD.lesson_id);
    return OLD;
  end if;

  perform public.recalculate_client_learning_path_progress(NEW.client_id, NEW.lesson_id);
  return NEW;
end;
$$;

create or replace function public.sync_learning_path_lessons_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  path_id uuid;
  client_id uuid;
begin
  if TG_OP = 'DELETE' then
    path_id := OLD.learning_path_id;
  else
    path_id := NEW.learning_path_id;
  end if;

  for client_id in
    select distinct clp.client_id
    from public.client_lesson_progress clp
  loop
    perform public.recalculate_client_learning_path_progress(client_id, null, path_id);
  end loop;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_learning_paths_updated_at on public.education_learning_paths;
create trigger trg_learning_paths_updated_at
before update on public.education_learning_paths
for each row
execute function public.set_updated_at();

drop trigger if exists trg_client_lesson_progress_learning_path_sync on public.client_lesson_progress;
create trigger trg_client_lesson_progress_learning_path_sync
after insert or update or delete on public.client_lesson_progress
for each row
execute function public.sync_client_learning_path_progress();

drop trigger if exists trg_learning_path_lessons_progress_sync on public.learning_path_lessons;
create trigger trg_learning_path_lessons_progress_sync
after insert or update or delete on public.learning_path_lessons
for each row
execute function public.sync_learning_path_lessons_progress();

drop policy if exists "Public can view published learning paths" on public.education_learning_paths;
create policy "Public can view published learning paths"
on public.education_learning_paths
for select
to authenticated, anon
using (published = true);

drop policy if exists "Public can view published path lessons" on public.learning_path_lessons;
create policy "Public can view published path lessons"
on public.learning_path_lessons
for select
to authenticated, anon
using (
  learning_path_id in (
    select id from public.education_learning_paths where published = true
  )
  and lesson_id in (
    select id from public.education_lessons where published = true
  )
);

drop policy if exists "Clients can view own path progress" on public.client_learning_path_progress;
create policy "Clients can view own path progress"
on public.client_learning_path_progress
for select
to authenticated
using (
  client_id in (
    select c.id from public.clients c where c.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can manage learning paths" on public.education_learning_paths;
create policy "Admins can manage learning paths"
on public.education_learning_paths
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

drop policy if exists "Admins can manage path lessons" on public.learning_path_lessons;
create policy "Admins can manage path lessons"
on public.learning_path_lessons
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

drop policy if exists "Admins can manage client path progress" on public.client_learning_path_progress;
create policy "Admins can manage client path progress"
on public.client_learning_path_progress
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

revoke execute on function public.recalculate_client_learning_path_progress(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.sync_client_learning_path_progress() from public, anon, authenticated;
revoke execute on function public.sync_learning_path_lessons_progress() from public, anon, authenticated;

insert into public.education_learning_paths (title, slug, description, featured, published, sort_order)
values
  ('Personal Credit Education', 'personal-credit-education', 'A guided path for building confidence with credit basics, debt strategy, and practical next steps.', true, true, 1),
  ('Business Credit Guidance', 'business-credit-guidance', 'A structured path for entrepreneurs building stronger business credit habits.', false, true, 2),
  ('Financial Wellness', 'financial-wellness', 'A steady, practical path focused on habits and confidence.', false, true, 3),
  ('Home Buying Preparation', 'home-buying-preparation', 'A preparation-focused path for clients ready to take the next step toward homeownership.', false, true, 4),
  ('Entrepreneur Foundations', 'entrepreneur-foundations', 'A foundational path for business owners who want a clearer strategy.', false, true, 5)
on conflict (slug) do nothing;

insert into public.learning_path_lessons (learning_path_id, lesson_id, sort_order, required)
select p.id, l.id, 1, true
from public.education_learning_paths p
join public.education_lessons l on l.slug = 'how-credit-scores-work'
where p.slug = 'personal-credit-education'
on conflict (learning_path_id, lesson_id) do nothing;

insert into public.learning_path_lessons (learning_path_id, lesson_id, sort_order, required)
select p.id, l.id, 2, true
from public.education_learning_paths p
join public.education_lessons l on l.slug = 'building-a-debt-payoff-plan'
where p.slug = 'personal-credit-education'
on conflict (learning_path_id, lesson_id) do nothing;
