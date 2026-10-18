import { type Lang } from "@/lib/player/prefs";
import { LogOut,MessageCircle,Phone,Send,Settings } from "lucide-react";

import type { TenantConfig } from "./types";
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

