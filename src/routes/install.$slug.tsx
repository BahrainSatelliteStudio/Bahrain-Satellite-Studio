import { createFileRoute, notFound } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { getTenantConfig } from "@/lib/iptv.functions";

export const Route = createFileRoute("/install/$slug")({
  loader: async ({ params }) => {
    const cfg = await getTenantConfig({ data: { slug: params.slug } });
    if (!cfg) throw notFound();
    return cfg;
  },
  head: ({ loaderData }) => {
    const t = loaderData?.name ?? "التطبيق";
    return {
      meta: [
        { title: `تحميل وتثبيت ${t}` },
        { name: "description", content: `حمّل تطبيق ${t} لأجهزة أندرويد والتلفاز واتبع خطوات التثبيت` },
        { property: "og:title", content: `تحميل وتثبيت ${t}` },
        { property: "og:description", content: `حمّل تطبيق ${t} لأجهزة أندرويد والتلفاز` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">التطبيق غير موجود</div>,
  component: InstallPage,
});

function InstallPage() {
  const cfg = Route.useLoaderData();
  const style = { "--primary": cfg.primary_color, "--accent": cfg.accent_color, "--primary-foreground": "oklch(0.99 0 0)" } as React.CSSProperties;
  const apk = cfg.latest_build?.apk_url;
  const full = typeof window !== "undefined" && apk ? new URL(apk, window.location.origin).href : apk;
  const steps = [
    { t: "جوال أندرويد", s: ["اضغط زر التحميل بالأسفل.", "افتح الملف بعد التحميل.", "إذا ظهر تحذير، اسمح بـ (التثبيت من مصادر غير معروفة) للمتصفح.", "اضغط تثبيت ثم افتح التطبيق."] },
    { t: "تلفاز أندرويد / فاير ستك", s: ["ثبّت تطبيق Downloader من المتجر.", "من الإعدادات فعّل (تطبيقات غير معروفة) لتطبيق Downloader.", "افتح Downloader واكتب رابط التحميل الظاهر بالأسفل.", "ثبّت التطبيق وافتحه من قائمة التطبيقات."] },
  ];
  return (
    <div style={style} className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {cfg.logo_url ? <img src={cfg.logo_url} alt={cfg.name} className="h-24 w-24 rounded-3xl object-cover shadow-xl" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-4xl font-extrabold text-primary-foreground">{cfg.name[0]}</div>}
          <h1 className="text-3xl font-extrabold">{cfg.name}</h1>
          <p className="text-muted-foreground">أحدث نسخة: {cfg.latest_build?.version ?? cfg.latest_version}</p>
        </div>
        {apk ? (
          <a href={apk} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground"><Download className="h-6 w-6" />تحميل التطبيق (APK)</a>
        ) : <p className="rounded-2xl border bg-card p-4 text-center text-muted-foreground">ملف التطبيق قيد التجهيز — عد لاحقًا.</p>}
        {full && <p dir="ltr" className="break-all rounded-xl bg-secondary p-3 text-center font-mono text-sm">{full}</p>}
        {steps.map((g) => (
          <section key={g.t} className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-lg font-extrabold">{g.t}</h2>
            <ol className="space-y-2">{g.s.map((s, i) => <li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">{i + 1}</span><span>{s}</span></li>)}</ol>
          </section>
        ))}
      </div>
    </div>
  );
}
