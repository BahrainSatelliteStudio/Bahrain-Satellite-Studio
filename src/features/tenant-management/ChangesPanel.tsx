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
/* ---------------- Changes ---------------- */
export function Changes(c: Ctx) {
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

