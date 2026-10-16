import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { diagnoseBuildLog } from "@/lib/diagnose.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/lib/me";

export const Route = createFileRoute("/_authenticated/diagnose")({
  head: () => ({
    meta: [
      { title: "تشخيص أخطاء البناء — BHSAT Studio" },
      { name: "description", content: "الصق سجل بناء APK واحصل على تشخيص وخطوات إصلاح." },
      { property: "og:title", content: "تشخيص أخطاء البناء — BHSAT Studio" },
      { property: "og:description", content: "تشخيص سجلات بناء APK بالذكاء الاصطناعي" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiagnosePage,
});

function DiagnosePage() {
  const me = useMe();
  const run = useServerFn(diagnoseBuildLog);
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ text?: string; error?: string } | null>(null);

  async function go() {
    setBusy(true); setOut(null);
    try { setOut(await run({ data: { log } })); }
    catch (e) { setOut({ error: e instanceof Error ? e.message : "حدث خطأ" }); }
    setBusy(false);
  }

  if (me.isPending) return <main className="p-8">جاري التحميل...</main>;
  if (!me.data?.isAdmin) return <main className="p-8"><h1 className="text-2xl font-bold">هذه الصفحة للمسؤول فقط</h1><Button asChild className="mt-4"><Link to="/dashboard">العودة إلى تطبيقاتي</Link></Button></main>;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-extrabold">تشخيص أخطاء البناء</span>
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />رجوع</Link>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 p-6">
        <p className="text-sm text-muted-foreground">انسخ سجل البناء من GitHub (صفحة Actions ← البناء الفاشل) والصقه هنا.</p>
        <Textarea dir="ltr" rows={14} className="font-mono text-xs" placeholder="> Task :app:compileDebugJavaWithJavac FAILED ..." value={log} onChange={(e) => setLog(e.target.value)} />
        <Button onClick={go} disabled={busy || log.trim().length < 20}><Sparkles className="h-4 w-4" />{busy ? "جارٍ التحليل..." : "شخّص الخطأ"}</Button>
        {out?.error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">{out.error}</div>}
        {out?.text && <div className="whitespace-pre-wrap rounded-xl border bg-card p-5 text-sm leading-7">{out.text}</div>}
      </main>
    </div>
  );
}
