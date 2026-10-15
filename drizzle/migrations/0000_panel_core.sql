create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role public.app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.servers (id uuid primary key default gen_random_uuid(), code text not null unique check (code ~ '^[0-9]{1,6}$'), name text not null, enabled boolean not null default true, activation_api_url text, sort_order int not null default 0, created_at timestamptz not null default now());
create table public.hosts (id uuid primary key default gen_random_uuid(), server_id uuid not null references public.servers(id) on delete cascade, url text not null, is_primary boolean not null default false, sort_order int not null default 0, created_at timestamptz not null default now());
create table public.app_settings (id int primary key default 1 check (id=1), app_name text not null default 'Bahrain Satellite', logo_url text, store_url text not null default 'https://bhsat.me/products', support_whatsapp text, support_phone text, support_telegram text, announcement text, config_version int not null default 1, updated_at timestamptz not null default now());
insert into public.app_settings(id) values (1);

grant select on public.servers, public.hosts, public.app_settings to anon, authenticated;
grant insert, update, delete on public.servers, public.hosts, public.app_settings to authenticated;
grant all on public.servers, public.hosts, public.app_settings to service_role;
alter table public.servers enable row level security;
alter table public.hosts enable row level security;
alter table public.app_settings enable row level security;
create policy "public read enabled servers" on public.servers for select using (enabled or public.has_role(auth.uid(),'admin'));
create policy "admin write servers" on public.servers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public read hosts" on public.hosts for select using (true);
create policy "admin write hosts" on public.hosts for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public read settings" on public.app_settings for select using (true);
create policy "admin write settings" on public.app_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.limit_hosts() returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.hosts where server_id=new.server_id) >= 8 then raise exception 'الحد الأقصى 8 هوستات لكل سيرفر'; end if;
  return new;
end $$;
create trigger hosts_limit before insert on public.hosts for each row execute function public.limit_hosts();
create or replace function public.limit_servers() returns trigger language plpgsql set search_path=public as $$
begin
  if (select count(*) from public.servers) >= 50 then raise exception 'الحد الأقصى 50 سيرفر'; end if;
  return new;
end $$;
create trigger servers_limit before insert on public.servers for each row execute function public.limit_servers();