import { useEffect, useRef, useState } from "react";

export function VideoPlayer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

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
      video.play().catch(() => {});
    })();
    return () => { cancelled = true; hls?.destroy(); video.removeAttribute("src"); video.load(); };
  }, [src]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="truncate font-bold">{title}</h2>
        <button onClick={onClose} className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold">رجوع</button>
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-background">
        <video ref={ref} controls autoPlay playsInline className="h-full max-h-full w-full" onError={() => setErr("تعذر تشغيل هذا المحتوى")} />
        {err && <div className="absolute bottom-6 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground">{err}</div>}
      </div>
    </div>
  );
}
