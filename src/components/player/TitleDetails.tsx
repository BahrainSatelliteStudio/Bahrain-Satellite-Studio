import { Play, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MediaItem } from "@/lib/player/media";

export function TitleDetails({ item, onClose, onPlay, favorite, onFavorite, english }: { item: MediaItem; onClose: () => void; onPlay: () => void; favorite: boolean; onFavorite: () => void; english: boolean }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-w-2xl overflow-hidden p-0" aria-describedby={undefined}>
    <div className="grid grid-cols-[110px_1fr] gap-5 p-5 sm:grid-cols-[180px_1fr] sm:gap-7 sm:p-8">
      {item.logo ? <img src={item.logo} alt="" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="flex aspect-[2/3] items-center justify-center rounded-lg bg-secondary"><Play /></div>}
      <div className="min-w-0 space-y-4 pt-3"><p className="text-xs font-bold text-primary">{item.kind === "series" ? (english ? "SERIES" : "مسلسل") : (english ? "MOVIE" : "فيلم")}</p><DialogTitle className="break-words text-xl leading-normal sm:text-2xl">{item.name}</DialogTitle>
        {item.synopsis && <p className="text-sm leading-6 text-muted-foreground">{item.synopsis}</p>}
        <div className="flex flex-wrap gap-2"><Button data-nav onClick={onPlay}><Play />{item.kind === "series" ? (english ? "Episodes" : "الحلقات") : (english ? "Watch" : "مشاهدة")}</Button><Button data-nav variant="outline" size="icon" aria-label={english ? "Favorite" : "المفضلة"} onClick={onFavorite}><Heart className={favorite ? "fill-primary text-primary" : ""} /></Button></div>
      </div>
    </div>
    <Button data-nav variant="ghost" onClick={onClose} className="mx-5 mb-4 w-fit"><X />{english ? "Close" : "إغلاق"}</Button>
  </DialogContent></Dialog>;
}