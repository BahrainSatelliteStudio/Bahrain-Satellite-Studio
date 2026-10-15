import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tv, Film, Clapperboard, Heart, LogOut, Search, MessageCircle, Send, Phone, ChevronRight, Loader2, Settings, Play, History } from "lucide-react";
import { xtreamApi, m3uFetch, macCall } from "@/lib/iptv.functions";
import { prefs, t as str, type AppSettings, type Lang } from "@/lib/player/prefs";
import { VideoPlayer } from "./VideoPlayer";

export type TenantConfig = {
  slug: string; name: string; logo_url: string | null; primary_color: string; accent_color: string;
  theme: "default" | "blue" | "cinema";
  support_whatsapp: string | null; support_telegram: string | null; support_phone: string | null;
  latest_version: string; min_version: string; update_url: string | null;
  sources: { id: string; type: string; name: string }[];
  announcements: { id: string; title: string; body: string | null; image_url: string | null }[];
};

type Session =
  | { type: "xtream"; sourceId: string; username: string; password: string }
  | { type: "m3u"; sourceId: string }
  | { type: "mac"; sourceId: string; mac: string; token: string };
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

export function PlayerApp({ cfg }: { cfg: TenantConfig }) {
  const key = `iptv:${cfg.slug}`;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [appVer, setAppVer] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => prefs.settings(cfg.slug));
  const [langChosen, setLangChosen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  useTvNav();

  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setSession(JSON.parse(s)); } catch {}
    const v = new URLSearchParams(location.search).get("v") || sessionStorage.getItem("appver");
    if (v) { sessionStorage.setItem("appver", v); setAppVer(v); }
    setLangChosen(!!localStorage.getItem(`${key}:langChosen`));
    setReady(true);
  }, [key]);

  const L = str(settings.lang);
  const theme = settings.theme === "auto" ? cfg.theme : settings.theme;
  const style = { "--primary": cfg.primary_color, "--ring": cfg.primary_color, "--accent": cfg.accent_color, "--primary-foreground": "oklch(0.99 0 0)" } as React.CSSProperties;
  const themeClass = theme === "blue" ? "theme-blue" : theme === "cinema" ? "theme-cinema" : "";

  const saveSettings = (s: AppSettings) => { setSettings(s); prefs.saveSettings(cfg.slug, s); };

  if (!ready) return <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang}><div /></Shell>;

  // شاشة اختيار اللغة عند أول تشغيل
  if (!langChosen) {
    return (
      <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang}>
        <div className="mx-auto mt-20 max-w-sm space-y-4 text-center">
          {cfg.logo_url && <img src={cfg.logo_url} alt="" className="mx-auto h-24 w-24 rounded-3xl object-cover" />}
          <h1 className="text-2xl font-extrabold">{cfg.name}</h1>
          <p className="text-muted-foreground">اختر اللغة · Choose your language</p>
          <div className="grid gap-3">
            {(["ar", "en"] as Lang[]).map((l) => (
              <button key={l} data-nav autoFocus={l === "ar"} onClick={() => { saveSettings({ ...settings, lang: l }); localStorage.setItem(`${key}:langChosen`, "1"); setLangChosen(true); }}
                className="rounded-2xl border bg-card py-4 text-lg font-extrabold focus:outline-none">
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
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
    <Shell cfg={cfg} style={style} themeClass={themeClass} lang={settings.lang}
      onSettings={() => setShowSettings(true)}
      onLogout={session ? () => { localStorage.removeItem(key); setSession(null); } : undefined}>
      {showSettings && <SettingsDialog cfg={cfg} settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
      {session
        ? <Browser cfg={cfg} session={session} settings={settings} />
        : <Login cfg={cfg} onDone={(s) => { localStorage.setItem(key, JSON.stringify(s)); setSession(s); }} />}
    </Shell>
  );
}

function Shell({ cfg, style, themeClass, lang, children, onLogout, onSettings }: {
  cfg: TenantConfig; style: React.CSSProperties; themeClass: string; lang: Lang;
  children: React.ReactNode; onLogout?: (() => void) | undefined; onSettings?: (() => void) | undefined;
}) {
  return (
    <div style={style} dir={lang === "ar" ? "rtl" : "ltr"} className={`min-h-screen bg-background text-foreground ${themeClass}`}>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
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
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-4">{children}</main>
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
                {(["auto", "default", "blue", "cinema"] as const).map((th) => (
                  <button key={th} data-nav onClick={() => onSave({ ...settings, theme: th })}
                    className={`rounded-xl border py-2 text-xs font-bold ${settings.theme === th ? "border-primary bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {{ auto: L.themeAuto, default: L.themeDefault, blue: L.themeBlue, cinema: L.themeCinema }[th]}
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

function Login({ cfg, onDone }: { cfg: TenantConfig; onDone: (s: Session) => void }) {
  const types = Array.from(new Set(cfg.sources.map((s) => s.type)));
  const [type, setType] = useState(types[0] ?? "xtream");
  const list = cfg.sources.filter((s) => s.type === type);
  const [sourceId, setSourceId] = useState(list[0]?.id ?? "");
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [mac, setMac] = useState("");
  const [busy, setBusy] = useState(false);
  const xt = useServerFn(xtreamApi); const mc = useServerFn(macCall);
  useEffect(() => { setSourceId(cfg.sources.find((s) => s.type === type)?.id ?? ""); }, [type, cfg.sources]);

  if (!cfg.sources.length) return <p className="mt-16 text-center text-muted-foreground">لا توجد سيرفرات مضافة لهذا التطبيق بعد.</p>;
  const labels: Record<string, string> = { xtream: "اسم مستخدم", m3u: "قائمة M3U", mac: "عنوان MAC" };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (type === "xtream") {
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
        {list.length > 1 && <select className={field} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
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

function Browser({ cfg, session, settings }: { cfg: TenantConfig; session: Session; settings: AppSettings }) {
  const xt = useServerFn(xtreamApi); const m3 = useServerFn(m3uFetch); const mc = useServerFn(macCall);
  const L = str(settings.lang);
  const tabs: { k: Kind | "fav"; label: string; icon: typeof Tv }[] = session.type === "xtream"
    ? [{ k: "live", label: L.live, icon: Tv }, { k: "movie", label: L.movies, icon: Film }, { k: "series", label: L.series, icon: Clapperboard }, { k: "fav", label: L.fav, icon: Heart }]
    : [{ k: "live", label: L.channels, icon: Tv }, { k: "fav", label: L.fav, icon: Heart }];
  const [tab, setTab] = useState<Kind | "fav">("live");
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [series, setSeries] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [m3uAll, setM3uAll] = useState<{ name: string; group: string; logo: string; url: string }[] | null>(null);
  const favKey = `iptv:${cfg.slug}:fav`;
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
      if (session.type === "xtream") {
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
      if (session.type === "xtream") {
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
    const itemId = it.kind === "live" ? undefined : `${it.kind}:${it.id}`;
    if (it.url) return setPlaying({ src: it.url, title: it.name, itemId, logo: it.logo });
    if (it.cmd && session.type === "mac") run(async () => {
      const r: any = await mc({ data: { slug: cfg.slug, sourceId: session.sourceId, mac: session.mac, token: session.token, op: "link", cmd: it.cmd } });
      setPlaying({ src: r.url, title: it.name });
    });
  }

  const shown = useMemo(() => {
    const src = tab === "fav" ? favs : items;
    return q ? src.filter((i) => i.name?.toLowerCase().includes(q.toLowerCase())) : src;
  }, [items, favs, tab, q]);
  const shownCats = q && !cat ? cats.filter((c) => c.name?.toLowerCase().includes(q.toLowerCase())) : cats;
  const showItems = tab === "fav" || cat;
  const historyList = Object.entries(history).sort((a, b) => b[1].at - a[1].at).slice(0, 12);

  return (
    <div className="space-y-4">
      {playing && <VideoPlayer src={playing.src} title={playing.title} slug={cfg.slug} itemId={playing.itemId} logo={playing.logo} onClose={() => setPlaying(null)} />}
      <Announcements cfg={cfg} />
      <nav className="flex gap-2 overflow-x-auto">
        {tabs.map((tb) => <button data-nav key={tb.k} onClick={() => setTab(tb.k)} className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 font-bold transition ${tab === tb.k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}><tb.icon className="h-5 w-5" />{tb.label}</button>)}
      </nav>
      <div className="flex items-center gap-2">
        {(cat || series) && <button data-nav onClick={() => (series ? (setSeries(null), cat && openCat(cat)) : (setCat(null), setItems([])))} className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-3 text-sm font-bold"><ChevronRight className="h-4 w-4" />{L.back}</button>}
        <div className="relative flex-1"><Search className="absolute start-3 top-3.5 h-5 w-5 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} className={`${field} ps-11`} /></div>
      </div>

      {/* أكمل المشاهدة */}
      {!showItems && !q && historyList.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><History className="h-5 w-5 text-primary" />{L.continueWatching}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {historyList.map(([id, p]) => (
              <button data-nav key={id} onClick={() => setPlaying({ src: p.url, title: p.title, itemId: id, logo: p.logo })}
                className="group relative w-40 shrink-0 overflow-hidden rounded-2xl border bg-card text-start focus:outline-none">
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

      {(cat || series) && <h2 className="text-lg font-extrabold">{series?.name ?? cat?.name}</h2>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : !showItems ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {shownCats.map((c) => <button data-nav key={c.id} onClick={() => openCat(c)} className="rounded-2xl border bg-card p-4 text-start font-bold transition hover:border-primary focus:border-primary focus:outline-none">{c.name}</button>)}
            {!shownCats.length && <p className="col-span-full py-10 text-center text-muted-foreground">{L.noCats}</p>}
          </div>
        ) : (
          <div className="poster-grid grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {shown.slice(0, 600).map((it) => {
              const fav = favs.some((f) => f.id === it.id && f.kind === it.kind);
              return (
                <div key={it.kind + it.id} className="group relative overflow-hidden rounded-2xl border bg-card transition hover:border-primary focus-within:border-primary">
                  <button data-nav onClick={() => play(it)} className="block w-full text-start focus:outline-none">
                    <div className={`flex items-center justify-center bg-secondary ${it.kind === "live" ? "aspect-video" : "aspect-[2/3]"}`}>
                      {it.logo ? <img src={it.logo} alt="" loading="lazy" className="h-full w-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <Tv className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <p className="line-clamp-2 p-2 text-sm font-bold">{it.name}</p>
                  </button>
                  {it.kind !== "episode" && <button data-nav aria-label="مفضلة" onClick={() => toggleFav(it)} className="absolute end-2 top-2 rounded-full bg-background/80 p-1.5"><Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} /></button>}
                </div>
              );
            })}
            {!shown.length && <p className="col-span-full py-10 text-center text-muted-foreground">{L.noContent}</p>}
          </div>
        )}
    </div>
  );
}
