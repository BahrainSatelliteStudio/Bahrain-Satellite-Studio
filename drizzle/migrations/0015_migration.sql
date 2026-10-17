create or replace function public.tenant_activation_count(_slug text)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from tenant_sources s join tenants t on t.id = s.tenant_id
  where t.slug = _slug and t.enabled and s.enabled and s.type = 'xtream' and coalesce(trim(s.activation_api_url),'') <> '';
$$;
grant execute on function public.tenant_activation_count(text) to anon, authenticated;