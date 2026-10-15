ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.protect_tenant_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.plan_name := old.plan_name; new.subscription_expires_at := old.subscription_expires_at;
    new.max_hosts := old.max_hosts; new.enabled := old.enabled; new.package_id := old.package_id;
    new.slug := old.slug; new.latest_version := old.latest_version;
    new.features := old.features; new.panel_url := old.panel_url;
  end if;
  return new;
end $$;