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
import { Brand } from "./BrandPanel";
import { LayoutEditor } from "./LayoutPanel";
import { Servers } from "./ServersPanel";
import { Contact } from "./ContactPanel";
import { Builds } from "./BuildsPanel";
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

export function Studio(c: Ctx) {
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
  const step = steps[i]; if (!step) return null; const [, label, Comp] = step;
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
