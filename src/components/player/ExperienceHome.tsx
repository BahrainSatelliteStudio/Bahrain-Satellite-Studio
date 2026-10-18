import { ChevronLeft, Play, Tv, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AppLayout } from "@/lib/layout";
import type { MediaItem } from "@/lib/player/media";
import type { Progress } from "@/lib/player/prefs";
import { WatchHistory } from "./WatchHistory";
import horizon from "@/assets/preview/cinema-horizon.jpg";

export function ExperienceHome({ name, layout, catalog, favorites, history, card, onOpen, onBrowse, onResume, onRemove, demo, english, busy }: {
  name: string; layout: AppLayout; catalog: MediaItem[]; favorites: MediaItem[]; history: [string, Progress][];
  card: (item: MediaItem, extra?: string) => ReactNode; onOpen: (item: MediaItem) => void;
  onBrowse: (key: "live" | "movie" | "series" | "fav") => void; onResume: (id: string, p: Progress) => void; onRemove: (id: string) => void;
  demo: boolean; english: boolean; busy: boolean;
}) {
  const featured = catalog.find((it) => layout.sections.some((s) => s.key === it.kind && s.visible));
  const continueSection = layout.sections.find((s) => s.key === "continue" && s.visible);
  const live = layout.sections.find((s) => s.key === "live" && s.visible);
  const fav = layout.sections.find((s) => s.key === "fav" && s.visible);
  return <div className="min-w-0 space-y-8">
    <section className="experience-feature relative isolate overflow-hidden" aria-label={name}>
      {(demo || featured?.logo) && <img src={demo ? horizon : featured?.logo} alt="" width={1536} height={864} className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <div className="experience-shade absolute inset-0 -z-10" />
      <div className="max-w-lg space-y-4 px-5 py-8 sm:px-8 sm:py-12">
        <p className="flex items-center gap-2 text-sm font-bold text-primary"><span className="h-1 w-8 bg-primary" />{english ? "YOUR SCREEN. YOUR WORLD." : "شاشتك. عالمك."}</p>
        <h1 className="break-words text-3xl font-extrabold sm:text-4xl">{name}</h1>
        <p className="max-w-sm text-sm leading-7 text-foreground/80">{demo ? (english ? "Cinema, stories and live moments." : "سينما، حكايات، ولحظات على الهواء.") : featured?.name ?? (english ? "Your library" : "مكتبتك")}</p>
        <div className="flex flex-wrap gap-3">
          {featured && <Button data-nav size="lg" onClick={() => onOpen(featured)}><Play />{english ? "Explore title" : "اكتشف العمل"}</Button>}
          {live && <Button data-nav size="lg" variant="secondary" onClick={() => onBrowse("live")}><Tv />{live.label}</Button>}
        </div>
      </div>
    </section>
    {continueSection && history.length > 0 && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">{continueSection.label}</h2></div><WatchHistory entries={history} row onPlay={onResume} onRemove={onRemove} english={english} /></section>}
    {fav && favorites.length > 0 && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-extrabold"><Heart className="h-5 w-5 text-primary" />{fav.label}</h2><Button data-nav variant="ghost" onClick={() => onBrowse("fav")}>{english ? "See all" : "عرض الكل"}<ChevronLeft /></Button></div><div className="flex gap-4 overflow-x-auto pb-3">{favorites.slice(0, fav.limit || 12).map((it) => card(it, "w-40 shrink-0"))}</div></section>}
    {layout.sections.filter((s) => s.visible && (s.key === "movie" || s.key === "series")).map((s) => {
      const entries = catalog.filter((it) => it.kind === s.key).slice(0, s.limit || 12);
      return <section key={s.key} aria-label={s.label} className="space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">{s.label}</h2><Button data-nav variant="ghost" onClick={() => onBrowse(s.key as "movie" | "series")}>{english ? "See all" : "عرض الكل"}<ChevronLeft /></Button></div>
        {entries.length > 0 ? <div className={s.view === "row" ? "flex gap-4 overflow-x-auto pb-3" : "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5"}>{entries.map((it) => card(it, s.view === "row" ? "w-40 shrink-0" : ""))}</div>
          : <div className="border-y py-8 text-muted-foreground">{busy ? (english ? "Loading library…" : "جارٍ تحميل المكتبة…") : (english ? "No titles available" : "لا توجد أعمال متاحة")}</div>}
      </section>;
    })}
  </div>;
}