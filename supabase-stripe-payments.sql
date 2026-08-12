alter table public.payment_records
  add column if not exists processor text not null default 'manual';

alter table public.payment_records
  add column if not exists stripe_checkout_session_id text;

alter table public.payment_records
  add column if not exists stripe_payment_intent_id text;

alter table public.payment_records
  add column if not exists stripe_customer_id text;

alter table public.payment_records
  add column if not exists stripe_charge_id text;

alter table public.payment_records
  add column if not exists stripe_metadata jsonb;

alter table public.payment_records
  add column if not exists receipt_sent boolean not null default false;

alter table public.payment_records
  add column if not exists receipt_sent_at timestamptz;

alter table public.payment_records
  add column if not exists receipt_last_error text;

alter table public.payment_records
  add column if not exists updated_at timestamptz not null default now();

alter table public.payment_records
  drop constraint if exists payment_records_processor_check;

alter table public.payment_records
  add constraint payment_records_processor_check
  check (processor in ('manual', 'stripe'));

alter table public.payment_records
  drop constraint if exists payment_records_payment_method_check;

alter table public.payment_records
  add constraint payment_records_payment_method_check
  check (payment_method in ('manual', 'cash', 'bank_transfer', 'zelle', 'stripe', 'other'));

create table if not exists public.stripe_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.client_invoices(id) on delete cascade,
  session_id text,
  status text not null default 'pending'
    check (status in ('pending', 'created', 'paid', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_checkout_attempts enable row level security;

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists trg_payment_records_updated_at on public.payment_records;
create trigger trg_payment_records_updated_at
before update on public.payment_records
for each row
execute function public.set_updated_at();

drop trigger if exists trg_stripe_checkout_attempts_updated_at on public.stripe_checkout_attempts;
create trigger trg_stripe_checkout_attempts_updated_at
before update on public.stripe_checkout_attempts
for each row
execute function public.set_updated_at();

alter table public.stripe_webhook_events enable row level security;

create unique index if not exists stripe_checkout_attempts_one_active_invoice_idx
on public.stripe_checkout_attempts (invoice_id)
where status in ('pending', 'created');

create unique index if not exists payment_records_stripe_checkout_session_id_idx
on public.payment_records (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create unique index if not exists payment_records_stripe_payment_intent_id_idx
on public.payment_records (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

create index if not exists payment_records_external_reference_idx
on public.payment_records (external_reference);

create index if not exists payment_records_processor_idx
on public.payment_records (processor, created_at desc);

create index if not exists stripe_webhook_events_event_type_idx
on public.stripe_webhook_events (event_type, processed_at desc);
