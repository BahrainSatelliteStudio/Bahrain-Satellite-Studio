CREATE TABLE public.homepage_settings (id text PRIMARY KEY DEFAULT 'home', content jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT homepage_singleton CHECK (id = 'home'));
GRANT SELECT ON public.homepage_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.homepage_settings TO authenticated;
GRANT ALL ON public.homepage_settings TO service_role;
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public homepage read" ON public.homepage_settings FOR SELECT TO anon, authenticated USING (id = 'home');
CREATE POLICY "Admin homepage insert" ON public.homepage_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin homepage update" ON public.homepage_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));