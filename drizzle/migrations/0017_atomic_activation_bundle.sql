CREATE OR REPLACE FUNCTION public.create_activation_bundle(_tenant uuid,_source uuid,_mode text,_label text,_username text,_password text,_account uuid,_codes jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE aid uuid; item jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_tenant_member(_tenant) THEN RAISE EXCEPTION 'لا تملك صلاحية إدارة الأكواد'; END IF;
 IF _mode NOT IN ('individual','shared') OR jsonb_typeof(_codes)<>'array' OR jsonb_array_length(_codes) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'بيانات الأكواد غير صالحة'; END IF;
 IF _mode='individual' AND (jsonb_array_length(_codes)<>1 OR _account IS NOT NULL) THEN RAISE EXCEPTION 'الحساب المستقل له كود واحد فقط'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.tenant_sources WHERE id=_source AND tenant_id=_tenant AND enabled AND type='xtream') THEN RAISE EXCEPTION 'اختر سيرفر بث مفعّلًا'; END IF;
 IF _account IS NOT NULL THEN
 SELECT id INTO aid FROM public.activation_accounts WHERE id=_account AND tenant_id=_tenant AND mode='shared' AND source_id=_source FOR UPDATE;
 IF aid IS NULL THEN RAISE EXCEPTION 'الحساب المشترك غير موجود'; END IF;
 ELSE
 IF length(trim(_label)) NOT BETWEEN 1 AND 80 OR length(trim(_username)) NOT BETWEEN 1 AND 100 OR length(_password) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'أدخل بيانات الحساب'; END IF;
 INSERT INTO public.activation_accounts(tenant_id,source_id,label,mode,username,password) VALUES(_tenant,_source,_label,_mode,_username,_password) RETURNING id INTO aid;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_codes) LOOP
 IF (item->>'hash') IS NULL OR (item->>'hash') !~ '^[a-f0-9]{64}$' OR length(coalesce(item->>'hint',''))<>6 THEN RAISE EXCEPTION 'رمز غير صالح'; END IF;
 INSERT INTO public.activation_codes(tenant_id,account_id,code_hash,code_hint) VALUES(_tenant,aid,item->>'hash',item->>'hint');
 END LOOP;
 RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.create_activation_bundle(uuid,uuid,text,text,text,text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_activation_bundle(uuid,uuid,text,text,text,text,uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.validate_activation_account() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.tenant_sources WHERE id=NEW.source_id AND tenant_id=NEW.tenant_id AND type='xtream') THEN RAISE EXCEPTION 'السيرفر لا يتبع هذا التطبيق'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_activation_account BEFORE INSERT OR UPDATE ON public.activation_accounts FOR EACH ROW EXECUTE FUNCTION public.validate_activation_account();
CREATE OR REPLACE FUNCTION public.validate_individual_code() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE m text;
BEGIN
 SELECT mode INTO m FROM public.activation_accounts WHERE id=NEW.account_id AND tenant_id=NEW.tenant_id FOR UPDATE;
 IF m='individual' AND EXISTS(SELECT 1 FROM public.activation_codes WHERE account_id=NEW.account_id AND id<>NEW.id) THEN RAISE EXCEPTION 'الحساب المستقل له كود واحد فقط'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_individual_code BEFORE INSERT OR UPDATE ON public.activation_codes FOR EACH ROW EXECUTE FUNCTION public.validate_individual_code();