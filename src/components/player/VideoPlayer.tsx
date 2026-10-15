import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Captions, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { prefs } from "@/lib/player/prefs";
import { searchSubtitles, downloadSubtitle, type SubResult } from "@/lib/subtitles.functions";

type Props = {
  src: string;
  title: string;
  onClose: () => void;
  // حفظ موضع المشاهدة (اختياري — للأفلام والحلقات)
  slug?: string | undefined;
  itemId?: string | undefined;
  logo?: string | undefined;
  // لتحسين البحث عن الترجمة في الحلقات
  season?: number | undefined;
  episode?: number | undefined;
};

// تحويل SRT إلى WebVTT
function srtToVtt(srt: string): string {
  const body = srt
    .replace(/\r/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

export function VideoPlayer({ src, title, onClose, slug, itemId, logo, season, episode }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // الترجمة
  const [subOpen, setSubOpen] = useState(false);
  const [subQuery, setSubQuery] = useState(title);
  const [subLang, setSubLang] = useState<"ar" | "en">("ar");
  const [subs, setSubs] = useState<SubResult[] | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [subName, setSubName] = useState<string | null>(null);
  const searchFn = useServerFn(searchSubtitles);
  const downloadFn = useServerFn(downloadSubtitle);

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
          if (video.duration > 0 && isFinite(video.duration) && !video.paused) {
            prefs.saveProgress(slug, itemId, { t: video.currentTime, d: video.duration, title, logo, url: src, at: Date.now() });
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
      if (slug && itemId && video.duration > 0 && isFinite(video.duration)) {
        prefs.saveProgress(slug, itemId, { t: video.currentTime, d: video.duration, title, logo, url: src, at: Date.now() });
      }
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // تفعيل مسار الترجمة عند توفره
  useEffect(() => {
    const video = ref.current;
    if (!video || !vttUrl) return;
    const apply = () => {
      const t = video.textTracks[0];
      if (t) t.mode = "showing";
    };
    const t = setTimeout(apply, 300);
    return () => clearTimeout(t);
  }, [vttUrl]);

  // تنظيف رابط الترجمة
  useEffect(() => () => { if (vttUrl) URL.revokeObjectURL(vttUrl); }, [vttUrl]);

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!subQuery.trim()) return;
    setSubBusy(true); setSubs(null);
    try {
      const r = await searchFn({ data: { query: subQuery.trim(), lang: subLang, season, episode } });
      setSubs(r);
      if (!r.length) toast.info("لا توجد ترجمات مطابقة — جرّب اسمًا آخر أو لغة أخرى");
    } catch (er) { toast.error(er instanceof Error ? er.message : "تعذر البحث"); }
    setSubBusy(false);
  }

  async function pickSub(s: SubResult) {
    setSubBusy(true);
    try {
      const { srt } = await downloadFn({ data: { fileId: s.fileId } });
      const vtt = srtToVtt(srt);
      if (vttUrl) URL.revokeObjectURL(vttUrl);
      setVttUrl(URL.createObjectURL(new Blob([vtt], { type: "text/vtt" })));
      setSubName(s.name);
      setSubOpen(false);
      toast.success("تم تفعيل الترجمة");
    } catch (er) { toast.error(er instanceof Error ? er.message : "تعذر تنزيل الترجمة"); }
    setSubBusy(false);
  }

  function clearSub() {
    if (vttUrl) URL.revokeObjectURL(vttUrl);
    setVttUrl(null); setSubName(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="truncate font-bold">{title}{subName && <span className="ms-2 text-xs font-normal text-primary">ترجمة: {subName}</span>}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <button data-nav onClick={() => { setSubOpen(true); setSubQuery(title); setSubs(null); }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-ring focus:outline-none ${vttUrl ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            <Captions className="h-4 w-4" />ترجمة
          </button>
          <button autoFocus onClick={onClose} className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-ring focus:outline-none">رجوع</button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center bg-background">
        <video ref={ref} controls autoPlay playsInline crossOrigin="anonymous" className="h-full max-h-full w-full" onError={() => setErr("تعذر تشغيل هذا المحتوى")}>
          {vttUrl && <track kind="subtitles" label="الترجمة" srcLang="ar" src={vttUrl} default />}
        </video>
        {err && <div className="absolute bottom-6 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground">{err}</div>}
      </div>

      {/* نافذة البحث عن ترجمة من الإنترنت */}
      {subOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setSubOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">الترجمة من الإنترنت</h3>
              <button data-nav onClick={() => setSubOpen(false)} className="rounded-lg bg-secondary p-2"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={doSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                <input autoFocus value={subQuery} onChange={(e) => setSubQuery(e.target.value)} placeholder="اسم الفيلم أو المسلسل"
                  className="w-full rounded-xl border bg-input/40 py-2.5 pe-3 ps-9 outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <select value={subLang} onChange={(e) => setSubLang(e.target.value as "ar" | "en")}
                className="rounded-xl border bg-input/40 px-3 outline-none focus:ring-2 focus:ring-ring">
                <option value="ar">عربي</option>
                <option value="en">English</option>
              </select>
              <button data-nav disabled={subBusy} className="rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60">
                {subBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "بحث"}
              </button>
            </form>
            {subs && (
              <div className="space-y-2">
                {subs.map((s) => (
                  <button data-nav key={s.fileId} onClick={() => pickSub(s)} disabled={subBusy}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border bg-secondary/50 px-4 py-3 text-start text-sm font-bold transition hover:border-primary focus:border-primary focus:outline-none disabled:opacity-60">
                    <span className="line-clamp-1">{s.name}</span>
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">{s.lang === "ar" ? "عربي" : s.lang} · {s.downloads} تحميل</span>
                  </button>
                ))}
                {!subs.length && <p className="py-4 text-center text-sm text-muted-foreground">لا توجد نتائج</p>}
              </div>
            )}
            {vttUrl && (
              <button data-nav onClick={clearSub} className="w-full rounded-xl bg-destructive/20 py-2.5 text-sm font-bold text-destructive">إيقاف الترجمة الحالية</button>
            )}
            <p className="text-center text-xs text-muted-foreground">الترجمة من OpenSubtitles — تُطابق تلقائيًا مع {title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
