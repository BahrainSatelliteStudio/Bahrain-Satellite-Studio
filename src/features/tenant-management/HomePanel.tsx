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
import { ActivationCodesPanel } from "@/components/ActivationCodesPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TEMPLATES, ICONS, resolveLayout, previewChannel, type AppLayout, type SectionCfg } from "@/lib/layout";
import { FEATURES, PLANS, resolveFeatures, type FeatureKey, type FeatureState, type PlanKey } from "@/lib/features";

import { type Ctx, type Tenant, type Source, card, logChange, useSave, uploadImage, useSources, hostCount, Stat } from "./shared";
/* ---------------- Home ---------------- */
export function Home(c: Ctx) {
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

