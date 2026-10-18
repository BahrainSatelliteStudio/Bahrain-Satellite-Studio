import { useEffect, useMemo, useRef, useState } from "react";
import { ExperienceNav } from "@/components/player/ExperienceNav";
import { ExperienceHome } from "@/components/player/ExperienceHome";
import { progressKey, progressNamespace } from "@/lib/player/media";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tv, Film, Clapperboard, Heart, LogOut, Search, MessageCircle, Send, Phone, ChevronRight, Loader2, Settings, Play, History, Smartphone, House } from "lucide-react";
import { xtreamApi, m3uFetch, macCall, activateCode } from "@/lib/iptv.functions";
import { prefs, t as str, type AppSettings, type Lang } from "@/lib/player/prefs";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { resolveLayout, previewChannel, ICONS, type AppLayout, type SectionCfg } from "@/lib/layout";
import { Button } from "@/components/ui/button";
import { PREVIEW_CATALOG } from "@/lib/player/demo";

import type { TenantConfig, Session, Kind, Cat, Item, Playing } from "./types";
export function Shell({ cfg, style, themeClass, lang, children, onLogout, onSettings, sidebar = false }: {
  cfg: TenantConfig; style: React.CSSProperties; themeClass: string; lang: Lang;
  children: React.ReactNode; onLogout?: (() => void) | undefined; onSettings?: (() => void) | undefined; sidebar?: boolean;
}) {
  return (
    <div style={style} dir={lang === "ar" ? "rtl" : "ltr"} className={`min-h-screen bg-background text-foreground ${themeClass}`}>
      <header className={`sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur ${sidebar ? "md:hidden" : ""}`}>
        <div className="flex items-center gap-3">
          {cfg.logo_url ? <img src={cfg.logo_url} alt={cfg.name} className="h-10 w-10 rounded-xl object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">{cfg.name[0]}</div>}
          <span className="text-lg font-extrabold">{cfg.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {cfg.support_whatsapp && <a data-nav aria-label="واتساب" href={`https://wa.me/${cfg.support_whatsapp.replace(/\D/g, "")}`} className="rounded-lg bg-secondary p-2"><MessageCircle className="h-5 w-5" /></a>}
          {cfg.support_telegram && <a data-nav aria-label="تلغرام" href={`https://t.me/${cfg.support_telegram.replace(/^@/, "")}`} className="rounded-lg bg-secondary p-2"><Send className="h-5 w-5" /></a>}
          {cfg.support_phone && <a data-nav aria-label="اتصال" href={`tel:${cfg.support_phone}`} className="rounded-lg bg-secondary p-2"><Phone className="h-5 w-5" /></a>}
          {onSettings && <button data-nav aria-label="الإعدادات" onClick={onSettings} className="rounded-lg bg-secondary p-2"><Settings className="h-5 w-5" /></button>}
          {onLogout && <button data-nav aria-label="خروج" onClick={onLogout} className="rounded-lg bg-secondary p-2"><LogOut className="h-5 w-5" /></button>}
        </div>
      </header>
      <main className={sidebar ? "mx-auto max-w-[1600px] px-4 pb-8 pt-4 md:px-5" : "mx-auto max-w-7xl px-4 pb-16 pt-4"}>{children}</main>
    </div>
  );
}

