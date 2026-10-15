ALTER TABLE public.tenants ADD COLUMN panel_url TEXT;
COMMENT ON COLUMN public.tenants.panel_url IS 'رابط لوحة الزبون المستقلة (selfhost) — التطبيق يقرأ إعداداته منها عند توفرها';