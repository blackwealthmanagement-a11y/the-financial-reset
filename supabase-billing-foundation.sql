create extension if not exists pgcrypto;

create sequence if not exists public.tfr_invoice_number_seq start with 1 increment by 1;

do $$
begin
  grant usage, select on sequence public.tfr_invoice_number_seq to service_role;
exception
  when undefined_object then
    null;
end $$;

create or replace function public.generate_tfr_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if NEW.invoice_number is null or btrim(NEW.invoice_number) = '' then
    NEW.invoice_number := format(
      'TFR-%s-%s',
      to_char(current_date, 'YYYY'),
      lpad(nextval('public.tfr_invoice_number_seq')::text, 6, '0')
    );
  end if;

  return NEW;
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

create table if not exists public.billing_products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  service_type text not null,
  billing_type text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_products_service_type_check
    check (service_type in (
      'personal_credit_education',
      'business_credit_guidance',
      'consultation',
      'monthly_coaching'
    )),
  constraint billing_products_billing_type_check
    check (billing_type in ('one_time', 'monthly'))
);

create table if not exists public.client_invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  lead_id uuid not null,
  invoice_number text not null unique,
  status text not null default 'draft',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0 and discount_cents <= subtotal_cents),
  total_cents integer generated always as (subtotal_cents - discount_cents) stored,
  currency text not null default 'USD' check (currency = 'USD'),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_invoices_client_lead_fk
    foreign key (client_id, lead_id)
    references public.clients (id, lead_id)
    on delete cascade,
  constraint client_invoices_status_check
    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  constraint client_invoices_id_client_unique unique (id, client_id)
);

drop trigger if exists trg_generate_tfr_invoice_number on public.client_invoices;
create trigger trg_generate_tfr_invoice_number
before insert on public.client_invoices
for each row
execute function public.generate_tfr_invoice_number();

create trigger trg_billing_products_updated_at
before update on public.billing_products
for each row
execute function public.set_updated_at();

create trigger trg_client_invoices_updated_at
before update on public.client_invoices
for each row
execute function public.set_updated_at();

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  product_id uuid,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored,
  created_at timestamptz not null default now(),
  constraint invoice_items_invoice_fk
    foreign key (invoice_id)
    references public.client_invoices (id)
    on delete cascade,
  constraint invoice_items_product_fk
    foreign key (product_id)
    references public.billing_products (id)
    on delete set null
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  client_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  payment_method text not null default 'manual',
  status text not null default 'pending',
  external_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_records_invoice_client_fk
    foreign key (invoice_id, client_id)
    references public.client_invoices (id, client_id)
    on delete cascade,
  constraint payment_records_client_fk
    foreign key (client_id)
    references public.clients (id)
    on delete cascade,
  constraint payment_records_payment_method_check
    check (payment_method in ('manual', 'cash', 'bank_transfer', 'zelle', 'stripe', 'other')),
  constraint payment_records_status_check
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  constraint payment_records_paid_at_check
    check ((status = 'paid' and paid_at is not null) or status <> 'paid')
);

alter table public.billing_products enable row level security;
alter table public.client_invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payment_records enable row level security;

create index if not exists billing_products_active_idx on public.billing_products (active, name);
create index if not exists client_invoices_client_idx on public.client_invoices (client_id, lead_id);
create index if not exists client_invoices_client_created_idx on public.client_invoices (client_id, created_at desc);
create index if not exists client_invoices_status_due_idx on public.client_invoices (status, due_date);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists payment_records_invoice_idx on public.payment_records (invoice_id);
create index if not exists payment_records_client_created_idx on public.payment_records (client_id, created_at desc);

drop policy if exists "Admins can manage billing products" on public.billing_products;
create policy "Admins can manage billing products"
on public.billing_products
for all
to authenticated
using (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

drop policy if exists "Clients can view own invoices" on public.client_invoices;
create policy "Clients can view own invoices"
on public.client_invoices
for select
to authenticated
using (
  client_id in (
    select c.id
    from public.clients c
    where c.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can manage invoices" on public.client_invoices;
create policy "Admins can manage invoices"
on public.client_invoices
for all
to authenticated
using (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

drop policy if exists "Clients can view invoice items for own invoices" on public.invoice_items;
create policy "Clients can view invoice items for own invoices"
on public.invoice_items
for select
to authenticated
using (
  invoice_id in (
    select i.id
    from public.client_invoices i
    where i.client_id in (
      select c.id
      from public.clients c
      where c.auth_user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Admins can manage invoice items" on public.invoice_items;
create policy "Admins can manage invoice items"
on public.invoice_items
for all
to authenticated
using (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

drop policy if exists "Clients can view own payments" on public.payment_records;
create policy "Clients can view own payments"
on public.payment_records
for select
to authenticated
using (
  client_id in (
    select c.id
    from public.clients c
    where c.auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can manage payment records" on public.payment_records;
create policy "Admins can manage payment records"
on public.payment_records
for all
to authenticated
using (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
)
with check (
  (select auth.uid()) = '61058da7-5a59-46c7-a115-ad74eec69213'::uuid
);

insert into public.billing_products (name, description, service_type, billing_type, price_cents, currency, active)
values
  ('Personal Credit Education', 'Core personal credit education service.', 'personal_credit_education', 'one_time', 0, 'USD', true),
  ('Business Credit Guidance', 'Business credit guidance support.', 'business_credit_guidance', 'one_time', 0, 'USD', true),
  ('One-Time Consultation', 'One-time consultation.', 'consultation', 'one_time', 0, 'USD', true),
  ('Monthly Coaching & Education', 'Ongoing monthly coaching and education.', 'monthly_coaching', 'monthly', 0, 'USD', true)
on conflict (name) do nothing;
