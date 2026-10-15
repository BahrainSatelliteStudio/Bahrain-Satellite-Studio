ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS support_facebook text,
  ADD COLUMN IF NOT EXISTS support_website text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS customer_notice text,
  ADD COLUMN IF NOT EXISTS store_url text,
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'باقة شهرية',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_hosts integer NOT NULL DEFAULT 40;

ALTER TABLE public.tenant_sources
  ADD COLUMN IF NOT EXISTS login_code text,
  ADD COLUMN IF NOT EXISTS backup_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS activation_api_url text,
  ADD COLUMN IF NOT EXISTS last_check_ok boolean,
  ADD COLUMN IF NOT EXISTS last_check_at timestamptz;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE TABLE public.tenant_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  section text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tenant_changes TO authenticated;
GRANT ALL ON public.tenant_changes TO service_role;
ALTER TABLE public.tenant_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member read changes" ON public.tenant_changes FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "member add changes" ON public.tenant_changes FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id) AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.limit_tenant_hosts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare used int; mx int;
begin
  if array_length(new.backup_urls,1) > 7 then raise exception 'الحد الأقصى 7 هوستات احتياطية'; end if;
  select max_hosts into mx from public.tenants where id = new.tenant_id;
  select coalesce(sum(1 + coalesce(array_length(backup_urls,1),0)),0) into used
    from public.tenant_sources where tenant_id = new.tenant_id and id <> new.id;
  if used + 1 + coalesce(array_length(new.backup_urls,1),0) > mx then raise exception 'تجاوزت الحد المسموح من الهوستات (%)', mx; end if;
  return new;
end $$;
CREATE TRIGGER tenant_hosts_limit BEFORE INSERT OR UPDATE ON public.tenant_sources FOR EACH ROW EXECUTE FUNCTION public.limit_tenant_hosts();