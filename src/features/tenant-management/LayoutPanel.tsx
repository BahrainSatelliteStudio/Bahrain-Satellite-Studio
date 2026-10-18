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
/* ---------------- Layout ---------------- */
const sel = "h-10 w-full rounded-md border bg-input/40 px-2 text-sm";
export function LayoutEditor(c: Ctx) {
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
  const move = (i: number, d: number) => { const a = [...lay.sections]; const j = i + d; if (j < 0 || j >= a.length) return; const first = a[i], second = a[j]; if (!first || !second) return; [a[i], a[j]] = [second, first]; setLay({ ...lay, sections: a }); };
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
          const Icon = ICONS[s.icon] ?? Tv;
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
              {s.key === "apps" && (
                <div className="space-y-2">
                  <Label>التطبيقات التي تظهر في هذا القسم (الاسم، رابط الشعار، رابط الفتح)</Label>
                  {lay.apps.map((a, k) => (
                    <div key={k} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input placeholder="الاسم مثل: يوتيوب" value={a.name} onChange={(e) => setLay({ ...lay, apps: lay.apps.map((x, j) => j === k ? { ...x, name: e.target.value } : x) })} />
                      <Input dir="ltr" placeholder="https://.../logo.png" value={a.logo} onChange={(e) => setLay({ ...lay, apps: lay.apps.map((x, j) => j === k ? { ...x, logo: e.target.value } : x) })} />
                      <Input dir="ltr" placeholder="https://youtube.com" value={a.url} onChange={(e) => setLay({ ...lay, apps: lay.apps.map((x, j) => j === k ? { ...x, url: e.target.value } : x) })} />
                      <Button variant="ghost" onClick={() => setLay({ ...lay, apps: lay.apps.filter((_, j) => j !== k) })}>حذف</Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => setLay({ ...lay, apps: [...lay.apps, { name: "", logo: "", url: "" }] })}>+ إضافة تطبيق</Button>
                </div>
              )}
              {s.key !== "continue" && s.key !== "fav" && s.key !== "apps" && (
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

