create extension if not exists pgcrypto;

create table if not exists public.education_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.education_lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.education_categories (id) on delete restrict,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.education_lessons (id) on delete cascade,
  title text not null,
  resource_url text not null,
  resource_type text not null default 'pdf',
  created_at timestamptz not null default now()
);

comment on column public.lesson_resources.resource_url is 'Use only intentionally public or external URLs here; never private storage URLs from the document vault.';

create table if not exists public.client_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  lesson_id uuid not null references public.education_lessons (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_lesson_progress_unique unique (client_id, lesson_id)
);

alter table public.client_lesson_progress drop constraint if exists client_lesson_progress_completion_check;
alter table public.client_lesson_progress
add constraint client_lesson_progress_completion_check check (
  (completed = true and completed_at is not null)
  or
  (completed = false)
);

alter table public.education_categories enable row level security;
alter table public.education_lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.client_lesson_progress enable row level security;

create index if not exists education_lessons_published_idx on public.education_lessons (published, featured, sort_order, created_at desc);
create index if not exists education_lessons_category_idx on public.education_lessons (category_id, sort_order, created_at desc);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources (lesson_id);
create index if not exists client_lesson_progress_client_idx on public.client_lesson_progress (client_id, lesson_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create or replace function public.sync_client_lesson_progress_completion()
returns trigger
language plpgsql
as $$
begin
  if NEW.completed = false then
    NEW.completed_at = null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_education_categories_updated_at on public.education_categories;
create trigger trg_education_categories_updated_at
before update on public.education_categories
for each row
execute function public.set_updated_at();

drop trigger if exists trg_education_lessons_updated_at on public.education_lessons;
create trigger trg_education_lessons_updated_at
before update on public.education_lessons
for each row
execute function public.set_updated_at();

drop trigger if exists trg_client_lesson_progress_updated_at on public.client_lesson_progress;
create trigger trg_client_lesson_progress_updated_at
before update on public.client_lesson_progress
for each row
execute function public.set_updated_at();

drop trigger if exists trg_client_lesson_progress_completion_sync on public.client_lesson_progress;
create trigger trg_client_lesson_progress_completion_sync
before insert or update on public.client_lesson_progress
for each row
execute function public.sync_client_lesson_progress_completion();

drop policy if exists "Public can view published education categories" on public.education_categories;
create policy "Public can view published education categories"
on public.education_categories
for select
to authenticated, anon
using (true);

drop policy if exists "Public can view published education lessons" on public.education_lessons;
create policy "Public can view published education lessons"
on public.education_lessons
for select
to authenticated, anon
using (published = true);

drop policy if exists "Public can view published lesson resources" on public.lesson_resources;
create policy "Public can view published lesson resources"
on public.lesson_resources
for select
to authenticated, anon
using (
  lesson_id in (
    select id from public.education_lessons where published = true
  )
);

drop policy if exists "Admins can manage education categories" on public.education_categories;
create policy "Admins can manage education categories"
on public.education_categories
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

drop policy if exists "Admins can manage education lessons" on public.education_lessons;
create policy "Admins can manage education lessons"
on public.education_lessons
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

drop policy if exists "Admins can manage lesson resources" on public.lesson_resources;
create policy "Admins can manage lesson resources"
on public.lesson_resources
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

drop policy if exists "Clients can view own progress" on public.client_lesson_progress;
create policy "Clients can view own progress"
on public.client_lesson_progress
for select
to authenticated
using (
  client_id in (
    select c.id from public.clients c where c.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Clients can insert own progress" on public.client_lesson_progress;
create policy "Clients can insert own progress"
on public.client_lesson_progress
for insert
to authenticated
with check (
  client_id in (
    select c.id from public.clients c where c.auth_user_id = (select auth.uid())
  )
  and lesson_id in (
    select id from public.education_lessons where published = true
  )
);

drop policy if exists "Clients can update own progress" on public.client_lesson_progress;
create policy "Clients can update own progress"
on public.client_lesson_progress
for update
to authenticated
using (
  client_id in (
    select c.id from public.clients c where c.auth_user_id = (select auth.uid())
  )
)
with check (
  client_id in (
    select c.id from public.clients c where c.auth_user_id = (select auth.uid())
  )
  and lesson_id in (
    select id from public.education_lessons where published = true
  )
);

drop policy if exists "Admins can manage client lesson progress" on public.client_lesson_progress;
create policy "Admins can manage client lesson progress"
on public.client_lesson_progress
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);

insert into public.education_categories (name, slug, description, sort_order)
values
  ('Credit Basics', 'credit-basics', 'Foundational lessons for understanding credit and scoring.', 1),
  ('Debt Strategy', 'debt-strategy', 'Practical lessons for managing debt and improving cash flow.', 2),
  ('Business Credit', 'business-credit', 'Lessons for entrepreneurs building a stronger business credit profile.', 3),
  ('Financial Wellness', 'financial-wellness', 'Habits and systems for staying steady and informed.', 4)
on conflict (slug) do nothing;

insert into public.education_lessons (category_id, title, slug, excerpt, content, featured, published, sort_order)
select id, 'How Credit Scores Work', 'how-credit-scores-work', 'A simple guide to the factors that shape a credit score.', 'This lesson explains the main scoring factors, how reporting works, and why small habits can change your profile over time.', true, true, 1
from public.education_categories where slug = 'credit-basics'
on conflict (slug) do nothing;

insert into public.education_lessons (category_id, title, slug, excerpt, content, featured, published, sort_order)
select id, 'Building a Debt Payoff Plan', 'building-a-debt-payoff-plan', 'Learn how to create a realistic debt strategy without feeling stuck.', 'This lesson introduces a simple framework for prioritizing balances, reducing stress, and making progress you can sustain.', false, true, 1
from public.education_categories where slug = 'debt-strategy'
on conflict (slug) do nothing;
