-- CRM email center migration
create table if not exists public.crm_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  subject text not null,
  html text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_email_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null
    references public.intake_submissions(id)
    on delete cascade,
  template_id uuid
    references public.crm_email_templates(id)
    on delete set null,
  recipient text not null,
  subject text not null,
  resend_message_id text,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by text,
  send_request_id uuid not null unique
);

create index if not exists crm_email_history_lead_sent_idx
on public.crm_email_history (lead_id, sent_at desc);

alter table public.crm_email_templates enable row level security;
alter table public.crm_email_history enable row level security;

drop policy if exists "Admin can view email templates"
on public.crm_email_templates;

drop policy if exists "Admin can insert email templates"
on public.crm_email_templates;

drop policy if exists "Admin can update email templates"
on public.crm_email_templates;

drop policy if exists "Admin can delete email templates"
on public.crm_email_templates;

drop policy if exists "Admin can view email history"
on public.crm_email_history;

drop policy if exists "Admin can insert email history"
on public.crm_email_history;

drop policy if exists "Admin can update email history"
on public.crm_email_history;

drop policy if exists "Admin can delete email history"
on public.crm_email_history;

create policy "Admin can view email templates"
on public.crm_email_templates
for select
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can insert email templates"
on public.crm_email_templates
for insert
to authenticated
with check (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can update email templates"
on public.crm_email_templates
for update
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can delete email templates"
on public.crm_email_templates
for delete
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can view email history"
on public.crm_email_history
for select
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admin can insert email history"
on public.crm_email_history
for insert
to authenticated
with check (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

insert into public.crm_email_templates
  (name, category, subject, html, active)
values
  (
    'Welcome',
    'Onboarding',
    'Welcome to The Financial Reset',
    '<p>Hello {{first_name}},</p><p>Welcome to The Financial Reset. We are excited to support your next steps.</p>',
    true
  ),
  (
    'Consultation Reminder',
    'Consultation',
    'Reminder: your consultation is upcoming',
    '<p>Hello {{first_name}},</p><p>This is a reminder that your consultation is scheduled for {{consultation_date}}.</p>',
    true
  ),
  (
    'Missed Consultation',
    'Consultation',
    'We missed you at your consultation',
    '<p>Hello {{first_name}},</p><p>We noticed your consultation for {{consultation_date}} was not completed. We would love to reconnect.</p>',
    true
  ),
  (
    'Pricing & Enrollment',
    'Enrollment',
    'Pricing and enrollment details',
    '<p>Hello {{first_name}},</p><p>Here are the next steps for your service interest in {{service_interest}}.</p>',
    true
  ),
  (
    'Waiting on Client',
    'Follow-up',
    'We are still waiting to hear from you',
    '<p>Hello {{first_name}},</p><p>We are following up regarding your consultation and would love to reconnect before {{follow_up_date}}.</p>',
    true
  ),
  (
    'Welcome After Enrollment',
    'Onboarding',
    'Welcome aboard',
    '<p>Hello {{first_name}},</p><p>Welcome after enrollment. Your consultation outcome was {{consultation_outcome}}.</p>',
    true
  )
on conflict (name) do nothing;
