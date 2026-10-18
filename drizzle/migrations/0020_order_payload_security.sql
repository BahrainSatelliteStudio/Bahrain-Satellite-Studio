CREATE OR REPLACE FUNCTION public.validate_order_payload() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE c public.application_catalog; s jsonb; k text;
BEGIN
 s:=new.selection;
 IF s IS NULL OR jsonb_typeof(s)<>'object' OR (s-ARRAY['catalog_id','name','logo','template','theme','features','contact'])<>'{}'::jsonb OR NOT(s ?& ARRAY['catalog_id','name','logo','template','theme','features','contact']) THEN RAISE EXCEPTION 'اختيارات الطلب غير صالحة'; END IF;
 IF TG_OP='INSERT' OR new.selection IS DISTINCT FROM old.selection THEN
 SELECT * INTO c FROM public.application_catalog WHERE id=s->>'catalog_id' AND enabled;
 IF c.id IS NULL OR NOT(c.templates ? (s->>'template')) OR s->>'theme' NOT IN ('bhsat','default','blue','cinema') OR jsonb_typeof(s->'features')<>'array' OR length(trim(s->>'name')) NOT BETWEEN 2 AND 60 OR length(s->>'contact') NOT BETWEEN 3 AND 500 OR s->>'logo' !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' OR length(s->>'logo')>3000000 THEN RAISE EXCEPTION 'اختيارات غير متاحة'; END IF;
 FOR k IN SELECT jsonb_array_elements_text(s->'features') LOOP IF NOT(c.features ? k) THEN RAISE EXCEPTION 'ميزة غير متاحة'; END IF; END LOOP;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER validate_order_selection BEFORE INSERT OR UPDATE ON public.application_orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_payload();
CREATE OR REPLACE FUNCTION public.validate_quote_response() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' AND (new.expires_at<=now() OR length(new.scope)<5 OR length(new.start_terms)<3 OR length(new.included_changes)<2) THEN RAISE EXCEPTION 'عرض السعر غير مكتمل'; END IF;
 IF TG_OP='UPDATE' AND new.response IS DISTINCT FROM old.response AND (old.response IS NOT NULL OR old.expires_at<=now()) THEN RAISE EXCEPTION 'عرض السعر لم يعد صالحا'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER validate_quote_response BEFORE INSERT OR UPDATE ON public.application_quotes FOR EACH ROW EXECUTE FUNCTION public.validate_quote_response();
CREATE OR REPLACE FUNCTION public.guard_order_acceptance() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.status='approved' AND old.status IS DISTINCT FROM 'approved' AND NOT EXISTS(SELECT 1 FROM public.application_quotes WHERE order_id=new.id AND response='accepted' AND expires_at>now() AND revision=new.revision-1) THEN RAISE EXCEPTION 'يلزم قبول عرض السعر الحالي'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER validate_order_acceptance BEFORE UPDATE ON public.application_orders FOR EACH ROW EXECUTE FUNCTION public.guard_order_acceptance();
CREATE OR REPLACE FUNCTION public.guard_order_activation_feature() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tid uuid;
BEGIN
 IF TG_OP='DELETE' THEN tid:=old.tenant_id; ELSE tid:=new.tenant_id; END IF;
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND EXISTS(SELECT 1 FROM public.tenants WHERE id=tid AND features->>'workflow'='order') THEN
 IF NOT public.is_tenant_member(tid) OR NOT public.order_feature_allowed(tid,'activation') OR NOT EXISTS(SELECT 1 FROM public.application_orders WHERE tenant_id=tid AND status='delivered') THEN RAISE EXCEPTION 'أكواد التفعيل غير متاحة'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN old; ELSE RETURN new; END IF;
END $$;
CREATE TRIGGER order_activation_accounts_guard BEFORE INSERT OR UPDATE OR DELETE ON public.activation_accounts FOR EACH ROW EXECUTE FUNCTION public.guard_order_activation_feature();
CREATE TRIGGER order_activation_codes_guard BEFORE INSERT OR UPDATE OR DELETE ON public.activation_codes FOR EACH ROW EXECUTE FUNCTION public.guard_order_activation_feature();