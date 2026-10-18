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
import { useTvNav, usePushRegistration } from "./device-hooks";
import { Shell } from "./Shell";
import { SettingsDialog } from "./SettingsDialog";
import { PreviewLogin } from "./PreviewLogin";
import { Login } from "./Login";
import { Browser } from "./Browser";
const cmpVer = (a: string, b: string) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

export function PlayerApp({ cfg, preview = false }: { cfg: TenantConfig; preview?: boolean }) {
  usePushRegistration(cfg.slug, !preview);
  const namespace = progressNamespace(cfg.slug, preview);
  const key = `iptv:${namespace}`;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [appVer, setAppVer] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => prefs.settings(""));
  const [langChosen, setLangChosen] = useState(true);
  const [setupStep, setSetupStep] = useState<"device" | "lang">("device");
  const [showSettings, setShowSettings] = useState(false);
  useTvNav();
  const [layout, setLayout] = useState<AppLayout>(() => resolveLayout(cfg.layout));
  useEffect(() => {
    setLayout(resolveLayout(cfg.layout));
  }, [cfg.layout]);
  useEffect(() => {
    if (!preview || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(previewChannel(cfg.slug));
    ch.onmessage = (e) => { if (e.data?.type !== "request-layout") setLayout(resolveLayout(e.data)); };
    ch.postMessage({ type: "request-layout" });
    return () => ch.close();
  }, [preview, cfg.slug]);

  useEffect(() => {
    setSettings(prefs.settings(namespace));
    if (preview) { if (new URLSearchParams(location.search).get("setup") !== "1") setSession({ type: "demo", sourceId: "" }); }
    else try { const s = localStorage.getItem(key); if (s) setSession(JSON.parse(s)); } catch {}
    const v = new URLSearchParams(location.search).get("v") || sessionStorage.getItem("appver");
    if (v) { sessionStorage.setItem("appver", v); setAppVer(v); }
    setLangChosen(preview ? new URLSearchParams(location.search).get("setup") !== "1" : !!localStorage.getItem(`${key}:langChosen`));
    setReady(true);
  }, [key, namespace, preview]);

  const L = str(settings.lang);
  const theme = preview || settings.theme === "auto" ? cfg.theme : settings.theme;
  const style = { "--primary": cfg.primary_color, "--ring": cfg.primary_color, "--accent": cfg.accent_color } as React.CSSProperties;
  const themeClass = theme === "blue" ? "theme-blue" : theme === "cinema" ? "theme-cinema" : theme === "bhsat" ? "theme-bhsat" : "";

  const saveSettings = (s: AppSettings) => { setSettings(s); prefs.saveSettings(namespace, s); };

  if (!ready) return <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang}><div /></Shell>;

  // شاشة الإعداد الأولى: نوع الجهاز ثم اللغة
  if (!langChosen) {
    return (
      <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang}>
        <div className="mx-auto mt-20 max-w-sm space-y-4 text-center">
          {cfg.logo_url && <img src={cfg.logo_url} alt="" className="mx-auto h-24 w-24 rounded-3xl object-cover" />}
          <h1 className="text-2xl font-extrabold">{cfg.name}</h1>
          {setupStep === "device" ? (
            <>
              <p className="text-muted-foreground">اختر نوع جهازك · Choose your device</p>
              <div className="grid grid-cols-2 gap-3">
                <button data-nav autoFocus onClick={() => { setSettings({ ...settings, device: "phone" }); setSetupStep("lang"); if (preview) window.parent.postMessage({ bhsatDevice: "phone" }, "*"); }}
                  className="space-y-2 rounded-2xl border bg-card py-6 font-extrabold focus:outline-none">
                  <Smartphone className="mx-auto h-10 w-10 text-primary" />
                  <div>جوال<br /><span className="text-xs font-normal text-muted-foreground">Phone</span></div>
                </button>
                <button data-nav onClick={() => { setSettings({ ...settings, device: "tv" }); setSetupStep("lang"); if (preview) window.parent.postMessage({ bhsatDevice: "tv" }, "*"); }}
                  className="space-y-2 rounded-2xl border bg-card py-6 font-extrabold focus:outline-none">
                  <Tv className="mx-auto h-10 w-10 text-primary" />
                  <div>تلفاز<br /><span className="text-xs font-normal text-muted-foreground">TV</span></div>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">اختر اللغة · Choose your language</p>
              <div className="grid gap-3">
                {(["ar", "en"] as Lang[]).map((l) => (
                  <button key={l} data-nav autoFocus={l === "ar"} onClick={() => { saveSettings({ ...settings, lang: l }); localStorage.setItem(`${key}:langChosen`, "1"); setLangChosen(true); }}
                    className="rounded-2xl border bg-card py-4 text-lg font-extrabold focus:outline-none">
                    {l === "ar" ? "العربية" : "English"}
                  </button>
                ))}
              </div>
              <button data-nav onClick={() => setSetupStep("device")} className="text-sm text-muted-foreground underline">رجوع · Back</button>
            </>
          )}
        </div>
      </Shell>
    );
  }

  if (appVer && cmpVer(appVer, cfg.min_version) < 0) {
    return (
      <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang}>
        <div className="mx-auto mt-16 max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center">
          <h2 className="text-xl font-extrabold">يتوفر تحديث إجباري</h2>
          <p className="text-muted-foreground">نسختك {appVer} — أحدث نسخة {cfg.latest_version}. حمّل التحديث للمتابعة.</p>
          {cfg.update_url && <a data-nav href={cfg.update_url} className="block rounded-xl bg-primary py-3 font-bold text-primary-foreground">تحميل التحديث</a>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang} sidebar={!!session && layout.template === "sidebar"}
      onSettings={() => setShowSettings(true)}
      onLogout={session && !preview ? () => { localStorage.removeItem(key); setSession(null); } : undefined}>
      {showSettings && <SettingsDialog cfg={{ ...cfg, slug: namespace }} settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
      {session
        ? <Browser cfg={cfg} session={session} settings={settings} layout={layout} onSettings={() => setShowSettings(true)} />
        : preview
          ? <PreviewLogin cfg={cfg} lang={settings.lang} onDone={() => setSession({ type: "demo", sourceId: "" })} />
          : <Login cfg={cfg} onDone={(s) => { localStorage.setItem(key, JSON.stringify(s)); setSession(s); }} />}
    </Shell>
  );
}

