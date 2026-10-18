import { ActivationCodesPanel } from "@/components/ActivationCodesPanel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolveFeatures, type FeatureKey } from "@/lib/features";
import { signOut, useMe } from "@/lib/me";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  DatabaseBackup,
  ExternalLink,
  History,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Package,
  Palette,
  Phone,
  Server,
  ShieldCheck,
  Smartphone,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Backup } from "@/features/tenant-management/BackupPanel";
import { Brand } from "@/features/tenant-management/BrandPanel";
import { Builds } from "@/features/tenant-management/BuildsPanel";
import { Changes } from "@/features/tenant-management/ChangesPanel";
import { Contact } from "@/features/tenant-management/ContactPanel";
import { Home } from "@/features/tenant-management/HomePanel";
import { LayoutEditor } from "@/features/tenant-management/LayoutPanel";
import { Notify } from "@/features/tenant-management/NotificationsPanel";
import { Security } from "@/features/tenant-management/SecurityPanel";
import { Servers } from "@/features/tenant-management/ServersPanel";
import { type Sec } from "@/features/tenant-management/shared";
import { Studio } from "@/features/tenant-management/StudioPanel";
export const Route = createFileRoute("/_authenticated/t/$tenantId")({
  validateSearch: (search: Record<string, unknown>): { section?: "studio" | "builds" } =>
    search["section"] === "studio" || search["section"] === "builds"
      ? { section: search["section"] }
      : {},
  head: () => ({
    meta: [
      { title: "لوحة إدارة التطبيق" },
      { name: "description", content: "تحكم بالسيرفرات والهوية والتواصل والإشعارات لتطبيقك" },
      { property: "og:title", content: "لوحة إدارة التطبيق" },
      {
        property: "og:description",
        content: "تحكم بالسيرفرات والهوية والتواصل والإشعارات لتطبيقك",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Panel,
});

const SECTIONS = [
  ["home", "الرئيسية", LayoutDashboard],
  ["studio", "استوديو التطبيق والمحاكاة", Wand2],
  ["servers", "السيرفرات والهوستات", Server],
  ["brand", "هوية التطبيق والألوان", Palette],
  ["layout", "تصميم وأقسام التطبيق", LayoutTemplate],
  ["activation", "أكواد التفعيل", ShieldCheck],
  ["contact", "روابط التواصل والدعم", Phone],
  ["notify", "الإشعارات الجماعية", Bell],
  ["builds", "الإصدارات والتحديثات", Package],
  ["changes", "سجل التغييرات", History],
  ["backup", "النسخ الاحتياطي", DatabaseBackup],
  ["security", "أمان حسابي", ShieldCheck],
] as const;

function Panel() {
  const { tenantId } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const nav = Route.useNavigate();
  const search = Route.useSearch();
  const [sec, setSec] = useState<Sec>(search.section ?? "home");
  useEffect(() => {
    setSec(search.section ?? "home");
  }, [search.section]);
  const [open, setOpen] = useState(false);
  const access = useQuery({
    queryKey: ["tenant-access", tenantId, me.data?.uid],
    enabled: !!me.data,
    queryFn: async () => {
      if (me.data?.isAdmin) return true;
      const { data, error } = await supabase
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", me.data?.uid ?? "")
        .limit(1);
      if (error) throw error;
      return !!data?.length;
    },
  });
  const tq = useQuery({
    queryKey: ["tenant", tenantId, me.data?.uid],
    enabled: access.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  if (access.data === false || access.error || me.error)
    return (
      <main className="theme-bhsat min-h-screen bg-background p-10 text-center">
        <h1 className="text-2xl font-bold">لا تملك صلاحية الدخول إلى هذا التطبيق</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard">العودة إلى تطبيقاتي</Link>
        </Button>
      </main>
    );
  if (tq.error)
    return (
      <main className="theme-bhsat min-h-screen bg-background p-10 text-center">
        تعذر تحميل التطبيق.
      </main>
    );
  if (!tq.data)
    return (
      <div className="theme-bhsat min-h-screen bg-background p-10 text-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  const t = tq.data;
  const ctx = {
    t,
    isAdmin: !!me.data?.isAdmin,
    email: me.data?.email ?? "",
    uid: me.data?.uid ?? "",
    go: setSec,
  };
  const feats = resolveFeatures(t.features);
  const allowed = (k: string) => ctx.isAdmin || !(k in feats) || feats[k as FeatureKey];
  const visible = SECTIONS.filter((s) => allowed(s[0]));
  if (!allowed(sec)) {
    setTimeout(() => setSec("home"));
  }
  const title = SECTIONS.find((s) => s[0] === sec)?.[1] ?? "الرئيسية";
  return (
    <div dir="rtl" className="theme-bhsat min-h-screen bg-background text-foreground lg:flex">
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-72 border-l bg-card p-5 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-6 flex items-center gap-3">
          {t.logo_url ? (
            <img src={t.logo_url} alt={t.name} className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">
              {t.name[0]}
            </div>
          )}
          <div>
            <p className="font-extrabold text-primary">{t.name}</p>
            <p className="text-xs text-muted-foreground">لوحة إدارة التطبيق</p>
          </div>
          <button className="mr-auto lg:hidden" onClick={() => setOpen(false)} aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1">
          {visible.map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => {
                setSec(k);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${sec === k ? "border border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-8 space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {ctx.isAdmin ? "المسؤول" : "المالك"} · {ctx.email}
          </p>
          <p>إصدار اللوحة 1.0.0</p>
          {ctx.isAdmin && (
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
              <ArrowRight className="h-4 w-4" />
              كل الزبائن
            </Link>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to="/applications">
              <Smartphone />
              صناعة التطبيقات
            </Link>
          </Button>
          <button
            className="flex items-center gap-2 font-bold text-foreground"
            onClick={() => signOut(qc, () => nav({ to: "/auth", replace: true }))}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">
        <div className={`mx-auto ${sec === "studio" ? "max-w-7xl" : "max-w-5xl"}`}>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <button
                className="mb-2 rounded-lg bg-secondary p-2 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="القائمة"
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {t.name}
              </p>
              <h1 className="text-3xl font-extrabold">{title}</h1>
            </div>
            <div className="flex gap-2">
              <a href={`/preview/${t.slug}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  معاينة مباشرة
                </Button>
              </a>
              <a href={`/install/${t.slug}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  صفحة التثبيت
                </Button>
              </a>
            </div>
          </div>
          {sec === "home" && <Home {...ctx} />}
          {sec === "studio" && <Studio {...ctx} />}
          {sec === "servers" && <Servers {...ctx} />}
          {sec === "activation" && <ActivationCodesPanel tenantId={t.id} />}
          {sec === "brand" && <Brand {...ctx} />}
          {sec === "layout" && <LayoutEditor {...ctx} />}
          {sec === "contact" && <Contact {...ctx} />}
          {sec === "notify" && <Notify {...ctx} />}
          {sec === "builds" && <Builds {...ctx} />}
          {sec === "changes" && <Changes {...ctx} />}
          {sec === "backup" && <Backup {...ctx} />}
          {sec === "security" && <Security {...ctx} />}
        </div>
      </main>
    </div>
  );
}
