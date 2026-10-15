import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tv, Film, Clapperboard, Heart, LogOut, Search, MessageCircle, Send, Phone, ChevronRight, Loader2 } from "lucide-react";
import { xtreamApi, m3uFetch, macCall } from "@/lib/iptv.functions";
import { VideoPlayer } from "./VideoPlayer";

export type TenantConfig = {
  slug: string; name: string; logo_url: string | null; primary_color: string; accent_color: string;
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

const cmpVer = (a: string, b: string) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

export function PlayerApp({ cfg }: { cfg: TenantConfig }) {
  const key = `iptv:${cfg.slug}`;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [appVer, setAppVer] = useState<string | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setSession(JSON.parse(s)); } catch {}
    const v = new URLSearchParams(location.search).get("v") || sessionStorage.getItem("appver");
    if (v) { sessionStorage.setItem("appver", v); setAppVer(v); }
    setReady(true);
  }, [key]);

  const style = { "--primary": cfg.primary_color, "--ring": cfg.primary_color, "--accent": cfg.accent_color, "--primary-foreground": "oklch(0.99 0 0)" } as React.CSSProperties;

  if (appVer && cmpVer(appVer, cfg.min_version) < 0) {
    return (
      <Shell cfg={cfg} style={style}>
        <div className="mx-auto mt-16 max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center">
          <h2 className="text-xl font-extrabold">يتوفر تحديث إجباري</h2>
          <p className="text-muted-foreground">نسختك {appVer} — أحدث نسخة {cfg.latest_version}. حمّل التحديث للمتابعة.</p>
          {cfg.update_url && <a href={cfg.update_url} className="block rounded-xl bg-primary py-3 font-bold text-primary-foreground">تحميل التحديث</a>}
        </div>
      </Shell>
    );
  }
  if (!ready) return <Shell cfg={cfg} style={style}><div /></Shell>;
  return (
    <Shell cfg={cfg} style={style} onLogout={session ? () => { localStorage.removeItem(key); setSession(null); } : undefined}>
      {session ? <Browser cfg={cfg} session={session} /> : <Login cfg={cfg} onDone={(s) => { localStorage.setItem(key, JSON.stringify(s)); setSession(s); }} />}
    </Shell>
  );
}

function Shell({ cfg, style, children, onLogout }: { cfg: TenantConfig; style: React.CSSProperties; children: React.ReactNode; onLogout?: (() => void) | undefined }) {
  return (
    <div style={style} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {cfg.logo_url ? <img src={cfg.logo_url} alt={cfg.name} className="h-10 w-10 rounded-xl object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">{cfg.name[0]}</div>}
          <span className="text-lg font-extrabold">{cfg.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {cfg.support_whatsapp && <a aria-label="واتساب" href={`https://wa.me/${cfg.support_whatsapp.replace(/\D/g, "")}`} className="rounded-lg bg-secondary p-2"><MessageCircle className="h-5 w-5" /></a>}
          {cfg.support_telegram && <a aria-label="تلغرام" href={`https://t.me/${cfg.support_telegram.replace(/^@/, "")}`} className="rounded-lg bg-secondary p-2"><Send className="h-5 w-5" /></a>}
          {cfg.support_phone && <a aria-label="اتصال" href={`tel:${cfg.support_phone}`} className="rounded-lg bg-secondary p-2"><Phone className="h-5 w-5" /></a>}
          {onLogout && <button aria-label="خروج" onClick={onLogout} className="rounded-lg bg-secondary p-2"><LogOut className="h-5 w-5" /></button>}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-4">{children}</main>
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
            {types.map((t) => <button type="button" key={t} onClick={() => setType(t)} className={`rounded-lg py-2 text-sm font-bold ${t === type ? "bg-primary text-primary-foreground" : ""}`}>{labels[t]}</button>)}
          </div>
        )}
        {list.length > 1 && <select className={field} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        {type === "xtream" && <>
          <input className={field} dir="ltr" placeholder="اسم المستخدم" required value={u} onChange={(e) => setU(e.target.value)} />
          <input className={field} dir="ltr" type="password" placeholder="كلمة المرور" required value={p} onChange={(e) => setP(e.target.value)} />
        </>}
        {type === "mac" && <input className={field} dir="ltr" placeholder="00:1A:79:XX:XX:XX" required pattern="([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}" value={mac} onChange={(e) => setMac(e.target.value)} />}
        {type === "m3u" && <p className="text-sm text-muted-foreground">سيتم تحميل القنوات من {list.find((s) => s.id === sourceId)?.name}.</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}دخول</button>
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

function Browser({ cfg, session }: { cfg: TenantConfig; session: Session }) {
  const xt = useServerFn(xtreamApi); const m3 = useServerFn(m3uFetch); const mc = useServerFn(macCall);
  const tabs: { k: Kind | "fav"; label: string; icon: typeof Tv }[] = session.type === "xtream"
    ? [{ k: "live", label: "مباشر", icon: Tv }, { k: "movie", label: "أفلام", icon: Film }, { k: "series", label: "مسلسلات", icon: Clapperboard }, { k: "fav", label: "المفضلة", icon: Heart }]
    : [{ k: "live", label: "القنوات", icon: Tv }, { k: "fav", label: "المفضلة", icon: Heart }];
  const [tab, setTab] = useState<Kind | "fav">("live");
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [series, setSeries] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<{ src: string; title: string } | null>(null);
  const [m3uAll, setM3uAll] = useState<{ name: string; group: string; logo: string; url: string }[] | null>(null);
  const favKey = `iptv:${cfg.slug}:fav`;
  const [favs, setFavs] = useState<Item[]>([]);
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem(favKey) || "[]")); } catch {} }, [favKey]);
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
    if (it.url) return setPlaying({ src: it.url, title: it.name });
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

  return (
    <div className="space-y-4">
      {playing && <VideoPlayer src={playing.src} title={playing.title} onClose={() => setPlaying(null)} />}
      <Announcements cfg={cfg} />
      <nav className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 font-bold transition ${tab === t.k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}><t.icon className="h-5 w-5" />{t.label}</button>)}
      </nav>
      <div className="flex items-center gap-2">
        {(cat || series) && <button onClick={() => (series ? (setSeries(null), cat && openCat(cat)) : (setCat(null), setItems([])))} className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-3 text-sm font-bold"><ChevronRight className="h-4 w-4" />رجوع</button>}
        <div className="relative flex-1"><Search className="absolute start-3 top-3.5 h-5 w-5 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className={`${field} ps-11`} /></div>
      </div>
      {(cat || series) && <h2 className="text-lg font-extrabold">{series?.name ?? cat?.name}</h2>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : !showItems ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {shownCats.map((c) => <button key={c.id} onClick={() => openCat(c)} className="rounded-2xl border bg-card p-4 text-start font-bold transition hover:border-primary focus:border-primary focus:outline-none">{c.name}</button>)}
            {!shownCats.length && <p className="col-span-full py-10 text-center text-muted-foreground">لا توجد أقسام</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {shown.slice(0, 600).map((it) => {
              const fav = favs.some((f) => f.id === it.id && f.kind === it.kind);
              return (
                <div key={it.kind + it.id} className="group relative overflow-hidden rounded-2xl border bg-card transition hover:border-primary focus-within:border-primary">
                  <button onClick={() => play(it)} className="block w-full text-start focus:outline-none">
                    <div className={`flex items-center justify-center bg-secondary ${it.kind === "live" ? "aspect-video" : "aspect-[2/3]"}`}>
                      {it.logo ? <img src={it.logo} alt="" loading="lazy" className="h-full w-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <Tv className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <p className="line-clamp-2 p-2 text-sm font-bold">{it.name}</p>
                  </button>
                  {it.kind !== "episode" && <button aria-label="مفضلة" onClick={() => toggleFav(it)} className="absolute end-2 top-2 rounded-full bg-background/80 p-1.5"><Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} /></button>}
                </div>
              );
            })}
            {!shown.length && <p className="col-span-full py-10 text-center text-muted-foreground">لا يوجد محتوى</p>}
          </div>
        )}
    </div>
  );
}
