import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Progress } from "@/lib/player/prefs";

export function WatchHistory({ entries, onPlay, onRemove, row = false, english = false }: {
  entries: [string, Progress][]; onPlay: (id: string, p: Progress) => void; onRemove: (id: string) => void; row?: boolean; english?: boolean;
}) {
  return <div className={row ? "flex gap-4 overflow-x-auto pb-3" : "grid grid-cols-2 gap-4 lg:grid-cols-3"}>
    {entries.map(([id, p]) => <article key={id} className={`group relative min-w-0 overflow-hidden rounded-lg border bg-card ${row ? "w-60 shrink-0" : ""}`}>
      <Button data-nav variant="ghost" onClick={() => onPlay(id, p)} className="block h-auto w-full whitespace-normal p-0 text-start">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-secondary">
          {p.logo ? <img src={p.logo} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Play className="text-primary" />}
          <span className="absolute bottom-2 start-2 rounded bg-background/90 px-2 py-1 text-xs">{Math.ceil(Math.max(0, p.d - p.t) / 60)} {english ? "min left" : "دقيقة متبقية"}</span>
        </div>
        <div className="space-y-2 p-3"><h3 className="line-clamp-1 text-sm font-bold">{p.title}</h3><progress max={p.d || 1} value={p.t} className="watch-progress" /></div>
      </Button>
      <Button data-nav variant="secondary" size="icon" aria-label={`${english ? "Remove" : "إزالة"} ${p.title}`} title={english ? "Remove from history" : "إزالة من السجل"} onClick={() => onRemove(id)} className="absolute end-2 top-2 h-7 w-7"><X /></Button>
    </article>)}
  </div>;
}