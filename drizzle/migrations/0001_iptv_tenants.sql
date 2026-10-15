create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  name text not null,
  logo_url text,
  primary_color text not null default '#e11d48',
  accent_color text not null default '#f59e0b',
  package_id text not null unique check (package_id ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  enabled boolean not null default true,
  support_whatsapp text,
  support_telegram text,
  support_phone text,
  latest_version text not null default '1.0.0',
  min_version text not null default '1.0.0',
  update_url text,
  created_at timestamptz not null default now()
);
create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  unique (tenant_id, user_id)
);
create table public.tenant_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type in ('xtream','m3u','mac')),
  name text not null,
  url text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  body text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.builds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version text not null,
  status text not null default 'queued' check (status in ('queued','building','done','failed')),
  apk_url text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create or replace function public.is_tenant_member(_tenant_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.has_role(auth.uid(),'admin') or exists(select 1 from public.tenant_members where tenant_id=_tenant_id and user_id=auth.uid())
$$;

grant select on public.tenants, public.tenant_sources, public.announcements, public.builds to anon;
grant select, insert, update, delete on public.tenants, public.tenant_members, public.tenant_sources, public.announcements, public.builds to authenticated;
grant all on public.tenants, public.tenant_members, public.tenant_sources, public.announcements, public.builds to service_role;

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_sources enable row level security;
alter table public.announcements enable row level security;
alter table public.builds enable row level security;

create policy "public read tenants" on public.tenants for select using (enabled or public.is_tenant_member(id));
create policy "admin insert tenants" on public.tenants for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "member update tenants" on public.tenants for update to authenticated using (public.is_tenant_member(id)) with check (public.is_tenant_member(id));
create policy "admin delete tenants" on public.tenants for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "read members" on public.tenant_members for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage members" on public.tenant_members for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "public read sources" on public.tenant_sources for select using (enabled or public.is_tenant_member(tenant_id));
create policy "member write sources" on public.tenant_sources for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "public read ann" on public.announcements for select using (active or public.is_tenant_member(tenant_id));
create policy "member write ann" on public.announcements for all to authenticated using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "public read done builds" on public.builds for select using (status='done' or public.is_tenant_member(tenant_id));
create policy "admin write builds" on public.builds for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "branding read" on storage.objects for select using (bucket_id in ('branding','apks'));
create policy "branding member upload" on storage.objects for insert to authenticated with check (bucket_id='branding' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
create policy "branding member update" on storage.objects for update to authenticated using (bucket_id='branding' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));

comment on table public.servers is 'DEPRECATED: replaced by tenant_sources';
comment on table public.hosts is 'DEPRECATED: replaced by tenant_sources';
comment on table public.app_settings is 'DEPRECATED: replaced by tenants';