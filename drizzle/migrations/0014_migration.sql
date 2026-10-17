create table public.activation_receipts (
  id text primary key,
  tenant_id uuid not null,
  source_id uuid not null,
  username text not null,
  password text not null,
  created_at timestamptz not null default now()
);
alter table public.activation_receipts enable row level security;
revoke all on public.activation_receipts from anon, authenticated;
grant all on public.activation_receipts to service_role;