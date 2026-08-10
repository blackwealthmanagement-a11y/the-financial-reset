create extension if not exists pgcrypto;

alter table public.education_lessons
add column if not exists reading_time_minutes integer,
add column if not exists difficulty text,
add column if not exists lesson_type text,
add column if not exists key_takeaways text[],
add column if not exists action_steps text[],
add column if not exists featured_image_url text,
add column if not exists video_url text;

alter table public.education_lessons drop constraint if exists education_lessons_reading_time_check;
alter table public.education_lessons
add constraint education_lessons_reading_time_check
check (reading_time_minutes is null or reading_time_minutes >= 1);

alter table public.education_lessons drop constraint if exists education_lessons_difficulty_check;
alter table public.education_lessons
add constraint education_lessons_difficulty_check
check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced'));

alter table public.education_lessons drop constraint if exists education_lessons_lesson_type_check;
alter table public.education_lessons
add constraint education_lessons_lesson_type_check
check (lesson_type is null or lesson_type in ('article', 'guide', 'checklist', 'video', 'worksheet'));

comment on column public.education_lessons.featured_image_url is 'Use only public or external image URLs here; never private storage URLs.';
comment on column public.education_lessons.video_url is 'Use only public or external video URLs here; never private storage URLs.';

create table if not exists public.education_lesson_relations (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.education_lessons (id) on delete cascade,
  related_lesson_id uuid not null references public.education_lessons (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint education_lesson_relations_self_check check (lesson_id <> related_lesson_id),
  constraint education_lesson_relations_unique unique (lesson_id, related_lesson_id)
);

alter table public.education_lesson_relations enable row level security;

create index if not exists education_lesson_relations_lesson_idx on public.education_lesson_relations (lesson_id, sort_order, created_at desc);
create index if not exists education_lesson_relations_related_idx on public.education_lesson_relations (related_lesson_id);

drop policy if exists "Public can view published lesson relations" on public.education_lesson_relations;
create policy "Public can view published lesson relations"
on public.education_lesson_relations
for select
to authenticated, anon
using (
  lesson_id in (
    select id from public.education_lessons where published = true
  )
  and related_lesson_id in (
    select id from public.education_lessons where published = true
  )
);

drop policy if exists "Clients can view published lesson relations" on public.education_lesson_relations;
create policy "Clients can view published lesson relations"
on public.education_lesson_relations
for select
to authenticated
using (
  lesson_id in (
    select id from public.education_lessons where published = true
  )
  and related_lesson_id in (
    select id from public.education_lessons where published = true
  )
);

drop policy if exists "Admins can manage lesson relations" on public.education_lesson_relations;
create policy "Admins can manage lesson relations"
on public.education_lesson_relations
for all
to authenticated
using ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid)
with check ((select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid);
