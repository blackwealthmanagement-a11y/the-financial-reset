-- Manual Supabase setup for the internal CRM dashboard

-- 1) Enable RLS for the intake_submissions table.
alter table public.intake_submissions enable row level security;

-- 2) Remove older versions so the script can be safely run again.
drop policy if exists "Authenticated admins can view intake submissions"
on public.intake_submissions;

drop policy if exists "Authenticated admins can update intake submissions"
on public.intake_submissions;

drop policy if exists "Admin can view intake submissions"
on public.intake_submissions;

drop policy if exists "Admin can update intake submissions"
on public.intake_submissions;

-- 3) Allow only your administrator account to view CRM rows.
create policy "Admin can view intake submissions"
on public.intake_submissions
for select
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

-- 4) Allow only your administrator account to update CRM rows.
create policy "Admin can update intake submissions"
on public.intake_submissions
for update
using (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  auth.uid() = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
