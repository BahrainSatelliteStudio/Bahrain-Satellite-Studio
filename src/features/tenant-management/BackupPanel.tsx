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
/* ---------------- Backup ---------------- */
const TENANT_KEYS = ["name", "logo_url", "banner_url", "colors", "primary_color", "accent_color", "theme", "support_whatsapp", "support_telegram", "support_phone", "support_facebook", "support_website", "support_email", "customer_notice", "store_url", "min_version", "layout"] as const;
export function Backup(c: Ctx) {
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

