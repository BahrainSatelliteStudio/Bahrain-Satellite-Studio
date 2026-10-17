import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tv, Film, Clapperboard, Heart, LogOut, Search, MessageCircle, Send, Phone, ChevronRight, Loader2, Settings, Play, History, Smartphone, House } from "lucide-react";
import { xtreamApi, m3uFetch, macCall, activateCode } from "@/lib/iptv.functions";
import { prefs, t as str, type AppSettings, type Lang } from "@/lib/player/prefs";
import { VideoPlayer } from "./VideoPlayer";
import { resolveLayout, previewChannel, ICONS, type AppLayout, type SectionCfg } from "@/lib/layout";
import { Button } from "@/components/ui/button";
import { PREVIEW_CATALOG } from "@/lib/player/demo";

export type TenantConfig = {
  slug: string; name: string; logo_url: string | null; primary_color: string; accent_color: string;
  theme: "default" | "blue" | "cinema" | "bhsat";
  support_whatsapp: string | null; support_telegram: string | null; support_phone: string | null;
  latest_version: string; min_version: string; update_url: string | null;
  sources: { id: string; type: string; name: string }[];
  announcements: { id: string; title: string; body: string | null; image_url: string | null }[];
  layout?: unknown;
};

type Session =
  | { type: "xtream"; sourceId: string; username: string; password: string }
  | { type: "m3u"; sourceId: string }
  | { type: "mac"; sourceId: string; mac: string; token: string }
  | { type: "demo"; sourceId: string };
type Kind = "live" | "movie" | "series";
type Cat = { id: string; name: string };
type Item = { id: string; name: string; logo?: string; url?: string; cmd?: string; kind: Kind | "episode" };
type Playing = { src: string; title: string; itemId?: string | undefined; logo?: string | undefined };

const cmpVer = (a: string, b: string) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

// تنقل الريموت/الكيبورد بين العناصر [data-nav]
function useTvNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dirs: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      const d = dirs[e.key];
      if (!d) return;
      const cur = document.activeElement as HTMLElement | null;
      if (cur && (cur.tagName === "INPUT" || cur.tagName === "TEXTAREA" || cur.tagName === "SELECT" || cur.tagName === "VIDEO")) return;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]")).filter((el) => el.offsetParent !== null);
      if (!els.length) return;
      if (!cur || !els.includes(cur)) { e.preventDefault(); els[0]?.focus(); return; }
      const c = cur.getBoundingClientRect(); const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      let best: HTMLElement | null = null; let bestScore = Infinity;
      for (const el of els) {
        if (el === cur) continue;
        const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const dx = x - cx, dy = y - cy;
        if (d[0] !== 0 && Math.sign(dx) !== d[0]) continue;
        if (d[1] !== 0 && Math.sign(dy) !== d[1]) continue;
        const primary = d[0] !== 0 ? Math.abs(dx) : Math.abs(dy);
        const secondary = d[0] !== 0 ? Math.abs(dy) : Math.abs(dx);
        if (primary < 4) continue;
        const score = primary + secondary * 2.5;
        if (score < bestScore) { bestScore = score; best = el; }
      }
      if (best) { e.preventDefault(); best.focus(); best.scrollIntoView({ block: "nearest", inline: "nearest" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// يسجّل الجهاز لاستقبال إشعارات Firebase (داخل تطبيق الأندرويد فقط).
function usePushRegistration(slug: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const cap = (window as any).Capacitor;
    const push = cap?.Plugins?.PushNotifications;
    if (!cap?.isNativePlatform?.() || !push || !cap.isPluginAvailable?.("PushNotifications")) return;
    (async () => {
      try {
        await push.addListener("registration", async (t: { value: string }) => {
          await fetch("/api/public/push-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, token: t.value }) });
        });
        let perm = await push.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await push.requestPermissions();
        if (perm.receive === "granted") await push.register();
      } catch (e) { console.warn("push registration failed", e); }
    })();
  }, [slug, enabled]);
}

export function PlayerApp({ cfg, preview = false }: { cfg: TenantConfig; preview?: boolean }) {
  usePushRegistration(cfg.slug, !preview);
  const key = `iptv:${cfg.slug}`;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [appVer, setAppVer] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => prefs.settings(cfg.slug));
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
    if (preview) { if (new URLSearchParams(location.search).get("setup") !== "1") setSession({ type: "demo", sourceId: "" }); }
    else try { const s = localStorage.getItem(key); if (s) setSession(JSON.parse(s)); } catch {}
    const v = new URLSearchParams(location.search).get("v") || sessionStorage.getItem("appver");
    if (v) { sessionStorage.setItem("appver", v); setAppVer(v); }
    setLangChosen(preview ? new URLSearchParams(location.search).get("setup") !== "1" : !!localStorage.getItem(`${key}:langChosen`));
    setReady(true);
  }, [key]);

  const L = str(settings.lang);
  const theme = preview || settings.theme === "auto" ? cfg.theme : settings.theme;
  const style = { "--primary": cfg.primary_color, "--ring": cfg.primary_color, "--accent": cfg.accent_color } as React.CSSProperties;
  const themeClass = theme === "blue" ? "theme-blue" : theme === "cinema" ? "theme-cinema" : theme === "bhsat" ? "theme-bhsat" : "";

  const saveSettings = (s: AppSettings) => { setSettings(s); prefs.saveSettings(cfg.slug, s); };

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
      {showSettings && <SettingsDialog cfg={cfg} settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
      {session
        ? <Browser cfg={cfg} session={session} settings={settings} layout={layout} onSettings={() => setShowSettings(true)} />
        : preview
          ? <PreviewLogin cfg={cfg} lang={settings.lang} onDone={() => setSession({ type: "demo", sourceId: "" })} />
          : <Login cfg={cfg} onDone={(s) => { localStorage.setItem(key, JSON.stringify(s)); setSession(s); }} />}
    </Shell>
  );
}

// شاشة دخول المحاكاة — بنفس طريقة التطبيق الأصلي: رمز تفعيل أو اسم مستخدم وكلمة مرور مع كود سيرفر اختياري
function PreviewLogin({ cfg, lang, onDone }: { cfg: TenantConfig; lang: Lang; onDone: () => void }) {
  const ar = lang === "ar";
  const [mode, setMode] = useState<"code" | "creds">("code");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [srv, setSrv] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = () => {
    setErr("");
    if (mode === "code" && !code.trim()) return setErr(ar ? "أدخل رمز التفعيل" : "Enter the activation code");
    if (mode === "creds" && (!user.trim() || !pw)) return setErr(ar ? "اسم المستخدم وكلمة المرور مطلوبة" : "Username and password are required");
    if (mode === "creds" && srv && !/^\d{1,6}$/.test(srv)) return setErr(ar ? "أدخل كود سيرفر صحيحًا من 1 إلى 6 أرقام، أو اتركه فارغًا للتعرف التلقائي" : "Server code must be 1–6 digits, or leave empty for auto-detect");
    setBusy(true);
    setTimeout(onDone, 700);
  };
  const input = "w-full rounded-xl border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none";
  return (
    <div className="mx-auto mt-10 max-w-sm space-y-4 px-4 text-center">
      {cfg.logo_url && <img src={cfg.logo_url} alt="" className="mx-auto h-20 w-20 rounded-3xl object-cover" />}
      <h1 className="text-xl font-extrabold">{ar ? `تسجيل الدخول إلى ${cfg.name}` : `Sign in to ${cfg.name}`}</h1>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1">
        {(["code", "creds"] as const).map((m) => (
          <button key={m} data-nav onClick={() => { setMode(m); setErr(""); }}
            className={`rounded-xl py-2 text-sm font-bold ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "code" ? (ar ? "رمز التفعيل" : "Activation code") : (ar ? "اسم المستخدم وكلمة المرور" : "Username & password")}
          </button>
        ))}
      </div>
      {mode === "code" ? (
        <input data-nav value={code} onChange={(e) => setCode(e.target.value)} placeholder={ar ? "أدخل رمز التفعيل" : "Enter activation code"} className={`${input} text-center tracking-widest`} />
      ) : (
        <div className="space-y-3">
          <input data-nav value={user} onChange={(e) => setUser(e.target.value)} placeholder={ar ? "اسم المستخدم" : "Username"} className={input} />
          <div className="relative">
            <input data-nav type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={ar ? "كلمة المرور" : "Password"} className={input} />
            <button data-nav type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 end-3 text-xs font-bold text-primary">
              {showPw ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
            </button>
          </div>
          <input data-nav inputMode="numeric" value={srv} onChange={(e) => setSrv(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={ar ? "كود السيرفر (اختياري — فارغ للتعرف التلقائي)" : "Server code (optional — auto-detect)"} className={input} />
        </div>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button data-nav onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">
        {busy ? (ar ? "جاري البحث عن سيرفر الاشتراك…" : "Finding your server…") : mode === "code" ? (ar ? "تفعيل" : "Activate") : (ar ? "تسجيل الدخول" : "Sign in")}
      </button>
      <p className="text-xs text-muted-foreground">{ar ? "محاكاة — أي بيانات تفتح التطبيق التجريبي" : "Simulation — any details open the demo app"}</p>
    </div>
  );
}


function Shell({ cfg, style, themeClass, lang, children, onLogout, onSettings, sidebar = false }: {
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

// ===== الإعدادات المحمية برقم PIN =====
function SettingsDialog({ cfg, settings, onSave, onClose }: { cfg: TenantConfig; settings: AppSettings; onSave: (s: AppSettings) => void; onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const L = str(settings.lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Backspace" && !(document.activeElement as HTMLElement)?.matches("input")) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tryPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === settings.pin) setUnlocked(true);
    else { toast.error(L.pinWrong); setPin(""); }
  };

  const downloadBackup = () => {
    const blob = new Blob([prefs.backup(cfg.slug)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${cfg.slug}-backup.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restoreBackup = async (f: File) => {
    try { prefs.restore(cfg.slug, await f.text()); onSave(prefs.settings(cfg.slug)); toast.success(L.saved); }
    catch { toast.error("ملف النسخة غير صالح"); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{L.settings}</h2>
          <button data-nav onClick={onClose} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold">✕</button>
        </div>
        {!unlocked ? (
          <form onSubmit={tryPin} className="space-y-3">
            <p className="text-sm text-muted-foreground">{L.pinTitle}</p>
            <input autoFocus dir="ltr" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border bg-input/40 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring" placeholder="••••" />
            <button data-nav className="w-full rounded-xl bg-primary py-3 font-extrabold text-primary-foreground">{L.open}</button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold">{L.theme}</label>
              <div className="grid grid-cols-4 gap-2">
                {(["auto", "default", "blue", "cinema", "bhsat"] as const).map((th) => (
                  <button key={th} data-nav onClick={() => onSave({ ...settings, theme: th })}
                    className={`rounded-xl border py-2 text-xs font-bold ${settings.theme === th ? "border-primary bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {{ auto: L.themeAuto, default: L.themeDefault, blue: L.themeBlue, cinema: L.themeCinema, bhsat: L.themeBhsat }[th]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold">{L.lang}</label>
              <div className="grid grid-cols-2 gap-2">
                {(["ar", "en"] as Lang[]).map((l) => (
                  <button key={l} data-nav onClick={() => onSave({ ...settings, lang: l })}
                    className={`rounded-xl border py-2 text-sm font-bold ${settings.lang === l ? "border-primary bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {l === "ar" ? "العربية" : "English"}
                  </button>
                ))}
              </div>
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d{4}$/.test(newPin)) { onSave({ ...settings, pin: newPin }); setNewPin(""); toast.success(L.saved); } }}>
              <input dir="ltr" inputMode="numeric" maxLength={4} placeholder={L.newPin} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                className="flex-1 rounded-xl border bg-input/40 px-4 py-2 outline-none focus:ring-2 focus:ring-ring" />
              <button data-nav className="rounded-xl bg-secondary px-4 font-bold">{L.changePin}</button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <button data-nav onClick={() => { localStorage.removeItem(`iptv:${cfg.slug}:fav`); toast.success(L.saved); }} className="rounded-xl bg-secondary py-2.5 text-sm font-bold">{L.clearFavs}</button>
              <button data-nav onClick={() => { prefs.clearProgress(cfg.slug); toast.success(L.saved); }} className="rounded-xl bg-secondary py-2.5 text-sm font-bold">{L.clearHistory}</button>
              <button data-nav onClick={downloadBackup} className="rounded-xl bg-secondary py-2.5 text-sm font-bold">{L.backup}</button>
              <button data-nav onClick={() => fileRef.current?.click()} className="rounded-xl bg-secondary py-2.5 text-sm font-bold">{L.restore}</button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restoreBackup(f); e.target.value = ""; }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const field = "w-full rounded-xl border bg-input/40 px-4 py-3 outline-none focus:ring-2 focus:ring-ring";

function deviceMac() {
  let m = localStorage.getItem("device-mac");
  if (!m) {
    const b = crypto.getRandomValues(new Uint8Array(6)); b[0] = (b[0]! & 0xfc) | 0x02;
    m = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(":").toUpperCase();
    localStorage.setItem("device-mac", m);
  }
  return m;
}

function Login({ cfg, onDone }: { cfg: TenantConfig; onDone: (s: Session) => void }) {
  const actOn = !!(cfg as any).activation_enabled;
  const types = [...(actOn ? ["code"] : []), ...Array.from(new Set(cfg.sources.map((s) => s.type)))];
  const [type, setType] = useState(types[0] ?? "xtream");
  const list = cfg.sources.filter((s) => s.type === type);
  const [sourceId, setSourceId] = useState(list[0]?.id ?? "");
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [mac, setMac] = useState("");
  const [actCode, setActCode] = useState(""); const [srvCode, setSrvCode] = useState("");
  const [busy, setBusy] = useState(false);
  const xt = useServerFn(xtreamApi); const mc = useServerFn(macCall); const act = useServerFn(activateCode);
  useEffect(() => { setSourceId(cfg.sources.find((s) => s.type === type)?.id ?? ""); }, [type, cfg.sources]);

  if (!cfg.sources.length) return <p className="mt-16 text-center text-muted-foreground">لا توجد سيرفرات مضافة لهذا التطبيق بعد.</p>;
  const labels: Record<string, string> = { code: "تفعيل كود", xtream: "اسم مستخدم", m3u: "قائمة M3U", mac: "عنوان MAC" };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (type === "code") {
        const r = await act({ data: { slug: cfg.slug, serverCode: srvCode, code: actCode.trim(), deviceId: deviceMac(), model: "Android TV", firmware: "12" } });
        const a = await xt({ data: { slug: cfg.slug, sourceId: r.sourceId, username: r.username, password: r.password, action: "auth" } });
        if (String((a.json as any)?.user_info?.auth) !== "1") throw new Error("تم التفعيل لكن تعذر الدخول للسيرفر");
        onDone({ type: "xtream", sourceId: r.sourceId, username: r.username, password: r.password });
      } else if (type === "xtream") {
        const r = await xt({ data: { slug: cfg.slug, sourceId, username: u, password: p, action: "auth" } });
        const info = (r.json as any)?.user_info;
        if (!info || String(info.auth) !== "1") throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
        if (info.status && info.status !== "Active") throw new Error("الاشتراك غير فعّال أو منتهي");
        onDone({ type: "xtream", sourceId, username: u, password: p });
      } else if (type === "m3u") onDone({ type: "m3u", sourceId });
      else {
        const r = await mc({ data: { slug: cfg.slug, sourceId, mac, op: "login" } });
        onDone({ type: "mac", sourceId, mac: mac.toUpperCase(), token: (r as any).token });
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "تعذر الدخول"); }
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-6">
      <Announcements cfg={cfg} />
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <h1 className="text-center text-2xl font-extrabold">تسجيل الدخول</h1>
        {types.length > 1 && (
          <div className="grid grid-flow-col gap-2 rounded-xl bg-secondary p-1">
            {types.map((t) => <button data-nav type="button" key={t} onClick={() => setType(t)} className={`rounded-lg py-2 text-sm font-bold ${t === type ? "bg-primary text-primary-foreground" : ""}`}>{labels[t]}</button>)}
          </div>
        )}
        {type === "code" && <>
          <input className={field} dir="ltr" placeholder="رمز التفعيل" required maxLength={128} value={actCode} onChange={(e) => setActCode(e.target.value)} />
          <input className={field} dir="ltr" inputMode="numeric" placeholder="كود السيرفر (اختياري إذا عندك سيرفر واحد)" value={srvCode} onChange={(e) => setSrvCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </>}
        {type !== "code" && list.length > 1 && <select className={field} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        {type === "xtream" && <>
          <input className={field} dir="ltr" placeholder="اسم المستخدم" required value={u} onChange={(e) => setU(e.target.value)} />
          <input className={field} dir="ltr" type="password" placeholder="كلمة المرور" required value={p} onChange={(e) => setP(e.target.value)} />
        </>}
        {type === "mac" && <input className={field} dir="ltr" placeholder="00:1A:79:XX:XX:XX" required pattern="([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}" value={mac} onChange={(e) => setMac(e.target.value)} />}
        {type === "m3u" && <p className="text-sm text-muted-foreground">سيتم تحميل القنوات من {list.find((s) => s.id === sourceId)?.name}.</p>}
        <button data-nav disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}دخول</button>
      </form>
    </div>
  );
}

function Announcements({ cfg }: { cfg: TenantConfig }) {
  if (!cfg.announcements.length) return null;
  return (
    <div className="space-y-3">
      {cfg.announcements.map((a) => (
        <div key={a.id} className="overflow-hidden rounded-2xl border bg-card">
          {a.image_url && <img src={a.image_url} alt={a.title} className="max-h-48 w-full object-cover" />}
          <div className="border-s-4 border-accent p-4"><h3 className="font-extrabold">{a.title}</h3>{a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}</div>
        </div>
      ))}
    </div>
  );
}

const DEMO_CATS: Record<Kind, string[]> = { live: ["رياضة", "أخبار", "أطفال", "وثائقي", "منوعات"], movie: ["أكشن", "دراما", "كوميديا", "رعب"], series: ["خليجي", "تركي", "أجنبي", "كرتون"] };
const demoItems = (kind: Kind, cat?: string): Item[] => kind === "live"
  ? Array.from({ length: 12 }, (_, i) => ({ id: `live-${cat}-${i}`, name: `${cat ?? "قناة"} ${i + 1}`, kind, url: "" }))
  : PREVIEW_CATALOG[kind].filter((item) => !cat || item.category === cat).map((item, i) => ({ id: `${kind}-${i}-${item.name}`, name: item.name, logo: item.logo, kind, url: "" }));

const SIZE: Record<SectionCfg["size"], { grid: string; row: string }> = {
  sm: { grid: "grid-cols-3 sm:grid-cols-5 lg:grid-cols-8", row: "w-28" },
  md: { grid: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6", row: "w-40" },
  lg: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", row: "w-56" },
};

function Browser({ cfg, session, settings, layout, onSettings }: { cfg: TenantConfig; session: Session; settings: AppSettings; layout: AppLayout; onSettings: () => void }) {
  const xt = useServerFn(xtreamApi); const m3 = useServerFn(m3uFetch); const mc = useServerFn(macCall);
  const L = str(settings.lang);
  const full = session.type === "xtream" || session.type === "demo";
  const tabs = layout.sections.filter((s) => s.visible && s.key !== "continue" && s.key !== "apps" && (full || s.key === "live" || s.key === "fav")) as (SectionCfg & { key: Kind | "fav" })[];
  const contSec = layout.sections.find((s) => s.key === "continue") ?? resolveLayout(null).sections[0];
  const appsSec = layout.sections.find((s) => s.key === "apps");
  const showApps = !!appsSec?.visible && layout.apps.some((a) => a.name && a.url);
  const [screen, setScreen] = useState<"home" | "browse" | "continue" | "apps">("home");
  const [tab, setTab] = useState<Kind | "fav">(tabs[0]?.key ?? "live");
  useEffect(() => { const first = tabs[0]; if (first && !tabs.some((t) => t.key === tab)) setTab(first.key); }, [tabs, tab]);
  const sec = tabs.find((t) => t.key === tab) ?? resolveLayout(null).sections.find((s) => s.key === tab) ?? { key: "live", visible: false, label: "", icon: "tv", view: "grid", size: "md", limit: 0, hiddenCats: [] } satisfies SectionCfg;
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [series, setSeries] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [m3uAll, setM3uAll] = useState<{ name: string; group: string; logo: string; url: string }[] | null>(null);
  const favKey = `iptv:${cfg.slug}:${session.type === "demo" ? "preview:" : ""}fav`;
  const [favs, setFavs] = useState<Item[]>([]);
  const [history, setHistory] = useState(() => prefs.progress(cfg.slug));
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem(favKey) || "[]")); } catch {} }, [favKey]);
  useEffect(() => { if (!playing) setHistory(prefs.progress(cfg.slug)); }, [playing, cfg.slug]);
  const toggleFav = (it: Item) => {
    const next = favs.some((f) => f.id === it.id && f.kind === it.kind) ? favs.filter((f) => !(f.id === it.id && f.kind === it.kind)) : [...favs, it];
    setFavs(next); localStorage.setItem(favKey, JSON.stringify(next));
  };

  const xBase = { slug: cfg.slug, sourceId: session.sourceId, username: (session as any).username, password: (session as any).password };
  const run = async (fn: () => Promise<void>) => { setLoading(true); try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "خطأ في التحميل"); } setLoading(false); };

  useEffect(() => {
    setCat(null); setItems([]); setSeries(null); setQ("");
    if (tab === "fav") return;
    run(async () => {
      if (session.type === "demo") {
        setCats(DEMO_CATS[tab].map((n) => ({ id: n, name: n })));
      } else if (session.type === "xtream") {
        const action = tab === "live" ? "get_live_categories" : tab === "movie" ? "get_vod_categories" : "get_series_categories";
        const r = await xt({ data: { ...xBase, action } });
        setCats(((r.json as any[]) ?? []).map((c) => ({ id: String(c.category_id), name: c.category_name })));
      } else if (session.type === "m3u") {
        const all = m3uAll ?? await m3({ data: { slug: cfg.slug, sourceId: session.sourceId } });
        setM3uAll(all);
        setCats(Array.from(new Set(all.map((i) => i.group))).map((g) => ({ id: g, name: g })));
      } else {
        const r: any = await mc({ data: { slug: cfg.slug, sourceId: session.sourceId, mac: session.mac, token: session.token, op: "genres" } });
        setCats((r ?? []).map((g: any) => ({ id: String(g.id), name: g.title })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function openCat(c: Cat) {
    setCat(c); setQ("");
    run(async () => {
      if (session.type === "demo") {
        setItems(demoItems(tab as Kind, c.name));
      } else if (session.type === "xtream") {
        const action = tab === "live" ? "get_live_streams" : tab === "movie" ? "get_vod_streams" : "get_series";
        const r = await xt({ data: { ...xBase, action, extra: { category_id: c.id } } });
        const b = r.base, u = encodeURIComponent(xBase.username), p = encodeURIComponent(xBase.password);
        setItems(((r.json as any[]) ?? []).map((s) => tab === "series"
          ? { id: String(s.series_id), name: s.name, logo: s.cover, kind: "series" as const }
          : { id: String(s.stream_id), name: s.name, logo: s.stream_icon, kind: tab as Kind, url: tab === "live" ? `${b}/live/${u}/${p}/${s.stream_id}.m3u8` : `${b}/movie/${u}/${p}/${s.stream_id}.${s.container_extension || "mp4"}` }));
      } else if (session.type === "m3u") {
        setItems((m3uAll ?? []).filter((i) => i.group === c.id).map((i, n) => ({ id: i.url + n, name: i.name, logo: i.logo, url: i.url, kind: "live" as const })));
      } else {
        const r: any = await mc({ data: { slug: cfg.slug, sourceId: session.sourceId, mac: session.mac, token: session.token, op: "channels", genre: c.id } });
        setItems((r?.data ?? []).map((ch: any) => ({ id: String(ch.id), name: ch.name, logo: ch.logo, cmd: ch.cmd, kind: "live" as const })));
      }
    });
  }

  function openSeries(it: Item) {
    setSeries(it);
    if (session.type === "demo") { setItems(Array.from({ length: 8 }, (_, i) => ({ id: `${it.id}-e${i}`, name: `الحلقة ${i + 1}`, kind: "episode" as const, url: "" }))); return; }
    run(async () => {
      const r = await xt({ data: { ...xBase, action: "get_series_info", extra: { series_id: it.id } } });
      const eps = (r.json as any)?.episodes ?? {};
      const u = encodeURIComponent(xBase.username), p = encodeURIComponent(xBase.password);
      setItems(Object.entries(eps).flatMap(([season, list]) => (list as any[]).map((e) => ({
        id: String(e.id), name: `م${season} — ${e.title}`, logo: e.info?.movie_image || it.logo, kind: "episode" as const,
        url: `${r.base}/series/${u}/${p}/${e.id}.${e.container_extension || "mp4"}`,
      }))));
    });
  }

  async function play(it: Item) {
    if (it.kind === "series") return openSeries(it);
    if (session.type === "demo") { toast.info("هذا عرض تجريبي — التشغيل يعمل بعد تسجيل الدخول"); return; }
    const itemId = it.kind === "live" ? undefined : `${it.kind}:${it.id}`;
    if (it.url) return setPlaying({ src: it.url, title: it.name, itemId, logo: it.logo });
    if (it.cmd && session.type === "mac") run(async () => {
      const r: any = await mc({ data: { slug: cfg.slug, sourceId: session.sourceId, mac: session.mac, token: session.token, op: "link", cmd: it.cmd } });
      setPlaying({ src: r.url, title: it.name });
    });
  }

  const hidden = new Set(sec.hiddenCats.map((h) => h.trim().toLowerCase()).filter(Boolean));
  const shown = useMemo(() => {
    const src = tab === "fav" ? favs : items;
    const f = q ? src.filter((i) => i.name?.toLowerCase().includes(q.toLowerCase())) : src;
    return sec.limit ? f.slice(0, sec.limit) : f.slice(0, 600);
  }, [items, favs, tab, q, sec.limit]);
  const visCats = cats.filter((c) => !hidden.has(c.name?.trim().toLowerCase()));
  const shownCats = q && !cat ? visCats.filter((c) => c.name?.toLowerCase().includes(q.toLowerCase())) : visCats;
  const showItems = tab === "fav" || cat;
  const historyList = Object.entries(history).sort((a, b) => b[1].at - a[1].at).slice(0, contSec?.limit || 12);
  const tpl = layout.template;
  const sz = SIZE[sec.size];

  const nav = (
    <nav aria-label="أقسام التطبيق" className={tpl === "sidebar" ? "flex shrink-0 flex-col gap-1 md:sticky md:top-4 md:w-60 md:self-start max-md:flex-row max-md:overflow-x-auto"
      : tpl === "cinema" ? "fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-card/95 px-2 py-2 backdrop-blur"
      : tpl === "kids" ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
      : tpl === "minimal" ? "flex flex-wrap justify-center gap-2"
      : tpl === "sports" ? "flex gap-2 overflow-x-auto border-b pb-3"
      : "flex gap-2 overflow-x-auto"}>
      {tpl === "sidebar" && <div className="mb-5 hidden min-h-24 items-center justify-center gap-3 md:flex">{cfg.logo_url && <img src={cfg.logo_url} alt={cfg.name} className="max-h-24 max-w-full object-contain" />}{!cfg.logo_url && <h1 className="text-center text-2xl font-extrabold text-primary">{cfg.name}</h1>}</div>}
      <Button data-nav variant="ghost" onClick={() => setScreen("home")} className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 ${screen === "home" ? "border-primary text-primary" : "border-border"}`}><House />الرئيسية</Button>
      {tabs.map((tb) => {
        const Icon = ICONS[tb.icon] ?? Tv; const on = screen === "browse" && tab === tb.key;
        return tpl === "cinema"
          ? <Button variant="ghost" data-nav key={tb.key} onClick={() => { setTab(tb.key); setScreen("browse"); }} className={`h-auto flex-1 flex-col gap-1 py-1.5 text-xs font-bold ${on ? "text-primary" : "text-muted-foreground"}`}><Icon />{tb.label}</Button>
          : tpl === "kids"
          ? <Button variant="ghost" data-nav key={tb.key} onClick={() => { setTab(tb.key); setScreen("browse"); }} className={`h-auto flex-col gap-2 rounded-3xl border-2 py-6 text-base font-extrabold ${on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"}`}><Icon className="h-8 w-8" />{tb.label}</Button>
          : tpl === "minimal"
          ? <Button variant="ghost" data-nav key={tb.key} onClick={() => { setTab(tb.key); setScreen("browse"); }} className={`h-auto gap-2 rounded-full border px-5 py-2.5 text-sm font-bold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}><Icon className="h-4 w-4" />{tb.label}</Button>
          : tpl === "sports"
          ? <Button variant="ghost" data-nav key={tb.key} onClick={() => { setTab(tb.key); setScreen("browse"); }} className={`h-auto shrink-0 gap-2 rounded-none border-b-4 px-5 py-3 text-base font-extrabold ${on ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}><Icon />{tb.label}</Button>
          : <Button variant="ghost" data-nav key={tb.key} onClick={() => { setTab(tb.key); setScreen("browse"); }} className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 font-bold ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}><Icon />{tb.label}</Button>;
      })}
      {contSec?.visible && <Button data-nav variant="ghost" onClick={() => setScreen("continue")} className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 ${screen === "continue" ? "border-primary text-primary" : "border-border"}`}><History />{contSec.label}</Button>}
      {showApps && appsSec && (() => { const AIcon = ICONS[appsSec.icon] ?? Tv; return <Button data-nav variant="ghost" onClick={() => setScreen("apps")} className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 ${screen === "apps" ? "border-primary text-primary" : "border-border"}`}><AIcon />{appsSec.label}</Button>; })()}
      {tpl === "sidebar" && <Button data-nav variant="ghost" onClick={onSettings} className="h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4"><Settings />{L.settings}</Button>}
    </nav>
  );

  const card = (it: Item, extra = "") => {
    const fav = favs.some((f) => f.id === it.id && f.kind === it.kind);
    return (
      <div key={it.kind + it.id} className={`group relative overflow-hidden rounded-lg border border-primary/40 bg-card transition hover:border-primary focus-within:border-primary ${extra}`}>
        <Button variant="ghost" data-nav onClick={() => play(it)} className="block h-auto w-full whitespace-normal rounded-none p-0 text-start hover:bg-card focus:outline-none">
          <div className={`flex items-center justify-center bg-secondary ${it.kind === "live" ? "aspect-video" : "aspect-[2/3]"}`}>
            {it.logo ? <img src={it.logo} alt={it.name} loading="lazy" className="h-full w-full object-cover" /> : <Tv className="h-8 w-8 text-muted-foreground" />}
          </div>
          <p className="line-clamp-2 p-2 text-sm font-bold">{it.name}</p>
        </Button>
        {it.kind !== "episode" && <Button size="icon" variant="ghost" data-nav aria-label={`مفضلة ${it.name}`} onClick={() => toggleFav(it)} className="absolute end-2 top-2 h-7 w-7 rounded-full bg-background/80"><Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} /></Button>}
      </div>
    );
  };

  const ContIcon = ICONS[contSec?.icon ?? "history"] ?? History;
  const body = (
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        {(cat || series) && <button data-nav onClick={() => (series ? (setSeries(null), cat && openCat(cat)) : (setCat(null), setItems([])))} className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-3 text-sm font-bold"><ChevronRight className="h-4 w-4" />{L.back}</button>}
        <div className="relative flex-1"><Search className="absolute start-3 top-3.5 h-5 w-5 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} className={`${field} ps-11`} /></div>
      </div>

      {contSec?.visible && !showItems && !q && historyList.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><ContIcon className="h-5 w-5 text-primary" />{contSec.label}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {historyList.map(([id, p]) => (
              <button data-nav key={id} onClick={() => setPlaying({ src: p.url, title: p.title, itemId: id, logo: p.logo })}
                className={`group relative ${SIZE[contSec.size].row} shrink-0 overflow-hidden rounded-2xl border bg-card text-start focus:outline-none`}>
                <div className="flex aspect-video items-center justify-center bg-secondary">
                  {p.logo ? <img src={p.logo} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <Play className="h-8 w-8 text-muted-foreground" />}
                </div>
                <p className="line-clamp-1 p-2 text-xs font-bold">{p.title}</p>
                <div className="h-1 bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }} /></div>
              </button>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-lg font-extrabold">{series?.name ?? cat?.name ?? sec.label}</h2>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : !showItems ? (
          tpl === "cinema" || tpl === "minimal" ? (
            <div className="flex flex-wrap gap-2">
              {shownCats.map((c) => <button data-nav key={c.id} onClick={() => openCat(c)} className="rounded-full border bg-card px-5 py-2.5 font-bold transition hover:border-primary focus:border-primary focus:outline-none">{c.name}</button>)}
              {!shownCats.length && <p className="w-full py-10 text-center text-muted-foreground">{L.noCats}</p>}
            </div>
          ) : tpl === "kids" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {shownCats.map((c) => <button data-nav key={c.id} onClick={() => openCat(c)} className="rounded-3xl border-2 bg-card p-8 text-center text-lg font-extrabold transition hover:border-primary focus:border-primary focus:outline-none">{c.name}</button>)}
              {!shownCats.length && <p className="col-span-full py-10 text-center text-muted-foreground">{L.noCats}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {shownCats.map((c) => <button data-nav key={c.id} onClick={() => openCat(c)} className="rounded-2xl border bg-card p-4 text-start font-bold transition hover:border-primary focus:border-primary focus:outline-none">{c.name}</button>)}
              {!shownCats.length && <p className="col-span-full py-10 text-center text-muted-foreground">{L.noCats}</p>}
            </div>
          )
        ) : sec.view === "row" ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {shown.map((it) => card(it, `${sz.row} shrink-0`))}
            {!shown.length && <p className="w-full py-10 text-center text-muted-foreground">{L.noContent}</p>}
          </div>
        ) : (
          <div className={`poster-grid grid gap-3 ${sz.grid}`}>
            {shown.map((it) => card(it))}
            {!shown.length && <p className="col-span-full py-10 text-center text-muted-foreground">{L.noContent}</p>}
          </div>
        )}
    </div>
  );

  const homeSections = layout.sections.filter((s) => s.visible && (s.key === "movie" || s.key === "series"));
  const home = (
    <div className="min-w-0 flex-1 space-y-5">
      <div className="flex items-center justify-between border-b pb-3"><h2 className="font-extrabold">{cfg.name}</h2><span className="text-xs text-muted-foreground">v{cfg.latest_version}</span></div>
      {homeSections.map((s) => {
        const kind = s.key as "movie" | "series";
        const hiddenCategories = new Set(s.hiddenCats.map((name) => name.trim().toLowerCase()));
        const entries = session.type === "demo" ? demoItems(kind).filter((item) => {
          const category = PREVIEW_CATALOG[kind].find((entry) => entry.name === item.name)?.category;
          return !hiddenCategories.has(category?.toLowerCase() ?? "");
        }).slice(0, s.limit || 2000) : [];
        return <section key={s.key} aria-label={s.label} className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">{s.label}</h2><Button variant="ghost" size="sm" onClick={() => { setTab(kind); setScreen("browse"); }}>عرض الكل<ChevronRight /></Button></div>
          {entries.length > 0 ? <div className={s.view === "row" ? "flex gap-3 overflow-x-auto pb-2" : `grid gap-3 ${SIZE[s.size].grid}`}>{entries.map((item) => card(item, s.view === "row" ? `${SIZE[s.size].row} shrink-0` : ""))}</div>
            : <Button variant="outline" className="h-24 w-full" onClick={() => { setTab(kind); setScreen("browse"); }}>{session.type === "demo" ? L.noContent : s.label}</Button>}
        </section>;
      })}
      {!homeSections.length && <p className="py-12 text-center text-muted-foreground">لا توجد أقسام معروضة في الرئيسية</p>}
    </div>
  );
  const continuation = <section className="min-w-0 flex-1 space-y-3"><h2 className="text-xl font-extrabold">{contSec?.label}</h2>{historyList.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{historyList.map(([id, p]) => (
    <button data-nav key={id} onClick={() => setPlaying({ src: p.url, title: p.title, itemId: id, logo: p.logo })}
      className="overflow-hidden rounded-2xl border bg-card text-start transition hover:border-primary focus:border-primary focus:outline-none">
      <div className="flex aspect-video items-center justify-center bg-secondary">
        {p.logo ? <img src={p.logo} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <Play className="h-8 w-8 text-muted-foreground" />}
      </div>
      <p className="line-clamp-2 p-2 text-sm font-bold">{p.title}</p>
      <div className="h-1 bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }} /></div>
    </button>
  ))}</div> : <p className="py-12 text-center text-muted-foreground">لا توجد مشاهدة سابقة</p>}</section>;
  const appList = layout.apps.filter((a) => a.name && a.url).slice(0, appsSec?.limit || 50);
  const openApp = (url: string) => { if (session.type === "demo") { toast.info(`سيفتح: ${url}`); return; } window.open(url, "_blank", "noopener"); };
  const appsView = appsSec && <section className="min-w-0 flex-1 space-y-3"><h2 className="text-xl font-extrabold">{appsSec.label}</h2>
    <div className={appsSec.view === "row" ? "flex gap-3 overflow-x-auto pb-2" : `grid gap-3 ${SIZE[appsSec.size].grid}`}>
      {appList.map((a, i) => <button data-nav key={i} onClick={() => openApp(a.url)} className={`${appsSec.view === "row" ? `${SIZE[appsSec.size].row} shrink-0` : ""} overflow-hidden rounded-2xl border bg-card text-center transition hover:border-primary focus:border-primary focus:outline-none`}>
        <div className="flex aspect-square items-center justify-center bg-secondary p-4">{a.logo ? <img src={a.logo} alt={a.name} loading="lazy" className="h-full w-full object-contain" /> : <span className="text-3xl font-extrabold text-primary">{a.name[0]}</span>}</div>
        <p className="line-clamp-1 p-2 text-sm font-bold">{a.name}</p></button>)}
    </div></section>;
  const content = screen === "home" ? home : screen === "apps" ? appsView : screen === "continue" ? continuation : tabs.length ? body : <p className="py-12 text-center text-muted-foreground">كل الأقسام مخفية</p>;

  return (
    <div className={`space-y-4 ${tpl === "cinema" ? "pb-24" : ""}`}>
      {playing && <VideoPlayer src={playing.src} title={playing.title} slug={cfg.slug} itemId={playing.itemId} logo={playing.logo} onClose={() => setPlaying(null)} />}
      <Announcements cfg={cfg} />
      {tpl === "sidebar" ? <div className="flex gap-6 max-md:flex-col">{nav}{content}</div> : <>{nav}{content}</>}
    </div>
  );
}
