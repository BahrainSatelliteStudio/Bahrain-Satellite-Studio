ALTER TABLE public.application_catalog
  ADD COLUMN source text NOT NULL DEFAULT 'internal',
  ADD COLUMN repo_url text,
  ADD COLUMN license text,
  ADD COLUMN status text NOT NULL DEFAULT 'ready';

CREATE TABLE public.app_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  catalog_id text REFERENCES public.application_catalog(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_themes TO authenticated;
GRANT ALL ON public.app_themes TO service_role;
ALTER TABLE public.app_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read enabled themes" ON public.app_themes FOR SELECT TO authenticated USING (enabled OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage themes" ON public.app_themes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_themes (key, name, colors, catalog_id) VALUES
  ('bhsat', 'Bahrain Satellite', '{"primary":"#FBBD23","background":"#14181F","surface":"#20242C","accent":"#DCA518","text":"#F5F5F5"}', NULL),
  ('default', 'الافتراضي', '{"primary":"#3B82F6","background":"#0F172A","surface":"#1E293B","accent":"#60A5FA","text":"#F8FAFC"}', NULL),
  ('blue', 'الأزرق', '{"primary":"#2563EB","background":"#0B1220","surface":"#172033","accent":"#38BDF8","text":"#EFF6FF"}', NULL),
  ('cinema', 'السينمائي', '{"primary":"#E11D48","background":"#0C0A09","surface":"#1C1917","accent":"#FB7185","text":"#FAFAF9"}', NULL);

INSERT INTO public.application_catalog (id, name, enabled, templates, features, source, repo_url, license, status) VALUES
  ('owntv', 'OwnTV — تلفاز', false, '["experience"]', '["servers","contact","notify","activation","backup","brand","themes"]', 'opensource', 'https://github.com/ahXN00/OwnTV', 'GPL-3.0', 'preparing'),
  ('quiblo', 'Quiblo — جوال وتلفاز', false, '["experience"]', '["servers","contact","notify","activation","backup","brand","themes"]', 'opensource', 'https://github.com/quiblo-iptv/quiblo-app', 'GPL-3.0', 'preparing'),
  ('wowiptv', 'WowIPTV — جوال', false, '["experience"]', '["servers","contact","backup","brand","themes"]', 'opensource', 'https://github.com/ljd1995/WowIPTV', 'MIT', 'preparing'),
  ('lumora', 'Lumora — أجهزة ضعيفة', false, '["experience"]', '["servers","contact","backup","brand","themes"]', 'opensource', 'https://github.com/disclosurez/Lumora', 'MIT', 'preparing');