ALTER TABLE public.tenants DROP CONSTRAINT tenants_theme_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_theme_check CHECK (theme IN ('default','blue','cinema','bhsat'));