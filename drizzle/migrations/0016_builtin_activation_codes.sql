CREATE TABLE public.activation_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES public.tenant_sources(id) ON DELETE CASCADE,
 label text NOT NULL, mode text NOT NULL CHECK (mode IN ('individual','shared')), username text NOT NULL, password text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_accounts TO authenticated;
GRANT ALL ON public.activation_accounts TO service_role;
ALTER TABLE public.activation_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_member ON public.activation_accounts FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));
CREATE TABLE public.activation_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 account_id uuid NOT NULL, code_hash text NOT NULL UNIQUE, code_hint text NOT NULL,
 enabled boolean NOT NULL DEFAULT true, device_id text, activated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(account_id,tenant_id) REFERENCES public.activation_accounts(id,tenant_id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_codes TO authenticated;
GRANT ALL ON public.activation_codes TO service_role;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY code_member ON public.activation_codes FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));
CREATE TABLE public.activation_attempts (
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, device_id text NOT NULL,
 window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0, PRIMARY KEY(tenant_id,device_id)
);
GRANT ALL ON public.activation_attempts TO service_role;
ALTER TABLE public.activation_attempts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.redeem_builtin_code(_slug text, _hash text, _device text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid uuid; c public.activation_codes; a public.activation_accounts; tries integer;
BEGIN
 SELECT id INTO tid FROM public.tenants WHERE slug=_slug AND enabled;
 IF tid IS NULL THEN RETURN jsonb_build_object('error','التطبيق غير موجود'); END IF;
 INSERT INTO public.activation_attempts(tenant_id,device_id,attempts) VALUES(tid,_device,1)
 ON CONFLICT(tenant_id,device_id) DO UPDATE SET
 attempts=CASE WHEN activation_attempts.window_start < now()-interval '1 minute' THEN 1 ELSE activation_attempts.attempts+1 END,
 window_start=CASE WHEN activation_attempts.window_start < now()-interval '1 minute' THEN now() ELSE activation_attempts.window_start END
 RETURNING attempts INTO tries;
 IF tries>10 THEN RETURN jsonb_build_object('error','محاولات كثيرة، انتظر دقيقة'); END IF;
 SELECT * INTO c FROM public.activation_codes WHERE tenant_id=tid AND code_hash=_hash FOR UPDATE;
 IF NOT FOUND OR NOT c.enabled THEN RETURN jsonb_build_object('error','رمز التفعيل غير صحيح أو موقوف'); END IF;
 IF c.device_id IS NOT NULL AND c.device_id<>_device THEN RETURN jsonb_build_object('error','الرمز مرتبط بجهاز آخر'); END IF;
 SELECT aa.* INTO a FROM public.activation_accounts aa JOIN public.tenant_sources s ON s.id=aa.source_id AND s.tenant_id=aa.tenant_id
 WHERE aa.id=c.account_id AND aa.tenant_id=tid AND s.enabled AND s.type='xtream';
 IF NOT FOUND THEN RETURN jsonb_build_object('error','السيرفر غير متاح'); END IF;
 UPDATE public.activation_codes SET device_id=_device, activated_at=coalesce(activated_at,now()) WHERE id=c.id;
 RETURN jsonb_build_object('sourceId',a.source_id,'username',a.username,'password',a.password);
END $$;
REVOKE ALL ON FUNCTION public.redeem_builtin_code(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_builtin_code(text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.tenant_activation_count(_slug text) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (SELECT count(*) FROM public.tenant_sources s JOIN public.tenants t ON t.id=s.tenant_id WHERE t.slug=_slug AND t.enabled AND s.enabled AND s.type='xtream' AND coalesce(trim(s.activation_api_url),'')<>'')::int
 + (SELECT count(*) FROM public.activation_codes c JOIN public.tenants t ON t.id=c.tenant_id JOIN public.activation_accounts a ON a.id=c.account_id JOIN public.tenant_sources s ON s.id=a.source_id WHERE t.slug=_slug AND t.enabled AND c.enabled AND s.enabled AND s.type='xtream')::int;
$$;