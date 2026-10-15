CREATE OR REPLACE FUNCTION public.protect_tenant_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.plan_name := old.plan_name; new.subscription_expires_at := old.subscription_expires_at;
    new.max_hosts := old.max_hosts; new.enabled := old.enabled; new.package_id := old.package_id;
    new.slug := old.slug; new.latest_version := old.latest_version;
  end if;
  return new;
end $$;
CREATE TRIGGER tenants_protect BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.protect_tenant_fields();