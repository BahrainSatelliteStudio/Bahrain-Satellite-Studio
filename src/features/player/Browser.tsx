import { ExperienceHome } from "@/components/player/ExperienceHome";
import { ExperienceNav } from "@/components/player/ExperienceNav";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Button } from "@/components/ui/button";
import { m3uFetch, macCall, xtreamApi } from "@/lib/iptv.functions";
import { ICONS, resolveLayout, type AppLayout, type SectionCfg } from "@/lib/layout";
import { PREVIEW_CATALOG } from "@/lib/player/demo";
import { progressKey, progressNamespace } from "@/lib/player/media";
import { prefs, t as str, type AppSettings } from "@/lib/player/prefs";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronRight,
  Heart,
  History,
  House,
  Loader2,
  Play,
  Search,
  Settings,
  Tv,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Announcements } from "./Announcements";
import type { Cat, Item, Kind, Playing, Session, TenantConfig } from "./types";
const field =
  "w-full rounded-xl border bg-input/40 px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
const DEMO_CATS: Record<Kind, string[]> = {
  live: ["رياضة", "أخبار", "أطفال", "وثائقي", "منوعات"],
  movie: ["أكشن", "دراما", "كوميديا", "رعب"],
  series: ["خليجي", "تركي", "أجنبي", "كرتون"],
};
const demoItems = (kind: Kind, cat?: string): Item[] =>
  kind === "live"
    ? Array.from({ length: 12 }, (_, i) => ({
        id: `live-${cat}-${i}`,
        name: `${cat ?? "قناة"} ${i + 1}`,
        kind,
        url: "",
      }))
    : PREVIEW_CATALOG[kind]
        .filter((item) => !cat || item.category === cat)
        .map((item, i) => ({
          id: `${kind}-${i}-${item.name}`,
          name: item.name,
          logo: item.logo,
          kind,
          url: "",
        }));

const SIZE: Record<SectionCfg["size"], { grid: string; row: string }> = {
  sm: { grid: "grid-cols-3 sm:grid-cols-5 lg:grid-cols-8", row: "w-28" },
  md: { grid: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6", row: "w-40" },
  lg: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", row: "w-56" },
};

export function Browser({
  cfg,
  session,
  settings,
  layout,
  onSettings,
}: {
  cfg: TenantConfig;
  session: Session;
  settings: AppSettings;
  layout: AppLayout;
  onSettings: () => void;
}) {
  const xt = useServerFn(xtreamApi);
  const m3 = useServerFn(m3uFetch);
  const mc = useServerFn(macCall);
  const L = str(settings.lang);
  const full = session.type === "xtream" || session.type === "demo";
  const tabs = layout.sections.filter(
    (s) =>
      s.visible &&
      s.key !== "continue" &&
      s.key !== "apps" &&
      (full || s.key === "live" || s.key === "fav"),
  ) as (SectionCfg & { key: Kind | "fav" })[];
  const contSec =
    layout.sections.find((s) => s.key === "continue") ?? resolveLayout(null).sections[0];
  const appsSec = layout.sections.find((s) => s.key === "apps");
  const showApps = !!appsSec?.visible && layout.apps.some((a) => a.name && a.url);
  const [screen, setScreen] = useState<"home" | "browse" | "continue" | "apps">("home");
  const [tab, setTab] = useState<Kind | "fav">(tabs[0]?.key ?? "live");
  useEffect(() => {
    const first = tabs[0];
    if (first && !tabs.some((t) => t.key === tab)) setTab(first.key);
  }, [tabs, tab]);
  const sec =
    tabs.find((t) => t.key === tab) ??
    resolveLayout(null).sections.find((s) => s.key === tab) ??
    ({
      key: "live",
      visible: false,
      label: "",
      icon: "tv",
      view: "grid",
      size: "md",
      limit: 0,
      hiddenCats: [],
    } satisfies SectionCfg);
  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [series, setSeries] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [m3uAll, setM3uAll] = useState<
    { name: string; group: string; logo: string; url: string }[] | null
  >(null);
  const namespace = progressNamespace(cfg.slug, session.type === "demo");
  const favKey = `iptv:${namespace}:fav`;
  const [favs, setFavs] = useState<Item[]>([]);
  const [history, setHistory] = useState<Record<string, import("@/lib/player/prefs").Progress>>({});
  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(favKey) || "[]"));
    } catch {}
  }, [favKey, settings]);
  useEffect(() => {
    if (!playing) setHistory(prefs.progress(namespace));
  }, [playing, namespace, settings]);
  const toggleFav = (it: Item) => {
    const next = favs.some((f) => f.id === it.id && f.kind === it.kind)
      ? favs.filter((f) => !(f.id === it.id && f.kind === it.kind))
      : [...favs, it];
    setFavs(next);
    localStorage.setItem(favKey, JSON.stringify(next));
  };

  const xBase = {
    slug: cfg.slug,
    sourceId: session.sourceId,
    username: (session as any).username,
    password: (session as any).password,
  };
  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في التحميل");
    }
    setLoading(false);
  };

  useEffect(() => {
    setCat(null);
    setItems([]);
    setSeries(null);
    setQ("");
    if (tab === "fav") return;
    run(async () => {
      if (session.type === "demo") {
        setCats(DEMO_CATS[tab].map((n) => ({ id: n, name: n })));
      } else if (session.type === "xtream") {
        const action =
          tab === "live"
            ? "get_live_categories"
            : tab === "movie"
              ? "get_vod_categories"
              : "get_series_categories";
        const r = await xt({ data: { ...xBase, action } });
        setCats(
          ((r.json as any[]) ?? []).map((c) => ({
            id: String(c.category_id),
            name: c.category_name,
          })),
        );
      } else if (session.type === "m3u") {
        const all = m3uAll ?? (await m3({ data: { slug: cfg.slug, sourceId: session.sourceId } }));
        setM3uAll(all);
        setCats(Array.from(new Set(all.map((i) => i.group))).map((g) => ({ id: g, name: g })));
      } else {
        const r: any = await mc({
          data: {
            slug: cfg.slug,
            sourceId: session.sourceId,
            mac: session.mac,
            token: session.token,
            op: "genres",
          },
        });
        setCats((r ?? []).map((g: any) => ({ id: String(g.id), name: g.title })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function openCat(c: Cat) {
    setCat(c);
    setQ("");
    run(async () => {
      if (session.type === "demo") {
        setItems(demoItems(tab as Kind, c.name));
      } else if (session.type === "xtream") {
        const action =
          tab === "live" ? "get_live_streams" : tab === "movie" ? "get_vod_streams" : "get_series";
        const r = await xt({ data: { ...xBase, action, extra: { category_id: c.id } } });
        const b = r.base,
          u = encodeURIComponent(xBase.username),
          p = encodeURIComponent(xBase.password);
        setItems(
          ((r.json as any[]) ?? []).map((s) =>
            tab === "series"
              ? { id: String(s.series_id), name: s.name, logo: s.cover, kind: "series" as const }
              : {
                  id: String(s.stream_id),
                  name: s.name,
                  logo: s.stream_icon,
                  kind: tab as Kind,
                  url:
                    tab === "live"
                      ? `${b}/live/${u}/${p}/${s.stream_id}.m3u8`
                      : `${b}/movie/${u}/${p}/${s.stream_id}.${s.container_extension || "mp4"}`,
                },
          ),
        );
      } else if (session.type === "m3u") {
        setItems(
          (m3uAll ?? [])
            .filter((i) => i.group === c.id)
            .map((i, n) => ({
              id: i.url + n,
              name: i.name,
              logo: i.logo,
              url: i.url,
              kind: "live" as const,
            })),
        );
      } else {
        const r: any = await mc({
          data: {
            slug: cfg.slug,
            sourceId: session.sourceId,
            mac: session.mac,
            token: session.token,
            op: "channels",
            genre: c.id,
          },
        });
        setItems(
          (r?.data ?? []).map((ch: any) => ({
            id: String(ch.id),
            name: ch.name,
            logo: ch.logo,
            cmd: ch.cmd,
            kind: "live" as const,
          })),
        );
      }
    });
  }

  function openSeries(it: Item) {
    setSeries(it);
    if (session.type === "demo") {
      setItems(
        Array.from({ length: 8 }, (_, i) => ({
          id: `${it.id}-e${i}`,
          name: `الحلقة ${i + 1}`,
          kind: "episode" as const,
          url: "",
        })),
      );
      return;
    }
    run(async () => {
      const r = await xt({
        data: { ...xBase, action: "get_series_info", extra: { series_id: it.id } },
      });
      const eps = (r.json as any)?.episodes ?? {};
      const u = encodeURIComponent(xBase.username),
        p = encodeURIComponent(xBase.password);
      setItems(
        Object.entries(eps).flatMap(([season, list]) =>
          (list as any[]).map((e) => ({
            id: String(e.id),
            name: `م${season} — ${e.title}`,
            logo: e.info?.movie_image || it.logo,
            kind: "episode" as const,
            url: `${r.base}/series/${u}/${p}/${e.id}.${e.container_extension || "mp4"}`,
          })),
        ),
      );
    });
  }

  async function play(it: Item) {
    if (it.kind === "series") return openSeries(it);
    if (session.type === "demo") {
      toast.info("هذا عرض تجريبي — التشغيل يعمل بعد تسجيل الدخول");
      return;
    }
    const itemId = progressKey(it.kind, it.id);
    if (it.url) return setPlaying({ src: it.url, title: it.name, itemId, logo: it.logo });
    if (it.cmd && session.type === "mac")
      run(async () => {
        const r: any = await mc({
          data: {
            slug: cfg.slug,
            sourceId: session.sourceId,
            mac: session.mac,
            token: session.token,
            op: "link",
            cmd: it.cmd,
          },
        });
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
  const shownCats =
    q && !cat ? visCats.filter((c) => c.name?.toLowerCase().includes(q.toLowerCase())) : visCats;
  const showItems = tab === "fav" || cat;
  const historyList = Object.entries(history)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, contSec?.limit || 12);
  const tpl = layout.template;
  const sz = SIZE[sec.size];

  const nav = (
    <nav
      aria-label="أقسام التطبيق"
      className={
        tpl === "sidebar"
          ? "flex shrink-0 flex-col gap-1 md:sticky md:top-4 md:w-60 md:self-start max-md:flex-row max-md:overflow-x-auto"
          : tpl === "cinema"
            ? "fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-card/95 px-2 py-2 backdrop-blur"
            : tpl === "kids"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
              : tpl === "minimal"
                ? "flex flex-wrap justify-center gap-2"
                : tpl === "sports"
                  ? "flex gap-2 overflow-x-auto border-b pb-3"
                  : "flex gap-2 overflow-x-auto"
      }
    >
      {tpl === "sidebar" && (
        <div className="mb-5 hidden min-h-24 items-center justify-center gap-3 md:flex">
          {cfg.logo_url && (
            <img src={cfg.logo_url} alt={cfg.name} className="max-h-24 max-w-full object-contain" />
          )}
          {!cfg.logo_url && (
            <h1 className="text-center text-2xl font-extrabold text-primary">{cfg.name}</h1>
          )}
        </div>
      )}
      <Button
        data-nav
        variant="ghost"
        onClick={() => setScreen("home")}
        className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 ${screen === "home" ? "border-primary text-primary" : "border-border"}`}
      >
        <House />
        الرئيسية
      </Button>
      {tabs.map((tb) => {
        const Icon = ICONS[tb.icon] ?? Tv;
        const on = screen === "browse" && tab === tb.key;
        return tpl === "cinema" ? (
          <Button
            variant="ghost"
            data-nav
            key={tb.key}
            onClick={() => {
              setTab(tb.key);
              setScreen("browse");
            }}
            className={`h-auto flex-1 flex-col gap-1 py-1.5 text-xs font-bold ${on ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon />
            {tb.label}
          </Button>
        ) : tpl === "kids" ? (
          <Button
            variant="ghost"
            data-nav
            key={tb.key}
            onClick={() => {
              setTab(tb.key);
              setScreen("browse");
            }}
            className={`h-auto flex-col gap-2 rounded-3xl border-2 py-6 text-base font-extrabold ${on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card"}`}
          >
            <Icon className="h-8 w-8" />
            {tb.label}
          </Button>
        ) : tpl === "minimal" ? (
          <Button
            variant="ghost"
            data-nav
            key={tb.key}
            onClick={() => {
              setTab(tb.key);
              setScreen("browse");
            }}
            className={`h-auto gap-2 rounded-full border px-5 py-2.5 text-sm font-bold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            <Icon className="h-4 w-4" />
            {tb.label}
          </Button>
        ) : tpl === "sports" ? (
          <Button
            variant="ghost"
            data-nav
            key={tb.key}
            onClick={() => {
              setTab(tb.key);
              setScreen("browse");
            }}
            className={`h-auto shrink-0 gap-2 rounded-none border-b-4 px-5 py-3 text-base font-extrabold ${on ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            <Icon />
            {tb.label}
          </Button>
        ) : (
          <Button
            variant="ghost"
            data-nav
            key={tb.key}
            onClick={() => {
              setTab(tb.key);
              setScreen("browse");
            }}
            className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 font-bold ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}
          >
            <Icon />
            {tb.label}
          </Button>
        );
      })}
      {contSec?.visible && (
        <Button
          data-nav
          variant="ghost"
          onClick={() => setScreen("continue")}
          className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 ${screen === "continue" ? "border-primary text-primary" : "border-border"}`}
        >
          <History />
          {contSec.label}
        </Button>
      )}
      {showApps &&
        appsSec &&
        (() => {
          const AIcon = ICONS[appsSec.icon] ?? Tv;
          return (
            <Button
              data-nav
              variant="ghost"
              onClick={() => setScreen("apps")}
              className={`h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4 ${screen === "apps" ? "border-primary text-primary" : "border-border"}`}
            >
              <AIcon />
              {appsSec.label}
            </Button>
          );
        })()}
      {tpl === "sidebar" && (
        <Button
          data-nav
          variant="ghost"
          onClick={onSettings}
          className="h-auto shrink-0 justify-start gap-3 rounded-lg border px-4 py-4"
        >
          <Settings />
          {L.settings}
        </Button>
      )}
    </nav>
  );

  const card = (it: Item, extra = "") => {
    const fav = favs.some((f) => f.id === it.id && f.kind === it.kind);
    return (
      <div
        key={it.kind + it.id}
        className={`group relative overflow-hidden rounded-lg border border-primary/40 bg-card transition hover:border-primary focus-within:border-primary ${extra}`}
      >
        <Button
          variant="ghost"
          data-nav
          onClick={() => play(it)}
          className="block h-auto w-full whitespace-normal rounded-none p-0 text-start hover:bg-card focus:outline-none"
        >
          <div
            className={`flex items-center justify-center bg-secondary ${it.kind === "live" ? "aspect-video" : "aspect-[2/3]"}`}
          >
            {it.logo ? (
              <img
                src={it.logo}
                alt={it.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <Tv className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <p className="line-clamp-2 p-2 text-sm font-bold">{it.name}</p>
        </Button>
        {it.kind !== "episode" && (
          <Button
            size="icon"
            variant="ghost"
            data-nav
            aria-label={`مفضلة ${it.name}`}
            onClick={() => toggleFav(it)}
            className="absolute end-2 top-2 h-7 w-7 rounded-full bg-background/80"
          >
            <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
          </Button>
        )}
      </div>
    );
  };

  const ContIcon = ICONS[contSec?.icon ?? "history"] ?? History;
  const body = (
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        {(cat || series) && (
          <button
            data-nav
            onClick={() =>
              series ? (setSeries(null), cat && openCat(cat)) : (setCat(null), setItems([]))
            }
            className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-3 text-sm font-bold"
          >
            <ChevronRight className="h-4 w-4" />
            {L.back}
          </button>
        )}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L.search}
            className={`${field} ps-11`}
          />
        </div>
      </div>

      {contSec?.visible && !showItems && !q && historyList.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <ContIcon className="h-5 w-5 text-primary" />
            {contSec.label}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {historyList.map(([id, p]) => (
              <button
                data-nav
                key={id}
                onClick={() => setPlaying({ src: p.url, title: p.title, itemId: id, logo: p.logo })}
                className={`group relative ${SIZE[contSec.size].row} shrink-0 overflow-hidden rounded-2xl border bg-card text-start focus:outline-none`}
              >
                <div className="flex aspect-video items-center justify-center bg-secondary">
                  {p.logo ? (
                    <img
                      src={p.logo}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <Play className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <p className="line-clamp-1 p-2 text-xs font-bold">{p.title}</p>
                <div className="h-1 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-lg font-extrabold">{series?.name ?? cat?.name ?? sec.label}</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !showItems ? (
        tpl === "cinema" || tpl === "minimal" ? (
          <div className="flex flex-wrap gap-2">
            {shownCats.map((c) => (
              <button
                data-nav
                key={c.id}
                onClick={() => openCat(c)}
                className="rounded-full border bg-card px-5 py-2.5 font-bold transition hover:border-primary focus:border-primary focus:outline-none"
              >
                {c.name}
              </button>
            ))}
            {!shownCats.length && (
              <p className="w-full py-10 text-center text-muted-foreground">{L.noCats}</p>
            )}
          </div>
        ) : tpl === "kids" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shownCats.map((c) => (
              <button
                data-nav
                key={c.id}
                onClick={() => openCat(c)}
                className="rounded-3xl border-2 bg-card p-8 text-center text-lg font-extrabold transition hover:border-primary focus:border-primary focus:outline-none"
              >
                {c.name}
              </button>
            ))}
            {!shownCats.length && (
              <p className="col-span-full py-10 text-center text-muted-foreground">{L.noCats}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {shownCats.map((c) => (
              <button
                data-nav
                key={c.id}
                onClick={() => openCat(c)}
                className="rounded-2xl border bg-card p-4 text-start font-bold transition hover:border-primary focus:border-primary focus:outline-none"
              >
                {c.name}
              </button>
            ))}
            {!shownCats.length && (
              <p className="col-span-full py-10 text-center text-muted-foreground">{L.noCats}</p>
            )}
          </div>
        )
      ) : sec.view === "row" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {shown.map((it) => card(it, `${sz.row} shrink-0`))}
          {!shown.length && (
            <p className="w-full py-10 text-center text-muted-foreground">{L.noContent}</p>
          )}
        </div>
      ) : (
        <div className={`poster-grid grid gap-3 ${sz.grid}`}>
          {shown.map((it) => card(it))}
          {!shown.length && (
            <p className="col-span-full py-10 text-center text-muted-foreground">{L.noContent}</p>
          )}
        </div>
      )}
    </div>
  );

  const homeSections = layout.sections.filter(
    (s) => s.visible && (s.key === "movie" || s.key === "series"),
  );
  const home = (
    <div className="min-w-0 flex-1 space-y-5">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="font-extrabold">{cfg.name}</h2>
        <span className="text-xs text-muted-foreground">v{cfg.latest_version}</span>
      </div>
      {homeSections.map((s) => {
        const kind = s.key as "movie" | "series";
        const hiddenCategories = new Set(s.hiddenCats.map((name) => name.trim().toLowerCase()));
        const entries =
          session.type === "demo"
            ? demoItems(kind)
                .filter((item) => {
                  const category = PREVIEW_CATALOG[kind].find(
                    (entry) => entry.name === item.name,
                  )?.category;
                  return !hiddenCategories.has(category?.toLowerCase() ?? "");
                })
                .slice(0, s.limit || 2000)
            : [];
        return (
          <section key={s.key} aria-label={s.label} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{s.label}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTab(kind);
                  setScreen("browse");
                }}
              >
                عرض الكل
                <ChevronRight />
              </Button>
            </div>
            {entries.length > 0 ? (
              <div
                className={
                  s.view === "row"
                    ? "flex gap-3 overflow-x-auto pb-2"
                    : `grid gap-3 ${SIZE[s.size].grid}`
                }
              >
                {entries.map((item) =>
                  card(item, s.view === "row" ? `${SIZE[s.size].row} shrink-0` : ""),
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-24 w-full"
                onClick={() => {
                  setTab(kind);
                  setScreen("browse");
                }}
              >
                {session.type === "demo" ? L.noContent : s.label}
              </Button>
            )}
          </section>
        );
      })}
      {!homeSections.length && (
        <p className="py-12 text-center text-muted-foreground">لا توجد أقسام معروضة في الرئيسية</p>
      )}
    </div>
  );
  const continuation = (
    <section className="min-w-0 flex-1 space-y-3">
      <h2 className="text-xl font-extrabold">{contSec?.label}</h2>
      {historyList.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {historyList.map(([id, p]) => (
            <button
              data-nav
              key={id}
              onClick={() => setPlaying({ src: p.url, title: p.title, itemId: id, logo: p.logo })}
              className="overflow-hidden rounded-2xl border bg-card text-start transition hover:border-primary focus:border-primary focus:outline-none"
            >
              <div className="flex aspect-video items-center justify-center bg-secondary">
                {p.logo ? (
                  <img
                    src={p.logo}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                ) : (
                  <Play className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="line-clamp-2 p-2 text-sm font-bold">{p.title}</p>
              <div className="h-1 bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (p.t / p.d) * 100)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">لا توجد مشاهدة سابقة</p>
      )}
    </section>
  );
  const appList = layout.apps.filter((a) => a.name && a.url).slice(0, appsSec?.limit || 50);
  const openApp = (url: string) => {
    if (session.type === "demo") {
      toast.info(`سيفتح: ${url}`);
      return;
    }
    window.open(url, "_blank", "noopener");
  };
  const appsView = appsSec && (
    <section className="min-w-0 flex-1 space-y-3">
      <h2 className="text-xl font-extrabold">{appsSec.label}</h2>
      <div
        className={
          appsSec.view === "row"
            ? "flex gap-3 overflow-x-auto pb-2"
            : `grid gap-3 ${SIZE[appsSec.size].grid}`
        }
      >
        {appList.map((a, i) => (
          <button
            data-nav
            key={i}
            onClick={() => openApp(a.url)}
            className={`${appsSec.view === "row" ? `${SIZE[appsSec.size].row} shrink-0` : ""} overflow-hidden rounded-2xl border bg-card text-center transition hover:border-primary focus:border-primary focus:outline-none`}
          >
            <div className="flex aspect-square items-center justify-center bg-secondary p-4">
              {a.logo ? (
                <img
                  src={a.logo}
                  alt={a.name}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-3xl font-extrabold text-primary">{a.name[0]}</span>
              )}
            </div>
            <p className="line-clamp-1 p-2 text-sm font-bold">{a.name}</p>
          </button>
        ))}
      </div>
    </section>
  );
  const removeHistory = (id: string) => {
    prefs.clearProgress(namespace, id);
    setHistory(prefs.progress(namespace));
  };
  const xHome =
    tpl === "experience" ? (
      <ExperienceHome
        name={cfg.name}
        layout={layout}
        catalog={session.type === "demo" ? [...demoItems("movie"), ...demoItems("series")] : favs}
        favorites={favs}
        history={historyList}
        card={(it, extra) => card(it as Item, extra)}
        onOpen={(it) => play(it as Item)}
        onBrowse={(k) => {
          setTab(k);
          setScreen("browse");
        }}
        onResume={(id, p) => setPlaying({ src: p.url, title: p.title, itemId: id, logo: p.logo })}
        onRemove={removeHistory}
        demo={session.type === "demo"}
        english={settings.lang === "en"}
        busy={loading}
      />
    ) : null;
  const content =
    screen === "home" ? (
      (xHome ?? home)
    ) : screen === "apps" ? (
      appsView
    ) : screen === "continue" ? (
      continuation
    ) : tabs.length ? (
      body
    ) : (
      <p className="py-12 text-center text-muted-foreground">كل الأقسام مخفية</p>
    );

  return (
    <div className={`space-y-4 ${tpl === "cinema" ? "pb-24" : ""}`}>
      {playing && (
        <VideoPlayer
          src={playing.src}
          title={playing.title}
          slug={namespace}
          itemId={playing.itemId}
          logo={playing.logo}
          onClose={() => setPlaying(null)}
        />
      )}
      <Announcements cfg={cfg} />
      {tpl === "experience" ? (
        <div className="flex gap-6 max-md:flex-col max-md:pb-20">
          <ExperienceNav
            name={cfg.name}
            logo={cfg.logo_url ?? null}
            sections={layout.sections.filter((s) => s.key !== "apps" || showApps)}
            active={screen === "browse" ? tab : screen}
            english={settings.lang === "en"}
            onSettings={onSettings}
            onSelect={(k) => {
              if (k === "home" || k === "continue" || k === "apps") setScreen(k);
              else {
                setTab(k);
                setScreen("browse");
              }
            }}
          />
          <div className="min-w-0 flex-1">{content}</div>
        </div>
      ) : tpl === "sidebar" ? (
        <div className="flex gap-6 max-md:flex-col">
          {nav}
          {content}
        </div>
      ) : (
        <>
          {nav}
          {content}
        </>
      )}
    </div>
  );
}
