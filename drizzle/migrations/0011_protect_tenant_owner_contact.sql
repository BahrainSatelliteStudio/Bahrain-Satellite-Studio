REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (id, slug, name, logo_url, primary_color, accent_color, package_id, enabled, support_whatsapp, support_telegram, support_phone, latest_version, min_version, update_url, created_at, theme, banner_url, colors, support_facebook, support_website, support_email, customer_notice, store_url, plan_name, subscription_expires_at, max_hosts, panel_url, features, layout) ON public.tenants TO anon;

CREATE OR REPLACE FUNCTION public.protect_tenant_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.plan_name := old.plan_name; new.subscription_expires_at := old.subscription_expires_at;
    new.max_hosts := old.max_hosts; new.enabled := old.enabled; new.package_id := old.package_id;
    new.slug := old.slug; new.latest_version := old.latest_version;
    new.features := old.features; new.panel_url := old.panel_url;
    new.owner_email := old.owner_email; new.owner_phone := old.owner_phone;
  end if;
  return new;
end $function$;