create table public.firebase_settings (
  id text primary key default 'main' check (id = 'main'),
  service_account jsonb not null,
  project_id text not null,
  client_email text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.firebase_settings enable row level security;
revoke all on public.firebase_settings from anon, authenticated;
grant all on public.firebase_settings to service_role;

create table public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  title text not null,
  body text not null,
  status text not null,
  error text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.push_notifications enable row level security;
revoke all on public.push_notifications from anon, authenticated;
grant all on public.push_notifications to service_role;