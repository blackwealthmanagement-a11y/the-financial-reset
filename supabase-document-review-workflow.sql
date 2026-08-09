alter table public.client_documents
add column if not exists rejection_reason text;

create table if not exists public.client_document_requirements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  lead_id uuid not null,
  category text not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_document_requirements_category_check
    check (category in (
      'identity',
      'proof_of_address',
      'credit_report',
      'income',
      'tax',
      'banking',
      'business',
      'agreement',
      'other'
    )),
  constraint client_document_requirements_client_lead_fk
    foreign key (client_id, lead_id)
    references public.clients (id, lead_id)
    on delete cascade,
  constraint client_document_requirements_unique_category
    unique (client_id, category)
);

create index if not exists client_document_requirements_client_category_idx
on public.client_document_requirements (client_id, category);

create index if not exists client_document_requirements_client_idx
on public.client_document_requirements (client_id);

create index if not exists client_document_requirements_lead_idx
on public.client_document_requirements (lead_id);

alter table public.client_document_requirements
enable row level security;

drop policy if exists "Clients can select own document requirements" on public.client_document_requirements;
drop policy if exists "Admins can manage document requirements" on public.client_document_requirements;

drop policy if exists "Clients can insert document requirements" on public.client_document_requirements;
drop policy if exists "Clients can update document requirements" on public.client_document_requirements;
drop policy if exists "Clients can delete document requirements" on public.client_document_requirements;

drop policy if exists "Anonymous cannot access document requirements" on public.client_document_requirements;

create policy "Clients can select own document requirements"
on public.client_document_requirements
for select
to authenticated
using (
  client_id in (
    select c.id
    from public.clients c
    where c.auth_user_id = (select auth.uid())
  )
);

create policy "Admins can manage document requirements"
on public.client_document_requirements
for all
to authenticated
using (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
