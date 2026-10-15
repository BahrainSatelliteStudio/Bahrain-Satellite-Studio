import { useEffect, useRef, useState } from "react";
import { prefs } from "@/lib/player/prefs";

type Props = {
  src: string;
  title: string;
  onClose: () => void;
  // حفظ موضع المشاهدة (اختياري — للأفلام والحلقات)
  slug?: string;
  itemId?: string;
  logo?: string;
};

export function VideoPlayer({ src, title, onClose, slug, itemId, logo }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setErr(null);
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    const isHls = /\.m3u8(\?|$)/i.test(src);
    (async () => {
      if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (Hls.isSupported()) {
          const h = new Hls({ enableWorker: true, lowLatencyMode: true });
          h.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setErr("تعذر تشغيل البث — جرّب قناة أخرى"); });
          h.loadSource(src);
          h.attachMedia(video);
          hls = h;
        } else video.src = src;
      } else video.src = src;

      // استئناف من آخر موضع
      if (slug && itemId) {
        const saved = prefs.progress(slug)[itemId];
        if (saved && saved.t > 10) {
          const seek = () => { if (saved.t < video.duration - 5) video.currentTime = saved.t; };
          if (video.readyState >= 1) seek(); else video.addEventListener("loadedmetadata", seek, { once: true });
        }
        saveRef.current = setInterval(() => {
          if (video.duration > 0 && !video.paused) {
            prefs.saveProgress(slug, itemId, { t: video.currentTime, d: video.duration, title, logo, at: Date.now() });
          }
        }, 5000);
      }
      video.play().catch(() => {});
    })();

    // مفاتيح الريموت والكيبورد
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape" || k === "Backspace" || k === "GoBack" || k === "BrowserBack") { e.preventDefault(); onClose(); return; }
      if (k === " " || k === "MediaPlayPause" || k === "Enter" || k === "NumpadEnter") {
        if (k === " " || k === "MediaPlayPause") { e.preventDefault(); video.paused ? video.play().catch(() => {}) : video.pause(); }
        return;
      }
      if (k === "MediaPlay") video.play().catch(() => {});
      if (k === "MediaPause") video.pause();
      if (k === "MediaStop") onClose();
      if (k === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.currentTime + 10, video.duration || Infinity); }
      if (k === "ArrowLeft") { e.preventDefault(); video.currentTime = Math.max(video.currentTime - 10, 0); }
      if (k === "ArrowUp") { e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); }
      if (k === "ArrowDown") { e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); }
      if (k === "f" || k === "F") { document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen?.().catch(() => {}); }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      if (saveRef.current) clearInterval(saveRef.current);
      // حفظ أخير عند الإغلاق
      if (slug && itemId && video.duration > 0) {
        prefs.saveProgress(slug, itemId, { t: video.currentTime, d: video.duration, title, logo, at: Date.now() });
      }
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="truncate font-bold">{title}</h2>
        <button autoFocus onClick={onClose} className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-ring focus:outline-none">رجوع</button>
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-background">
        <video ref={ref} controls autoPlay playsInline className="h-full max-h-full w-full" onError={() => setErr("تعذر تشغيل هذا المحتوى")} />
        {err && <div className="absolute bottom-6 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground">{err}</div>}
      </div>
    </div>
  );
}
