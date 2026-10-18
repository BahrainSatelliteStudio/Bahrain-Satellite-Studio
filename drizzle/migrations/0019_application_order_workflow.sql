CREATE TABLE public.application_catalog (
 id text PRIMARY KEY, name text NOT NULL, enabled boolean NOT NULL DEFAULT true,
 templates jsonb NOT NULL DEFAULT '["classic","sidebar","cinema","sports","kids","minimal","experience"]',
 features jsonb NOT NULL DEFAULT '["servers","contact","notify","activation","backup","brand","themes"]',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.application_catalog TO authenticated;
GRANT ALL ON public.application_catalog TO service_role;
ALTER TABLE public.application_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON public.application_catalog FOR SELECT TO authenticated USING (enabled OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.application_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL,
 selection jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','review','quoted','approved','revision','rejected','provisioning','testing','delivered')),
 tenant_id uuid UNIQUE REFERENCES public.tenants(id), revision integer NOT NULL DEFAULT 1,
 delivery_check jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.application_orders TO authenticated;
GRANT ALL ON public.application_orders TO service_role;
ALTER TABLE public.application_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_read ON public.application_orders FOR SELECT TO authenticated USING (owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.application_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.application_orders(id), revision integer NOT NULL,
 selection jsonb NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), recurring text NOT NULL DEFAULT '',
 scope text NOT NULL, duration_days integer NOT NULL CHECK(duration_days>0), included_changes text NOT NULL,
 start_terms text NOT NULL, expires_at timestamptz NOT NULL, response text CHECK(response IN ('accepted','rejected','revision')),
 responded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,revision)
);
GRANT SELECT ON public.application_quotes TO authenticated;
GRANT ALL ON public.application_quotes TO service_role;
ALTER TABLE public.application_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_read ON public.application_quotes FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.application_orders o WHERE o.id=order_id AND (o.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TABLE public.application_order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.application_orders(id), actor_id uuid NOT NULL,
 action text NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.application_order_events TO authenticated;
GRANT ALL ON public.application_order_events TO service_role;
ALTER TABLE public.application_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_read ON public.application_order_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.application_orders o WHERE o.id=order_id AND (o.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE OR REPLACE FUNCTION public.order_workflow(_id uuid, _action text, _payload jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.application_orders; q public.application_quotes; c public.application_catalog; result uuid; admin boolean; choices jsonb; ft text; tid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
 admin := public.has_role(auth.uid(),'admin');
 IF _action='catalog' THEN
  IF NOT admin THEN RAISE EXCEPTION 'غير مسموح'; END IF;
  INSERT INTO public.application_catalog(id,name,enabled,templates,features) VALUES(_payload->>'id',_payload->>'name',(_payload->>'enabled')::boolean,_payload->'templates',_payload->'features') ON CONFLICT(id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled,templates=excluded.templates,features=excluded.features;
  RETURN NULL;
 END IF;
 IF _action='save' THEN
  choices := _payload->'selection';
  IF choices IS NULL OR (choices - ARRAY['catalog_id','name','logo','template','theme','features','contact']) <> '{}'::jsonb THEN RAISE EXCEPTION 'اختيارات الطلب غير صالحة'; END IF;
  SELECT * INTO c FROM public.application_catalog WHERE id=choices->>'catalog_id' AND enabled;
  IF c.id IS NULL OR NOT (c.templates ? (choices->>'template')) OR choices->>'theme' NOT IN ('bhsat','default','blue','cinema') THEN RAISE EXCEPTION 'التطبيق أو التصميم غير متاح'; END IF;
  IF jsonb_typeof(choices->'features') <> 'array' OR jsonb_array_length(choices->'features')>10 THEN RAISE EXCEPTION 'ميزات غير صالحة'; END IF;
  FOR ft IN SELECT jsonb_array_elements_text(choices->'features') LOOP
   IF NOT (c.features ? ft) OR ft NOT IN ('servers','contact','notify','activation','backup','brand','themes') THEN RAISE EXCEPTION 'ميزة غير متاحة'; END IF;
  END LOOP;
  IF length(trim(choices->>'name')) NOT BETWEEN 2 AND 60 OR length(choices->>'contact')>500 OR length(choices->>'logo')>3000000 OR choices->>'logo' NOT LIKE 'data:image/%;base64,%' THEN RAISE EXCEPTION 'تحقق من الاسم والشعار'; END IF;
  IF _id IS NULL THEN
   INSERT INTO public.application_orders(owner_id,selection) VALUES(auth.uid(),choices) RETURNING id INTO result;
  ELSE
   SELECT * INTO o FROM public.application_orders WHERE id=_id FOR UPDATE;
   IF o.owner_id<>auth.uid() OR o.id IS NULL OR o.status NOT IN ('draft','revision') THEN RAISE EXCEPTION 'لا يمكن تعديل هذا الطلب'; END IF;
   UPDATE public.application_orders SET selection=choices,status='draft',updated_at=now() WHERE id=_id; result:=_id;
  END IF;
 ELSE
  SELECT * INTO o FROM public.application_orders WHERE id=_id FOR UPDATE;
  IF o.id IS NULL OR (o.owner_id<>auth.uid() AND NOT admin) THEN RAISE EXCEPTION 'الطلب غير متاح'; END IF;
  result:=o.id;
  IF _action='submit' THEN
   IF o.owner_id<>auth.uid() OR o.status<>'draft' THEN RAISE EXCEPTION 'الطلب غير قابل للإرسال'; END IF;
   UPDATE public.application_orders SET status='submitted',updated_at=now() WHERE id=o.id;
  ELSIF _action='review' THEN
   IF NOT admin OR o.status NOT IN ('submitted','revision') THEN RAISE EXCEPTION 'انتقال غير مسموح'; END IF;
   UPDATE public.application_orders SET status='review',updated_at=now() WHERE id=o.id;
  ELSIF _action='quote' THEN
   IF NOT admin OR o.status NOT IN ('submitted','review','revision','quoted') THEN RAISE EXCEPTION 'لا يمكن تسعير الطلب'; END IF;
   INSERT INTO public.application_quotes(order_id,revision,selection,amount,currency,recurring,scope,duration_days,included_changes,start_terms,expires_at) VALUES(o.id,o.revision,o.selection,(_payload->>'amount')::numeric,_payload->>'currency',coalesce(_payload->>'recurring',''),_payload->>'scope',(_payload->>'duration_days')::integer,_payload->>'included_changes',_payload->>'start_terms',(_payload->>'expires_at')::timestamptz);
   IF (_payload->>'expires_at')::timestamptz<=now() THEN RAISE EXCEPTION 'العرض منتهي'; END IF;
   UPDATE public.application_orders SET status='quoted',revision=revision+1,updated_at=now() WHERE id=o.id;
  ELSIF _action IN ('accept','decline','revision') THEN
   IF o.owner_id<>auth.uid() OR o.status<>'quoted' THEN RAISE EXCEPTION 'لا يمكن الرد على العرض'; END IF;
   SELECT * INTO q FROM public.application_quotes WHERE order_id=o.id ORDER BY revision DESC LIMIT 1 FOR UPDATE;
   IF q.id<>(_payload->>'quote_id')::uuid OR q.response IS NOT NULL OR q.expires_at<=now() THEN RAISE EXCEPTION 'العرض غير صالح أو تم تحديثه'; END IF;
   UPDATE public.application_quotes SET response=CASE _action WHEN 'accept' THEN 'accepted' WHEN 'decline' THEN 'rejected' ELSE 'revision' END,responded_at=now() WHERE id=q.id;
   UPDATE public.application_orders SET status=CASE _action WHEN 'accept' THEN 'approved' WHEN 'decline' THEN 'rejected' ELSE 'revision' END,updated_at=now() WHERE id=o.id;
  ELSIF _action='provision' THEN
   IF NOT admin OR o.status<>'approved' OR o.tenant_id IS NOT NULL OR NOT coalesce((_payload->>'terms_met')::boolean,false) THEN RAISE EXCEPTION 'يلزم قبول العرض واستيفاء الشروط'; END IF;
   SELECT * INTO q FROM public.application_quotes WHERE order_id=o.id AND response='accepted' ORDER BY revision DESC LIMIT 1;
   IF q.id IS NULL THEN RAISE EXCEPTION 'لا يوجد عرض مقبول'; END IF;
   INSERT INTO public.tenants(slug,name,package_id,logo_url,theme,layout,features,owner_email,max_hosts) VALUES(_payload->>'slug',q.selection->>'name',_payload->>'package_id',q.selection->>'logo',q.selection->>'theme',jsonb_build_object('template',q.selection->>'template'),jsonb_build_object('workflow','order','selected',q.selection->'features','overrides',jsonb_build_object('servers',q.selection->'features' ? 'servers','contact',q.selection->'features' ? 'contact','notify',q.selection->'features' ? 'notify','backup',q.selection->'features' ? 'backup','brand',q.selection->'features' ? 'brand','themes',q.selection->'features' ? 'themes','builds',true,'subtitles',false,'downloads',false)),q.selection->>'contact',2) RETURNING id INTO tid;
   INSERT INTO public.tenant_members(tenant_id,user_id) VALUES(tid,o.owner_id);
   UPDATE public.application_orders SET tenant_id=tid,status='provisioning',updated_at=now() WHERE id=o.id;
  ELSIF _action='testing' THEN
   IF NOT admin OR o.status<>'provisioning' THEN RAISE EXCEPTION 'انتقال غير مسموح'; END IF;
   UPDATE public.application_orders SET status='testing',updated_at=now() WHERE id=o.id;
  ELSIF _action='deliver' THEN
   IF NOT admin OR o.status<>'testing' OR NOT coalesce((_payload->>'verified')::boolean,false) OR length(coalesce(_payload->>'note',''))<10 OR NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=o.tenant_id AND panel_url LIKE 'https://%') OR NOT EXISTS(SELECT 1 FROM public.builds WHERE tenant_id=o.tenant_id AND status='done' AND apk_url IS NOT NULL) THEN RAISE EXCEPTION 'يلزم إصدار جاهز وربط لوحة HTTPS وتوثيق اختبار التسليم'; END IF;
   UPDATE public.application_orders SET status='delivered',delivery_check=_payload,updated_at=now() WHERE id=o.id;
  ELSE RAISE EXCEPTION 'إجراء غير مسموح'; END IF;
 END IF;
 INSERT INTO public.application_order_events(order_id,actor_id,action,note) VALUES(result,auth.uid(),_action,left(coalesce(_payload->>'note',''),1000));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.order_workflow(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.order_workflow(uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.order_feature_allowed(_tenant uuid,_feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=_tenant AND (coalesce(t.features->>'workflow','')<>'order' OR (t.features->'selected' ? _feature)))
$$;
REVOKE ALL ON FUNCTION public.order_feature_allowed(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.order_feature_allowed(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_order_tenant() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND old.features->>'workflow'='order' THEN
  IF NOT EXISTS(SELECT 1 FROM public.application_orders WHERE tenant_id=old.id AND status='delivered') THEN RAISE EXCEPTION 'التطبيق قيد التجهيز'; END IF;
  new.name:=old.name; new.logo_url:=old.logo_url; new.banner_url:=old.banner_url; new.colors:=old.colors; new.theme:=old.theme; new.layout:=old.layout; new.min_version:=old.min_version; new.update_url:=old.update_url;
  IF NOT public.order_feature_allowed(old.id,'contact') THEN new.support_whatsapp:=old.support_whatsapp; new.support_telegram:=old.support_telegram; new.support_phone:=old.support_phone; new.support_email:=old.support_email; new.support_facebook:=old.support_facebook; new.support_website:=old.support_website; new.customer_notice:=old.customer_notice; END IF;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER order_tenant_guard BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.protect_order_tenant();
CREATE OR REPLACE FUNCTION public.guard_order_operational_feature() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tid uuid; f text;
BEGIN
 IF TG_OP='DELETE' THEN tid:=old.tenant_id; ELSE tid:=new.tenant_id; END IF;
 f:=CASE TG_TABLE_NAME WHEN 'tenant_sources' THEN 'servers' WHEN 'announcements' THEN 'notify' ELSE 'activation' END;
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.tenants WHERE id=tid AND features->>'workflow'='order') THEN
  IF NOT public.is_tenant_member(tid) OR NOT public.order_feature_allowed(tid,f) OR NOT EXISTS(SELECT 1 FROM public.application_orders WHERE tenant_id=tid AND status='delivered') THEN RAISE EXCEPTION 'الميزة غير متاحة لهذا التطبيق'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN old; ELSE RETURN new; END IF;
END $$;
CREATE TRIGGER order_sources_guard BEFORE INSERT OR UPDATE OR DELETE ON public.tenant_sources FOR EACH ROW EXECUTE FUNCTION public.guard_order_operational_feature();
CREATE TRIGGER order_announcements_guard BEFORE INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.guard_order_operational_feature();