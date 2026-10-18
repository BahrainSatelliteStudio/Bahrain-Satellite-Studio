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
export function Announcements({ cfg }: { cfg: TenantConfig }) {
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

