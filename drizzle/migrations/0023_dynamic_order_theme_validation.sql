-- Preserve workflow permissions and transitions; replace only the obsolete theme lists.
DO $migration$
DECLARE definition text; updated text;
BEGIN
 SELECT pg_get_functiondef('public.order_workflow(uuid,text,jsonb)'::regprocedure) INTO definition;
 updated := replace(definition,
  'choices->>''theme'' NOT IN (''bhsat'',''default'',''blue'',''cinema'')',
  'NOT EXISTS (SELECT 1 FROM public.app_themes t WHERE t.key=choices->>''theme'' AND t.enabled AND (t.catalog_id IS NULL OR t.catalog_id=choices->>''catalog_id''))');
 IF updated=definition THEN RAISE EXCEPTION 'Expected order workflow theme validation not found'; END IF;
 EXECUTE updated;
 SELECT pg_get_functiondef('public.validate_order_payload()'::regprocedure) INTO definition;
 updated := replace(definition,
  's->>''theme'' NOT IN (''bhsat'',''default'',''blue'',''cinema'')',
  'NOT EXISTS (SELECT 1 FROM public.app_themes t WHERE t.key=s->>''theme'' AND t.enabled AND (t.catalog_id IS NULL OR t.catalog_id=s->>''catalog_id''))');
 IF updated=definition THEN RAISE EXCEPTION 'Expected order selection theme validation not found'; END IF;
 EXECUTE updated;
END
$migration$;

-- Widen accepted keys without changing existing tenant identities or theme values.
ALTER TABLE public.tenants DROP CONSTRAINT tenants_theme_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_theme_check CHECK (theme ~ '^[a-z0-9-]{2,40}$');
COMMENT ON CONSTRAINT tenants_theme_check ON public.tenants IS 'Theme key format; order availability and catalog compatibility are checked against app_themes when saving selections.';