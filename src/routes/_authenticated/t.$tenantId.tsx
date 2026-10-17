import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Trash2, Plus, ExternalLink, Hammer, LayoutDashboard, Server, Palette, Phone, Bell, Package,
  History, DatabaseBackup, LayoutTemplate, ArrowUp, ArrowDown, ShieldCheck, LogOut, RefreshCw, Download, Upload, Menu, X, Image as ImageIcon, Smartphone, Tablet, Tv, Wand2, Check, ChevronLeft, ChevronRight, RotateCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { triggerBuild, checkHost } from "@/lib/iptv.functions";
import { sendPush, getFirebaseStatus } from "@/lib/firebase.functions";
import { useMe, signOut } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TEMPLATES, ICONS, resolveLayout, previewChannel, type AppLayout, type SectionCfg } from "@/lib/layout";
import { FEATURES, PLANS, resolveFeatures, type FeatureKey, type FeatureState, type PlanKey } from "@/lib/features";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
type Source = Database["public"]["Tables"]["tenant_sources"]["Row"];
type Colors = { primary: string; secondary: string; accent: string; background: string; surface: string; text: string; button: string };

export const Route = createFileRoute("/_authenticated/t/$tenantId")({
  head: () => ({ meta: [
    { title: "لوحة إدارة التطبيق" }, { name: "description", content: "تحكم بالسيرفرات والهوية والتواصل والإشعارات لتطبيقك" },
    { property: "og:title", content: "لوحة إدارة التطبيق" }, { property: "og:description", content: "تحكم بالسيرفرات والهوية والتواصل والإشعارات لتطبيقك" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Panel,
});

const SECTIONS = [
  ["home", "الرئيسية", LayoutDashboard], ["studio", "استوديو التطبيق والمحاكاة", Wand2], ["servers", "السيرفرات والهوستات", Server], ["brand", "هوية التطبيق والألوان", Palette], ["layout", "تصميم وأقسام التطبيق", LayoutTemplate],
  ["contact", "روابط التواصل والدعم", Phone], ["notify", "الإشعارات الجماعية", Bell], ["builds", "الإصدارات والتحديثات", Package],
  ["changes", "سجل التغييرات", History], ["backup", "النسخ الاحتياطي", DatabaseBackup], ["security", "أمان حسابي", ShieldCheck],
] as const;
type Sec = (typeof SECTIONS)[number][0];

function Panel() {
  const { tenantId } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const nav = Route.useNavigate();
  const [sec, setSec] = useState<Sec>("home");
  const [open, setOpen] = useState(false);
  const access = useQuery({ queryKey: ["tenant-access", tenantId, me.data?.uid], enabled: !!me.data, queryFn: async () => {
    if (me.data?.isAdmin) return true;
    const { data, error } = await supabase.from("tenant_members").select("id").eq("tenant_id", tenantId).eq("user_id", me.data?.uid ?? "").limit(1);
    if (error) throw error;
    return !!data?.length;
  } });
  const tq = useQuery({ queryKey: ["tenant", tenantId, me.data?.uid], enabled: access.data === true, queryFn: async () => { const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId).single(); if (error) throw error; return data; } });
  if (access.data === false || access.error || me.error) return <main className="theme-bhsat min-h-screen bg-background p-10 text-center"><h1 className="text-2xl font-bold">لا تملك صلاحية الدخول إلى هذا التطبيق</h1><Button asChild variant="outline" className="mt-4"><Link to="/dashboard">العودة إلى تطبيقاتي</Link></Button></main>;
  if (tq.error) return <main className="theme-bhsat min-h-screen bg-background p-10 text-center">تعذر تحميل التطبيق.</main>;
  if (!tq.data) return <div className="theme-bhsat min-h-screen bg-background p-10 text-center text-muted-foreground">جاري التحميل...</div>;
  const t = tq.data;
  const ctx = { t, isAdmin: !!me.data?.isAdmin, email: me.data?.email ?? "", uid: me.data?.uid ?? "", go: setSec };
  const feats = resolveFeatures(t.features);
  const allowed = (k: string) => ctx.isAdmin || !(k in feats) || feats[k as FeatureKey];
  const visible = SECTIONS.filter((s) => allowed(s[0]));
  if (!allowed(sec)) { setTimeout(() => setSec("home")); }
  const title = SECTIONS.find((s) => s[0] === sec)?.[1] ?? "الرئيسية";
  return (
    <div dir="rtl" className="theme-bhsat min-h-screen bg-background text-foreground lg:flex">
      <aside className={`fixed inset-y-0 right-0 z-40 w-72 border-l bg-card p-5 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-6 flex items-center gap-3">
          {t.logo_url ? <img src={t.logo_url} alt={t.name} className="h-12 w-12 rounded-xl object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">{t.name[0]}</div>}
          <div><p className="font-extrabold text-primary">{t.name}</p><p className="text-xs text-muted-foreground">لوحة إدارة التطبيق</p></div>
          <button className="mr-auto lg:hidden" onClick={() => setOpen(false)} aria-label="إغلاق"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1">
          {visible.map(([k, label, Icon]) => (
            <button key={k} onClick={() => { setSec(k); setOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${sec === k ? "border border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>
        <div className="mt-8 space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />{ctx.isAdmin ? "المسؤول" : "المالك"} · {ctx.email}</p>
          <p>إصدار اللوحة 1.0.0</p>
          {ctx.isAdmin && <Link to="/dashboard" className="flex items-center gap-2 font-bold text-foreground"><ArrowRight className="h-4 w-4" />كل الزبائن</Link>}
          <button className="flex items-center gap-2 font-bold text-foreground" onClick={() => signOut(qc, () => nav({ to: "/auth", replace: true }))}><LogOut className="h-4 w-4" />تسجيل الخروج</button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">
        <div className={`mx-auto ${sec === "studio" ? "max-w-7xl" : "max-w-5xl"}`}>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <button className="mb-2 rounded-lg bg-secondary p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة"><Menu className="h-5 w-5" /></button>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">{t.name}</p>
              <h1 className="text-3xl font-extrabold">{title}</h1>
            </div>
            <div className="flex gap-2">
              <a href={`/preview/${t.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink className="h-4 w-4" />معاينة مباشرة</Button></a>
              <a href={`/install/${t.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink className="h-4 w-4" />صفحة التثبيت</Button></a>
            </div>
          </div>
          {sec === "home" && <Home {...ctx} />}
          {sec === "studio" && <Studio {...ctx} />}
          {sec === "servers" && <Servers {...ctx} />}
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

type Ctx = { t: Tenant; isAdmin: boolean; email: string; uid: string; go: (s: Sec) => void };
const card = "space-y-4 rounded-2xl border bg-card p-6";

async function logChange(c: Ctx, section: string, summary: string) {
  await supabase.from("tenant_changes").insert({ tenant_id: c.t.id, user_id: c.uid, user_email: c.email, section, summary });
}

function useSave(c: Ctx) {
  const qc = useQueryClient();
  return async (patch: Partial<Tenant>, section: string, summary: string) => {
    const { error } = await supabase.from("tenants").update(patch).eq("id", c.t.id);
    if (error) { toast.error(error.message); return false; }
    await logChange(c, section, summary);
    toast.success("تم الحفظ — يظهر في التطبيقات خلال ثوانٍ");
    qc.invalidateQueries({ queryKey: ["tenant", c.t.id] }); qc.invalidateQueries({ queryKey: ["changes", c.t.id] });
    return true;
  };
}

async function uploadImage(tenantId: string, file: File) {
  if (file.size > 3 * 1024 * 1024) throw new Error("الحد الأقصى للصورة 3MB");
  const path = `${tenantId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "")}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return `/api/public/file?b=branding&p=${encodeURIComponent(path)}`;
}

function useSources(id: string) {
  return useQuery({ queryKey: ["sources", id], queryFn: async () => (await supabase.from("tenant_sources").select("*").eq("tenant_id", id).order("sort_order")).data ?? [] });
}
const hostCount = (s: Source[]) => s.reduce((n, x) => n + 1 + (x.backup_urls?.length ?? 0), 0);

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold">{value}{sub && <span className="mr-2 text-sm font-medium text-muted-foreground">{sub}</span>}</p></div>;
}

/* ---------------- Home ---------------- */
function Home(c: Ctx) {
  const { t } = c;
  const src = useSources(t.id);
  const ann = useQuery({ queryKey: ["ann", t.id], queryFn: async () => (await supabase.from("announcements").select("*").eq("tenant_id", t.id).order("created_at", { ascending: false })).data ?? [] });
  const used = hostCount(src.data ?? []);
  const exp = t.subscription_expires_at ? new Date(t.subscription_expires_at) : null;
  const days = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
  const live = (ann.data ?? []).filter((a) => a.active && (!a.expires_at || new Date(a.expires_at) > new Date()));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">حالة الاشتراك</p>
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${days === null || days > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{days === null || days > 0 ? "فعّال" : "منتهي"}</span></div>
          <p className="mt-2 text-xl font-extrabold">{t.plan_name}</p>
          <p className="mt-3 text-sm text-muted-foreground">ينتهي: {exp ? exp.toLocaleDateString("ar") : "غير محدد"}</p>
          {days !== null && <p className="text-sm font-bold text-primary">{days > 0 ? `متبقي ${days} يوم` : "يرجى التجديد"}</p>}
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">استهلاك الهوستات</p>
          <p className="mt-2 text-3xl font-extrabold text-primary">{used}<span className="text-sm text-muted-foreground"> / {t.max_hosts}</span></p>
          <div className="mt-3 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (used / t.max_hosts) * 100)}%` }} /></div>
          <p className="mt-2 text-sm text-muted-foreground">المتبقي: {Math.max(0, t.max_hosts - used)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">معلومات التطبيق</p>
          <p className="mt-2 font-extrabold">{t.name}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">{t.package_id} · v{t.latest_version}</p>
          <p className="mt-3 text-sm">{t.support_email || "—"}</p><p className="text-sm" dir="ltr">{t.support_whatsapp || "—"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => c.go("servers")}><Server className="h-4 w-4" />إدارة الهوستات</Button>
        <Button variant="secondary" onClick={() => c.go("notify")}><Bell className="h-4 w-4" />إرسال إشعار</Button>
        <Button variant="secondary" onClick={() => c.go("brand")}><Palette className="h-4 w-4" />تغيير الثيم</Button>
      </div>
      {c.isAdmin && <PlanEditor c={c} />}
      {c.isAdmin && <PanelLink c={c} />}
      <div className={card}>
        <h2 className="text-lg font-extrabold">الإشعارات الفعّالة في التطبيق</h2>
        {live.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات منشورة حاليًا.</p> :
          live.map((a) => <div key={a.id} className="rounded-xl bg-secondary p-3"><p className="font-bold">{a.title}</p><p className="text-sm text-muted-foreground">{a.body}</p></div>)}
      </div>
    </div>
  );
}

/* ---------------- Plan + permissions (admin only) ---------------- */
function PlanEditor({ c }: { c: Ctx }) {
  const save = useSave(c);
  const init = (c.t.features ?? {}) as FeatureState;
  const [plan, setPlan] = useState<PlanKey>(((init.plan as PlanKey) in PLANS ? init.plan : "premium") as PlanKey);
  const [ov, setOv] = useState<Partial<Record<FeatureKey, boolean>>>(init.overrides ?? {});
  const [maxHosts, setMaxHosts] = useState(c.t.max_hosts);
  const eff = resolveFeatures({ plan, overrides: ov });
  const pick = (p: PlanKey) => { setPlan(p); setOv({}); setMaxHosts(PLANS[p].maxHosts); };
  const toggle = (k: FeatureKey, v: boolean) => setOv((o) => {
    const n = { ...o }; if (PLANS[plan].on.includes(k) === v) delete n[k]; else n[k] = v; return n;
  });
  return (
    <div className={card}>
      <h2 className="text-lg font-extrabold">الباقة والصلاحيات</h2>
      <p className="text-sm text-muted-foreground">اختر باقة جاهزة ثم خصّص أي ميزة. الأقسام المقفلة تختفي من لوحة الزبون.</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PLANS).map(([k, p]) => (
          <Button key={k} variant={plan === k ? "default" : "secondary"} onClick={() => pick(k as PlanKey)}>{p.label}</Button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {FEATURES.map(([k, label]) => (
          <label key={k} className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm font-bold">
            <span>{label}{ov[k] !== undefined && <span className="mr-2 text-xs text-primary">مخصص</span>}</span>
            <Switch checked={eff[k]} onCheckedChange={(v) => toggle(k, v)} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2"><Label>حد الهوستات</Label><Input type="number" min={1} className="w-24" value={maxHosts} onChange={(e) => setMaxHosts(Number(e.target.value) || 1)} /></div>
      <Button onClick={() => save({ features: { plan, overrides: ov }, plan_name: PLANS[plan].label, max_hosts: maxHosts }, "الباقة", `الباقة: ${PLANS[plan].label}`)}>حفظ الباقة</Button>
    </div>
  );
}

/* ---------------- Panel link (admin only) ---------------- */
function PanelLink({ c }: { c: Ctx }) {
  const save = useSave(c);
  const [url, setUrl] = useState(c.t.panel_url ?? "");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const check = async () => {
    if (!url) return;
    setChecking(true); setStatus(null);
    try {
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(`${url.replace(/\/+$/, "")}/api/public/config`, { signal: ctrl.signal });
      clearTimeout(tm);
      setStatus(r.ok ? { ok: true, msg: "اللوحة متصلة وتستجيب ✓" } : { ok: false, msg: `اللوحة ردت بخطأ ${r.status}` });
    } catch { setStatus({ ok: false, msg: "تعذر الوصول للوحة — تأكد من الرابط وأن السيرفر شغال" }); }
    setChecking(false);
  };
  return (
    <div className={card}>
      <h2 className="text-lg font-extrabold">لوحة الزبون المستقلة</h2>
      <p className="text-sm text-muted-foreground">رابط اللوحة المثبتة على سيرفر الزبون. عند تعبئته يقرأ التطبيق إعداداته (الثيم، الشعار، السيرفرات، الإشعارات) من لوحة الزبون مباشرة، ويرجع للوحة السحابية إذا تعذر الوصول.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input dir="ltr" className="max-w-md" placeholder="https://panel.customer.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button variant="secondary" disabled={!url || checking} onClick={check}>{checking ? "جاري الفحص..." : "فحص الاتصال"}</Button>
        <Button onClick={() => save({ panel_url: url || null }, "الربط", url ? `ربط لوحة الزبون: ${url}` : "إلغاء ربط لوحة الزبون")}>حفظ</Button>
      </div>
      {status && <p className={`text-sm font-bold ${status.ok ? "text-primary" : "text-destructive"}`}>{status.msg}</p>}
      {c.t.panel_url && <p className="text-xs text-muted-foreground" dir="ltr">الحالي: {c.t.panel_url}</p>}
    </div>
  );
}

/* ---------------- Servers ---------------- */
function Servers(c: Ctx) {
  const qc = useQueryClient();
  const q = useSources(c.t.id);
  const [search, setSearch] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["sources", c.t.id] });
  const list = (q.data ?? []).filter((s) => !search || s.name.includes(search) || (s.login_code ?? "").includes(search));
  const add = async () => {
    const n = (q.data?.length ?? 0) + 1;
    const { error } = await supabase.from("tenant_sources").insert({ tenant_id: c.t.id, type: "xtream", name: `سيرفر ${n}`, url: "http://", sort_order: n, login_code: String(n) });
    if (error) toast.error(error.message); else { await logChange(c, "السيرفرات", `إضافة سيرفر ${n}`); refresh(); }
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="السيرفرات" value={q.data?.length ?? 0} />
        <Stat label="المفعّلة" value={q.data?.filter((s) => s.enabled).length ?? 0} />
        <Stat label="الهوستات المستخدمة" value={hostCount(q.data ?? [])} sub={`/ ${c.t.max_hosts}`} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="ابحث بالاسم أو كود الدخول" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button className="mr-auto" onClick={add}><Plus className="h-4 w-4" />إضافة سيرفر</Button>
      </div>
      {list.map((s, i) => <ServerCard key={s.id} c={c} s={s} idx={i + 1} onChange={refresh} />)}
      {q.data?.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">لا توجد سيرفرات. اضغط «إضافة سيرفر».</p>}
    </div>
  );
}

function ServerCard({ c, s, idx, onChange }: { c: Ctx; s: Source; idx: number; onChange: () => void }) {
  const check = useServerFn(checkHost);
  const [f, setF] = useState({ name: s.name, type: s.type, url: s.url, login_code: s.login_code ?? "", backup_urls: s.backup_urls ?? [], activation_api_url: s.activation_api_url ?? "" });
  const [res, setRes] = useState<{ url: string; ok: boolean; ms: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const { error } = await supabase.from("tenant_sources").update({ ...f, login_code: f.login_code || null, activation_api_url: f.activation_api_url || null, backup_urls: f.backup_urls.filter(Boolean) }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("تم حفظ السيرفر"); await logChange(c, "السيرفرات", `تعديل ${f.name}`); onChange(); }
  };
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b bg-secondary/50 px-5 py-3">
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-sm font-extrabold text-primary">#{idx}</span>
        <span className="font-bold">{s.name}</span>
        {s.last_check_at && <span className={`text-xs ${s.last_check_ok ? "text-primary" : "text-destructive"}`}>{s.last_check_ok ? "● متصل" : "● لا يستجيب"}</span>}
        <div className="mr-auto flex items-center gap-3">
          <Switch checked={s.enabled} onCheckedChange={async (v) => { await supabase.from("tenant_sources").update({ enabled: v }).eq("id", s.id); onChange(); }} />
          <span className="text-sm">{s.enabled ? "مفعّل" : "متوقف"}</span>
          <button className="text-sm font-bold text-destructive" onClick={async () => { if (!confirm("حذف السيرفر؟")) return; await supabase.from("tenant_sources").delete().eq("id", s.id); await logChange(c, "السيرفرات", `حذف ${s.name}`); onChange(); }}>حذف</button>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1"><Label>اسم السيرفر</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>النوع</Label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="xtream">Xtream Codes</option><option value="m3u">M3U</option><option value="mac">MAC Portal</option></select></div>
          <div className="space-y-1"><Label>كود الدخول في التطبيق</Label><Input dir="ltr" value={f.login_code} onChange={(e) => setF({ ...f, login_code: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>الهوست الأساسي</Label><Input dir="ltr" placeholder="http://server.com:8080" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">المشترك يكتب كود الدخول، أو يتركه فارغًا ويبحث التطبيق في كل السيرفرات بالاسم وكلمة المرور.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>الهوستات الاحتياطية {f.backup_urls.length} / 7</Label>
            <Button size="sm" variant="secondary" disabled={f.backup_urls.length >= 7} onClick={() => setF({ ...f, backup_urls: [...f.backup_urls, ""] })}><Plus className="h-4 w-4" />إضافة احتياطي</Button></div>
          {f.backup_urls.map((u, i) => (
            <div key={i} className="flex gap-2">
              <Input dir="ltr" placeholder="http://backup.com:8080" value={u} onChange={(e) => { const b = [...f.backup_urls]; b[i] = e.target.value; setF({ ...f, backup_urls: b }); }} />
              <Button variant="ghost" size="icon" aria-label="حذف" onClick={() => setF({ ...f, backup_urls: f.backup_urls.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">إذا تعطل الهوست الأساسي ينتقل التطبيق تلقائيًا للاحتياطي.</p>
        </div>
        <div className="space-y-1"><Label>رابط API لتفعيل الأكواد (اختياري)</Label><Input dir="ltr" placeholder="https://provider.example/api/activate" value={f.activation_api_url} onChange={(e) => setF({ ...f, activation_api_url: e.target.value })} /></div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button onClick={save}>حفظ السيرفر</Button>
          <Button variant="secondary" disabled={busy} onClick={async () => {
            setBusy(true);
            try { const r = await check({ data: { sourceId: s.id } }); setRes(r.results); onChange(); } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الفحص"); }
            setBusy(false);
          }}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />فحص الاتصال</Button>
          <span className="text-xs text-muted-foreground">يفحص الهوستات المحفوظة، ولا يتحقق من صلاحية الاشتراكات.</span>
        </div>
        {res && <div className="space-y-1">{res.map((r) => <p key={r.url} dir="ltr" className={`text-sm ${r.ok ? "text-primary" : "text-destructive"}`}>{r.ok ? "✓" : "✗"} {r.url} · {r.ms}ms</p>)}</div>}
      </div>
    </div>
  );
}

/* ---------------- Brand ---------------- */
const PRESETS = {
  bhsat: { label: "Bahrain Satellite", theme: "bhsat", c: { primary: "#FBBD23", secondary: "#303540", accent: "#DCA518", background: "#14181F", surface: "#20242C", text: "#F8F8F6", button: "#20242C" } },
  purple: { label: "Dark Purple VIP", theme: "default", c: { primary: "#8B5CF6", secondary: "#2E2545", accent: "#C084FC", background: "#120E1C", surface: "#1E1830", text: "#F5F3FF", button: "#2E2545" } },
  neon: { label: "Cyber Neon", theme: "default", c: { primary: "#22C55E", secondary: "#1F2937", accent: "#06B6D4", background: "#0A0F0D", surface: "#141C18", text: "#ECFDF5", button: "#1F2937" } },
  gold: { label: "Classic Gold", theme: "cinema", c: { primary: "#F59E0B", secondary: "#3A2A12", accent: "#FCD34D", background: "#140F08", surface: "#221A10", text: "#FFFBEB", button: "#3A2A12" } },
  ocean: { label: "Ocean Blue", theme: "blue", c: { primary: "#0EA5E9", secondary: "#1E3A5F", accent: "#38BDF8", background: "#0B1220", surface: "#132036", text: "#F0F9FF", button: "#1E3A5F" } },
} satisfies Record<string, { label: string; theme: string; c: Colors }>;
const COLOR_FIELDS: [keyof Colors, string][] = [["primary", "اللون الأساسي"], ["secondary", "اللون الثانوي"], ["accent", "اللون المميز"], ["background", "الخلفية"], ["surface", "البطاقات"], ["text", "النص"], ["button", "الأزرار"]];

function mix(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function Brand(c: Ctx) {
  const { t } = c;
  const save = useSave(c);
  const stored = (t.colors ?? {}) as Partial<Colors>;
  const [name, setName] = useState(t.name);
  const [theme, setTheme] = useState(t.theme);
  const [col, setCol] = useState<Colors>({ ...PRESETS.bhsat.c, primary: t.primary_color, accent: t.accent_color, ...stored });
  const [busy, setBusy] = useState(false);
  const valid = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
  const upload = async (field: "logo_url" | "banner_url", file?: File) => {
    if (!file) return; setBusy(true);
    try { await save({ [field]: await uploadImage(t.id, file) }, "الهوية", field === "logo_url" ? "تغيير الشعار" : "تغيير البنر"); } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الرفع"); }
    setBusy(false);
  };
  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-extrabold">الشعار والبنر والاسم</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>الشعار (PNG شفاف، 512×512)</Label>
            <div className="flex items-center gap-4">
              {t.logo_url ? <img src={t.logo_url} alt="الشعار" className="h-20 w-20 rounded-2xl bg-secondary object-contain p-1" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>}
              <Input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => upload("logo_url", e.target.files?.[0])} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>البنر (1920×1080 يظهر في الدخول والرئيسية)</Label>
            {t.banner_url ? <img src={t.banner_url} alt="البنر" className="aspect-video w-full rounded-xl object-cover" /> : <div className="flex aspect-video items-center justify-center rounded-xl bg-secondary text-sm text-muted-foreground">لا يوجد بنر</div>}
            <div className="flex gap-2">
              <Input type="file" accept="image/*" disabled={busy} onChange={(e) => upload("banner_url", e.target.files?.[0])} />
              {t.banner_url && <Button variant="secondary" onClick={() => save({ banner_url: null }, "الهوية", "حذف البنر")}>حذف</Button>}
            </div>
          </div>
        </div>
        <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={() => save({ name }, "الهوية", `تغيير الاسم إلى ${name}`)}>حفظ الاسم</Button></div>
      </div>

      <div className={card}>
        <h2 className="text-lg font-extrabold">الثيم والألوان</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button key={k} onClick={() => { setCol(p.c); setTheme(p.theme); }} className="rounded-xl border p-3 text-sm font-bold hover:border-primary">
              <div className="mb-2 flex justify-center gap-1">{[p.c.primary, p.c.background, p.c.accent].map((x) => <span key={x} className="h-4 w-4 rounded-full border" style={{ background: x }} />)}</div>{p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-secondary p-3">
          <p className="w-full text-sm font-bold">توليد ثيم كامل من لونين</p>
          <Input dir="ltr" className="w-32" placeholder="#FBBD23" id="g1" defaultValue={col.primary} />
          <Input dir="ltr" className="w-32" placeholder="#14181F" id="g2" defaultValue={col.background} />
          <Button variant="secondary" onClick={() => {
            const a = (document.getElementById("g1") as HTMLInputElement).value.trim(), b = (document.getElementById("g2") as HTMLInputElement).value.trim();
            if (!valid(a) || !valid(b)) { toast.error("اكتب كود لون صحيح مثل #FBBD23"); return; }
            setCol({ primary: a.toUpperCase(), accent: mix(a, -0.12), background: b.toUpperCase(), surface: mix(b, 0.06), secondary: mix(b, 0.14), button: mix(b, 0.06), text: "#F8F8F6" }); setTheme("bhsat");
          }}>توليد</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1"><Label>{label}</Label>
              <div className="flex gap-2"><input type="color" aria-label={label} value={valid(col[k]) ? col[k] : "#000000"} onChange={(e) => setCol({ ...col, [k]: e.target.value.toUpperCase() })} className="h-10 w-12 rounded border bg-transparent" />
                <Input dir="ltr" value={col[k]} className={valid(col[k]) ? "" : "border-destructive"} onChange={(e) => setCol({ ...col, [k]: e.target.value })} /></div></div>
          ))}
        </div>
        <div className="space-y-1"><Label>معاينة</Label>
          <div className="rounded-2xl p-4" style={{ background: col.background, color: col.text }}>
            <div className="mb-3 flex items-center gap-2 font-extrabold" style={{ color: col.primary }}>{name}</div>
            <div className="grid grid-cols-3 gap-2">{["مباشر", "أفلام", "مسلسلات"].map((x, i) => <div key={x} className="rounded-xl p-4 text-center text-sm font-bold" style={{ background: i === 0 ? col.primary : col.surface, color: i === 0 ? col.background : col.text }}>{x}</div>)}</div>
            <div className="mt-3 rounded-lg px-4 py-2 text-center text-sm font-bold" style={{ background: col.button, color: col.accent }}>زر</div>
          </div>
        </div>
        <Button disabled={COLOR_FIELDS.some(([k]) => !valid(col[k]))} onClick={() => save({ colors: col, primary_color: col.primary, accent_color: col.accent, theme }, "الهوية", "تحديث الثيم والألوان")}>حفظ الثيم</Button>
      </div>
    </div>
  );
}

/* ---------------- Layout ---------------- */
const sel = "h-10 w-full rounded-md border bg-input/40 px-2 text-sm";
function LayoutEditor(c: Ctx) {
  const save = useSave(c);
  const [lay, setLay] = useState<AppLayout>(() => resolveLayout(c.t.layout));
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(previewChannel(c.t.slug));
    ch.onmessage = (event) => { if (event.data?.type === "request-layout") ch.postMessage(lay); };
    ch.postMessage(lay);
    return () => ch.close();
  }, [lay, c.t.slug]);
  const upd = (i: number, p: Partial<SectionCfg>) => setLay({ ...lay, sections: lay.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const move = (i: number, d: number) => { const a = [...lay.sections]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j]!, a[i]!]; setLay({ ...lay, sections: a }); };
  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">قالب التطبيق</h2>
          <a href={`/preview/${c.t.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink className="h-4 w-4" />افتح المعاينة المباشرة</Button></a>
        </div>
        <p className="text-sm text-muted-foreground">افتح المعاينة في نافذة ثانية — كل تعديل هنا يظهر فيها فورًا قبل الحفظ.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map(([k, label, desc]) => (
            <button key={k} onClick={() => setLay({ ...lay, template: k })} className={`rounded-xl border p-4 text-start ${lay.template === k ? "border-primary bg-primary/10" : "hover:border-primary"}`}>
              <p className="font-extrabold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">الأقسام وترتيبها</h2>
        {lay.sections.map((s, i) => {
          const Icon = ICONS[s.icon]!;
          return (
            <div key={s.key} className={`space-y-3 rounded-xl border p-4 ${s.visible ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" /><span className="font-extrabold">{s.label}</span>
                <div className="mr-auto flex items-center gap-1">
                  <Button size="icon" variant="ghost" aria-label="لأعلى" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="لأسفل" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Switch checked={s.visible} onCheckedChange={(v) => upd(i, { visible: v })} aria-label="إظهار" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1"><Label>الاسم</Label><Input value={s.label} onChange={(e) => upd(i, { label: e.target.value })} /></div>
                <div className="space-y-1"><Label>الأيقونة</Label>
                  <select className={sel} value={s.icon} onChange={(e) => upd(i, { icon: e.target.value })}>{Object.keys(ICONS).map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
                <div className="space-y-1"><Label>شكل العرض</Label>
                  <select className={sel} value={s.view} onChange={(e) => upd(i, { view: e.target.value as SectionCfg["view"] })}><option value="grid">شبكة</option><option value="row">صف أفقي</option></select></div>
                <div className="space-y-1"><Label>حجم البطاقات</Label>
                  <select className={sel} value={s.size} onChange={(e) => upd(i, { size: e.target.value as SectionCfg["size"] })}><option value="sm">صغير</option><option value="md">متوسط</option><option value="lg">كبير</option></select></div>
                <div className="space-y-1"><Label>عدد العناصر (0 = الكل)</Label><Input type="number" min={0} value={s.limit} onChange={(e) => upd(i, { limit: Number(e.target.value) })} /></div>
              </div>
              {s.key !== "continue" && s.key !== "fav" && (
                <div className="space-y-1"><Label>فئات مخفية (اكتب أسماءها مفصولة بفاصلة)</Label>
                  <Input value={s.hiddenCats.join("، ")} placeholder="مثال: أطفال، رعب" onChange={(e) => upd(i, { hiddenCats: e.target.value.split(/[,،]/).map((x) => x.trim()) })} /></div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2">
          <Button onClick={() => save({ layout: { ...lay, sections: lay.sections.map((s) => ({ ...s, hiddenCats: s.hiddenCats.filter(Boolean) })) } }, "التصميم", `تحديث قالب وأقسام التطبيق (${lay.template})`)}>حفظ التصميم</Button>
          <Button variant="secondary" onClick={() => setLay(resolveLayout({}))}>استرجاع الافتراضي</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Contact ---------------- */
function Contact(c: Ctx) {
  const { t } = c;
  const save = useSave(c);
  const [f, setF] = useState({ support_whatsapp: t.support_whatsapp ?? "", support_telegram: t.support_telegram ?? "", support_facebook: t.support_facebook ?? "", support_website: t.support_website ?? "", support_email: t.support_email ?? "", support_phone: t.support_phone ?? "", store_url: t.store_url ?? "", customer_notice: t.customer_notice ?? "" });
  const fields: [keyof typeof f, string, string][] = [["support_whatsapp", "واتساب (رقم أو رابط)", "+97333000000"], ["support_telegram", "تيليجرام (قناة أو معرّف)", "@username"], ["support_facebook", "صفحة فيسبوك", "https://facebook.com/..."], ["support_website", "الموقع الرسمي", "https://..."], ["support_email", "إيميل الدعم", "support@..."], ["support_phone", "هاتف", "+973..."], ["store_url", "رابط المتجر/الاشتراك", "https://.../products"]];
  return (
    <div className={card}>
      <p className="text-sm text-muted-foreground">هذه الروابط تظهر داخل التطبيق ليتواصل معك المشتركون.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([k, l, ph]) => <div key={k} className="space-y-1"><Label>{l}</Label><Input dir="ltr" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
      </div>
      <div className="space-y-1"><Label>رسالة للعملاء / ملاحظات التفعيل</Label><Textarea rows={5} value={f.customer_notice} onChange={(e) => setF({ ...f, customer_notice: e.target.value })} placeholder="📢 للاشتراك أو التجديد يرجى زيارة موقعنا..." /></div>
      <Button onClick={() => save(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as Partial<Tenant>, "التواصل", "تحديث روابط التواصل")}>حفظ روابط التواصل</Button>
    </div>
  );
}

/* ---------------- Notifications ---------------- */
function Notify(c: Ctx) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ann", c.t.id], queryFn: async () => (await supabase.from("announcements").select("*").eq("tenant_id", c.t.id).order("created_at", { ascending: false })).data ?? [] });
  const [n, setN] = useState({ title: "", body: "", kind: "info", days: "7" });
  const [img, setImg] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState(true);
  const sendPushFn = useServerFn(sendPush);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ann", c.t.id] });
  const kinds: Record<string, string> = { info: "معلومة", maintenance: "صيانة", offer: "عرض", urgent: "عاجل" };
  return (
    <div className="space-y-6">
      {c.isAdmin && <FirebasePanel />}
      <form className={card} onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try {
          const image_url = img ? await uploadImage(c.t.id, img) : null;
          const expires_at = n.days === "0" ? null : new Date(Date.now() + Number(n.days) * 86400000).toISOString();
          const { error } = await supabase.from("announcements").insert({ tenant_id: c.t.id, title: n.title, body: n.body, kind: n.kind, image_url, expires_at });
          if (error) throw error;
          await logChange(c, "الإشعارات", `إرسال: ${n.title}`);
          if (c.isAdmin && push && n.body.trim()) {
            try { await sendPushFn({ data: { target: `tenant-${c.t.id}`, title: n.title.slice(0, 100), body: n.body.slice(0, 500) } }); toast.success("وصل إشعار للجوالات أيضًا"); }
            catch (pe) { toast.error("إشعار الجوال: " + (pe instanceof Error ? pe.message : "فشل")); }
          }
          setN({ ...n, title: "", body: "" }); setImg(null); refresh(); toast.success("تم الإرسال لكل المشتركين");
        } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
        setBusy(false);
      }}>
        <h2 className="text-lg font-extrabold">إرسال إشعار جديد</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
          <Input placeholder="عنوان الإشعار" required value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
          <select value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value })} className="h-10 rounded-md border bg-background px-3">{Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select value={n.days} onChange={(e) => setN({ ...n, days: e.target.value })} className="h-10 rounded-md border bg-background px-3"><option value="1">يوم</option><option value="3">3 أيام</option><option value="7">أسبوع</option><option value="30">شهر</option><option value="0">بدون انتهاء</option></select>
        </div>
        <Textarea rows={4} placeholder="نص الرسالة" value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} />
        <div className="space-y-1"><Label>صورة (اختيارية)</Label><Input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} /></div>
        {c.isAdmin && <div className="flex items-center gap-3"><Switch checked={push} onCheckedChange={setPush} /><Label>إرسال إشعار للجوالات أيضًا (Firebase)</Label>
          <Link to="/firebase" className="text-xs text-primary underline">إعدادات Firebase</Link></div>}
        <Button disabled={busy}><Bell className="h-4 w-4" />إرسال للجميع</Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs text-muted-foreground"><tr><th className="p-3 text-right">النوع</th><th className="p-3 text-right">العنوان</th><th className="p-3 text-right">المحتوى</th><th className="p-3 text-right">الإنشاء</th><th className="p-3 text-right">ينتهي</th><th className="p-3">إجراءات</th></tr></thead>
          <tbody>
            {q.data?.map((a) => {
              const expired = a.expires_at && new Date(a.expires_at) < new Date();
              return (
                <tr key={a.id} className="border-t">
                  <td className="p-3"><span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{kinds[a.kind] ?? a.kind}</span></td>
                  <td className="p-3 font-bold">{a.title}</td>
                  <td className="max-w-xs truncate p-3 text-muted-foreground">{a.body}</td>
                  <td className="p-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ar")}</td>
                  <td className="p-3">{expired ? <span className="text-destructive">منتهي</span> : a.expires_at ? new Date(a.expires_at).toLocaleDateString("ar") : "—"}</td>
                  <td className="p-3"><div className="flex items-center justify-center gap-2">
                    <Switch checked={a.active} onCheckedChange={async (v) => { await supabase.from("announcements").update({ active: v }).eq("id", a.id); refresh(); }} />
                    <Button variant="ghost" size="icon" aria-label="حذف" onClick={async () => { await supabase.from("announcements").delete().eq("id", a.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {q.data?.length === 0 && <p className="p-8 text-center text-muted-foreground">لا توجد إشعارات بعد.</p>}
      </div>
    </div>
  );
}

/* ---------------- Builds ---------------- */
function bump(v: string) { const p = v.split(".").map(Number); return `${p[0] ?? 1}.${p[1] ?? 0}.${(p[2] ?? 0) + 1}`; }
function Builds(c: Ctx) {
  const { t, isAdmin } = c;
  const qc = useQueryClient();
  const save = useSave(c);
  const build = useServerFn(triggerBuild);
  const q = useQuery({
    queryKey: ["builds", t.id],
    queryFn: async () => (await supabase.from("builds").select("*").eq("tenant_id", t.id).order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: (query) => (query.state.data?.some((b) => b.status === "building") ? 10000 : false),
  });
  const [ver, setVer] = useState(t.latest_version);
  const [minV, setMinV] = useState(t.min_version);
  useEffect(() => { setVer(q.data?.length ? bump(t.latest_version) : t.latest_version); }, [q.data?.length, t.latest_version]);
  const [busy, setBusy] = useState(false);
  const label: Record<string, string> = { queued: "بالانتظار", building: "جاري البناء", done: "جاهز", failed: "فشل" };
  const url = typeof window !== "undefined" ? `${window.location.origin}/install/${t.slug}` : `/install/${t.slug}`;
  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-extrabold">رابط التثبيت لمشتركيك</h2>
        <div className="flex gap-2"><p dir="ltr" className="flex-1 break-all rounded-xl bg-secondary p-3 font-mono text-sm">{url}</p><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(url); toast.success("تم النسخ"); }}>نسخ</Button></div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">إجبار التحديث</h2>
        <p className="text-sm text-muted-foreground">أي تطبيق نسخته أقل من هذا الرقم يطلب من المستخدم التحديث. أحدث نسخة: v{t.latest_version}</p>
        <div className="flex gap-2"><Input dir="ltr" className="w-36" value={minV} onChange={(e) => setMinV(e.target.value)} /><Button onClick={() => /^\d+\.\d+\.\d+$/.test(minV) ? save({ min_version: minV }, "التحديثات", `أقل نسخة ${minV}`) : toast.error("الصيغة 1.0.0")}>حفظ</Button></div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">الإصدارات المنشورة</h2>
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1"><Label>رقم النسخة</Label><Input dir="ltr" className="w-32" value={ver} onChange={(e) => setVer(e.target.value)} /></div>
            <Button disabled={busy} onClick={async () => {
              setBusy(true);
              try { await build({ data: { tenantId: t.id, version: ver, siteUrl: window.location.origin } }); toast.success("بدأ البناء — حوالي 5 دقائق"); qc.invalidateQueries({ queryKey: ["builds", t.id] }); }
              catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
              setBusy(false);
            }}><Hammer className="h-4 w-4" />بناء APK</Button>
          </div>
        )}
        {q.data?.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl bg-secondary p-3 text-sm">
            <span className="font-bold" dir="ltr">v{b.version}</span>
            <span className={b.status === "done" ? "text-primary" : b.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{label[b.status]}</span>
            <span className="flex-1 text-muted-foreground">{new Date(b.created_at).toLocaleString("ar")}</span>
            {b.apk_url && <a href={b.apk_url} className="font-bold text-primary">تحميل</a>}
          </div>
        ))}
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">لا توجد إصدارات بعد.</p>}
      </div>
    </div>
  );
}

/* ---------------- Changes ---------------- */
function Changes(c: Ctx) {
  const q = useQuery({ queryKey: ["changes", c.t.id], queryFn: async () => (await supabase.from("tenant_changes").select("*").eq("tenant_id", c.t.id).order("created_at", { ascending: false }).limit(200)).data ?? [] });
  return (
    <div className={card}>
      {q.data?.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد تغييرات مسجلة بعد.</p>}
      {q.data?.map((x) => (
        <div key={x.id} className="flex flex-wrap items-center gap-3 border-b pb-3 text-sm last:border-0">
          <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{x.section}</span>
          <span className="flex-1 font-bold">{x.summary}</span>
          <span className="text-muted-foreground">{x.user_email}</span>
          <span className="text-muted-foreground">{new Date(x.created_at).toLocaleString("ar")}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Backup ---------------- */
const TENANT_KEYS = ["name", "logo_url", "banner_url", "colors", "primary_color", "accent_color", "theme", "support_whatsapp", "support_telegram", "support_phone", "support_facebook", "support_website", "support_email", "customer_notice", "store_url", "min_version", "layout"] as const;
function Backup(c: Ctx) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const exportIt = async () => {
    const [{ data: sources }, { data: ann }] = await Promise.all([
      supabase.from("tenant_sources").select("type,name,url,login_code,backup_urls,activation_api_url,enabled,sort_order").eq("tenant_id", c.t.id),
      supabase.from("announcements").select("title,body,image_url,kind,active,expires_at").eq("tenant_id", c.t.id),
    ]);
    const settings = Object.fromEntries(TENANT_KEYS.map((k) => [k, c.t[k]]));
    const blob = new Blob([JSON.stringify({ app: c.t.slug, exported_at: new Date().toISOString(), version: 1, settings, sources, announcements: ann }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${c.t.slug}-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    await logChange(c, "النسخ الاحتياطي", "تحميل نسخة احتياطية");
  };
  const importIt = async (file?: File) => {
    if (!file) return;
    if (!confirm("الاستعادة ستستبدل السيرفرات والإعدادات الحالية. متابعة؟")) return;
    setBusy(true);
    try {
      const j = JSON.parse(await file.text());
      if (!j.settings || !Array.isArray(j.sources)) throw new Error("ملف غير صالح");
      const settings = Object.fromEntries(TENANT_KEYS.filter((k) => k in j.settings).map((k) => [k, j.settings[k]]));
      const { error } = await supabase.from("tenants").update(settings as Partial<Tenant>).eq("id", c.t.id); if (error) throw error;
      await supabase.from("tenant_sources").delete().eq("tenant_id", c.t.id);
      if (j.sources.length) { const r = await supabase.from("tenant_sources").insert(j.sources.map((s: Record<string, unknown>) => ({ ...s, tenant_id: c.t.id }))); if (r.error) throw r.error; }
      await logChange(c, "النسخ الاحتياطي", `استعادة من ${file.name}`);
      qc.invalidateQueries(); toast.success("تمت الاستعادة");
    } catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
    setBusy(false);
  };
  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-extrabold">نسخة على جهازك</h2>
        <p className="text-sm text-muted-foreground">تحتوي السيرفرات والهوستات والألوان وروابط التواصل والإشعارات. احتفظ بها في مكان آمن.</p>
        <Button onClick={exportIt}><Download className="h-4 w-4" />تحميل نسخة احتياطية</Button>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">استعادة نسخة</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><Upload className="h-4 w-4" />اختر ملف النسخة
          <input type="file" accept="application/json" className="hidden" disabled={busy} onChange={(e) => importIt(e.target.files?.[0])} /></label>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">الحماية التلقائية</h2>
        <p className="text-sm text-muted-foreground">كل البيانات محفوظة على السحابة بنسخ احتياطية تلقائية، وكل تعديل مسجّل في «سجل التغييرات».</p>
      </div>
    </div>
  );
}

/* ---------------- Security ---------------- */
function Security(c: Ctx) {
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const display = c.email.endsWith("@users.bhsat.me") ? c.email.replace("@users.bhsat.me", "") : c.email;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="اسم الدخول" value={<span className="text-lg" dir="ltr">{display.split("@")[0]}</span>} />
        <Stat label="الإيميل" value={<span className="break-all text-sm" dir="ltr">{c.email}</span>} />
        <Stat label="الصلاحية" value={<span className="text-lg">{c.isAdmin ? "مسؤول" : "مالك التطبيق"}</span>} />
      </div>
      <form className={card} onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 10) { toast.error("كلمة المرور 10 أحرف على الأقل"); return; }
        if (pw !== pw2) { toast.error("كلمتا المرور غير متطابقتين"); return; }
        setBusy(true);
        const { error: e1 } = await supabase.auth.signInWithPassword({ email: c.email, password: cur });
        if (e1) { toast.error("كلمة المرور الحالية غير صحيحة"); setBusy(false); return; }
        const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as { password: string });
        if (error) toast.error(error.message); else { toast.success("تم تغيير كلمة المرور"); setCur(""); setPw(""); setPw2(""); await logChange(c, "الأمان", "تغيير كلمة المرور"); }
        setBusy(false);
      }}>
        <h2 className="text-lg font-extrabold">تغيير كلمة المرور</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1"><Label>الحالية</Label><Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="space-y-1"><Label>الجديدة</Label><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="space-y-1"><Label>تأكيد الجديدة</Label><Input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        </div>
        <Button disabled={busy}>حفظ كلمة المرور</Button>
      </form>
      <div className={card}>
        <h2 className="text-lg font-extrabold">تسجيل الخروج من كل الأجهزة</h2>
        <p className="text-sm text-muted-foreground">إذا تشك أن أحد دخل حسابك، اخرج من كل الأجهزة ثم غيّر كلمة المرور.</p>
        <Button variant="secondary" onClick={async () => { await supabase.auth.signOut({ scope: "global" }); location.href = "/auth"; }}>خروج من كل الأجهزة</Button>
      </div>
    </div>
  );
}

/* ---------------- Studio: wizard + device emulator ---------------- */
const DEVICES = {
  phone: { label: "جوال", icon: Smartphone, w: 390, h: 800, frame: "rounded-[2.5rem] border-[10px]" },
  tablet: { label: "تابلت", icon: Tablet, w: 820, h: 1100, frame: "rounded-[2rem] border-[14px]" },
  tv: { label: "تلفاز", icon: Tv, w: 1600, h: 900, frame: "rounded-lg border-[12px] border-b-[22px]" },
} as const;
type Dev = keyof typeof DEVICES;

function Emulator({ slug, refresh }: { slug: string; refresh: number }) {
  const [dev, setDev] = useState<Dev>("phone");
  const [landscape, setLandscape] = useState(false);
  const [box, setBox] = useState(560);
  const [k, setK] = useState(0);
  useEffect(() => { const m = (e: MessageEvent) => { const v = e.data?.bhsatDevice; if (v === "phone" || v === "tv") { setDev(v); setLandscape(v === "tv"); } }; window.addEventListener("message", m); return () => window.removeEventListener("message", m); }, []);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = wrapRef.current; if (!el) return; const f = () => setBox(Math.max(240, el.clientWidth - 32)); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect(); }, []);
  const base = DEVICES[dev];
  const isTv = dev === "tv";
  const wide = isTv || landscape;
  const d = { ...base, w: wide ? Math.max(base.w, base.h) : Math.min(base.w, base.h), h: wide ? Math.min(base.w, base.h) : Math.max(base.w, base.h) };
  const scale = Math.min(box / (d.w + 40), 720 / (d.h + 40), 1);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(DEVICES) as Dev[]).map((x) => { const I = DEVICES[x].icon; return (
          <Button key={x} size="sm" variant={dev === x ? "default" : "secondary"} onClick={() => { setDev(x); setLandscape(x === "tv"); }}><I className="h-4 w-4" />{DEVICES[x].label}</Button>
        ); })}
        {!isTv && (
          <Button size="sm" variant={landscape ? "default" : "secondary"} onClick={() => setLandscape((v) => !v)}>
            <RotateCw className="h-4 w-4" />{landscape ? "عرضي" : "عمودي"}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setK((n) => n + 1)}><RefreshCw className="h-4 w-4" />إعادة تشغيل (من اختيار اللغة والجهاز)</Button>
      </div>
      <div ref={wrapRef} className="flex justify-center overflow-hidden rounded-2xl bg-secondary/40 p-4">
        <div className="relative shrink-0" style={{ width: (d.w + 40) * scale, height: (d.h + 40) * scale }}>
        <div className="absolute left-0 top-0" style={{ width: d.w + 40, height: d.h + 40, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div className={`h-full w-full overflow-hidden border-foreground/80 bg-background shadow-2xl ${d.frame}`}>
            <iframe key={`${k}-${refresh}`} title="محاكاة التطبيق" src={`/preview/${slug}?setup=1`} className="h-full w-full border-0" />
          </div>
        </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">تقدر تتنقل وتفتح الأقسام وتشغّل المحتوى داخل الجهاز كأنه التطبيق الحقيقي</p>
    </div>
  );
}

function Studio(c: Ctx) {
  const steps: [string, string, ((c: Ctx) => React.ReactNode) | null][] = [
    ["brand", "الهوية والألوان", Brand],
    ["layout", "القالب والأقسام", LayoutEditor],
    ["servers", "السيرفرات", Servers],
    ["contact", "التواصل والدعم", Contact],
    ["test", "تجربة التطبيق", null],
    ["builds", "التصدير إلى APK", Builds],
  ];
  const [i, setI] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const go = (n: number) => { setI(n); setRefresh((r) => r + 1); };
  const [, label, Comp] = steps[i]!;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {steps.map(([k, l], n) => (
          <button key={k} onClick={() => go(n)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${n === i ? "bg-primary text-primary-foreground" : n < i ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-xs">{n < i ? <Check className="h-3 w-3" /> : n + 1}</span>{l}
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_500px]">
        <div className="min-w-0 space-y-4">
          <h2 className="text-xl font-extrabold">الخطوة {i + 1}: {label}</h2>
          {Comp ? <Comp {...c} /> : (
            <div className={card}>
              <p className="text-sm text-muted-foreground">جرّب التطبيق داخل الجهاز: افتح الأقسام، شغّل قناة أو فيلم، جرّب المفضلة والإعدادات، وبدّل بين الجوال والتابلت والتلفاز. إذا كل شي تمام انتقل للتصدير.</p>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="secondary" disabled={i === 0} onClick={() => go(i - 1)}><ChevronRight className="h-4 w-4" />السابق</Button>
            {i < steps.length - 1 && <Button onClick={() => go(i + 1)}>التالي<ChevronLeft className="h-4 w-4" /></Button>}
          </div>
        </div>
        <div className="xl:sticky xl:top-4 xl:self-start"><Emulator slug={c.t.slug} refresh={refresh} /></div>
      </div>
    </div>
  );
}
