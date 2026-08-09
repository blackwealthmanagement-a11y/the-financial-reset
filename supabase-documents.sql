create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null,
  lead_id uuid not null,

  storage_path text not null unique,
  file_name text not null,
  original_file_name text not null,
  mime_type text not null,

  file_size bigint not null
    check (file_size >= 0 and file_size <= 5242880),

  category text not null
    check (
      category in (
        'identity',
        'proof_of_address',
        'credit_report',
        'income',
        'tax',
        'banking',
        'business',
        'agreement',
        'other'
      )
    ),

  status text not null default 'uploaded'
    check (
      status in (
        'uploaded',
        'reviewed',
        'approved',
        'rejected',
        'archived'
      )
    ),

  uploaded_by text not null
    check (uploaded_by in ('client', 'admin')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint client_documents_client_lead_fk
    foreign key (client_id, lead_id)
    references public.clients (id, lead_id)
    on delete cascade
);

create index if not exists client_documents_client_created_idx
on public.client_documents (client_id, created_at desc);

create index if not exists client_documents_lead_created_idx
on public.client_documents (lead_id, created_at desc);

create index if not exists client_documents_category_idx
on public.client_documents (category);

create index if not exists client_documents_status_idx
on public.client_documents (status);

alter table public.client_documents
enable row level security;

drop policy if exists "Clients can view own documents"
on public.client_documents;

drop policy if exists "Admins can view documents"
on public.client_documents;

drop policy if exists "Admins can insert documents"
on public.client_documents;

drop policy if exists "Admins can update documents"
on public.client_documents;

drop policy if exists "Admins can delete documents"
on public.client_documents;

create policy "Clients can view own documents"
on public.client_documents
for select
to authenticated
using (
  client_id in (
    select c.id
    from public.clients c
    where c.auth_user_id = (select auth.uid())
  )
);

create policy "Admins can view documents"
on public.client_documents
for select
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admins can insert documents"
on public.client_documents
for insert
to authenticated
with check (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admins can update documents"
on public.client_documents
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

create policy "Admins can delete documents"
on public.client_documents
for delete
to authenticated
using (
  (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'client-documents',
  'client-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clients can read own document files"
on storage.objects;

drop policy if exists "Admins can read document files"
on storage.objects;

drop policy if exists "Admins can insert document files"
on storage.objects;

drop policy if exists "Admins can update document files"
on storage.objects;

drop policy if exists "Admins can delete document files"
on storage.objects;

create policy "Clients can read own document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] in (
    select c.id::text
    from public.clients c
    where c.auth_user_id = (select auth.uid())
  )
);

create policy "Admins can read document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-documents'
  and (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admins can insert document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-documents'
  and (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admins can update document files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'client-documents'
  and (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  bucket_id = 'client-documents'
  and (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

create policy "Admins can delete document files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'client-documents'
  and (select auth.uid()) =
  '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);
