import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Upload, CheckCircle2, Send } from "lucide-react";
import { useMe } from "@/lib/me";
import { getFirebaseStatus, saveFirebaseAccount, saveGoogleServices, setFirebaseEnabled, testFirebase, sendPush } from "@/lib/firebase.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/firebase")({
  head: () => ({ meta: [
    { title: "إعدادات Firebase والإشعارات — BHSAT Studio" }, { name: "description", content: "ربط Firebase وإرسال إشعارات لأجهزة المشتركين" },
    { property: "og:title", content: "إعدادات Firebase — BHSAT Studio" }, { property: "og:description", content: "إرسال إشعارات للمشتركين" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: FirebasePage,
});

function FirebasePage() {
  const me = useMe();
  const read = useServerFn(getFirebaseStatus);
  const q = useQuery({ queryKey: ["firebase"], queryFn: () => read(), enabled: !!me.data?.isAdmin });
  const save = useServerFn(saveFirebaseAccount);
  const saveGs = useServerFn(saveGoogleServices);
  const toggle = useServerFn(setFirebaseEnabled);
  const test = useServerFn(testFirebase);
  const send = useServerFn(sendPush);
  const [busy, setBusy] = useState("");
  const [target, setTarget] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (me.isPending) return <p className="p-8">جارٍ التحميل…</p>;
  if (!me.data?.isAdmin) return <main className="p-8"><h1 className="text-2xl font-bold">هذه الصفحة للمسؤول فقط</h1></main>;

  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(k);
    try { await fn(); toast.success(ok); await q.refetch(); } catch (e) { toast.error(e instanceof Error ? e.message : "حدث خطأ"); } finally { setBusy(""); }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    const json = await f.text();
    await run("save", () => save({ data: { json } }), "تم حفظ الملف بشكل مشفّر");
  };

  const s = q.data?.settings;
  return (
    <main dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إعدادات Firebase والإشعارات</h1>
        <Button asChild variant="outline" size="sm"><Link to="/dashboard"><ArrowRight className="ml-1 h-4 w-4" />لوحة التحكم</Link></Button>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">١- ملف حساب الخدمة</h2>
        {s ? (
          <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" />
            <span>مربوط بمشروع <b>{s.project_id}</b></span></div>
        ) : <p className="text-sm text-muted-foreground">ارفع الملف اللي ينتهي بـ ‎.json من Firebase ← Project settings ← Service accounts.</p>}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={s ? "outline" : "default"} disabled={busy === "save"}>
            <label className="cursor-pointer"><Upload className="ml-1 h-4 w-4" />{s ? "تغيير الملف" : "رفع ملف حساب الخدمة"}
              <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /></label>
          </Button>
          {s && <Button variant="outline" disabled={busy === "test"} onClick={() => run("test", () => test(), "الاتصال سليم ✓")}>اختبار الاتصال</Button>}
        </div>
        {s && <div className="flex items-center gap-3"><Switch checked={s.enabled} onCheckedChange={(v) => run("tg", () => toggle({ data: { enabled: v } }), v ? "تم تشغيل الإشعارات" : "تم إيقاف الإشعارات")} /><Label>الإشعارات {s.enabled ? "شغّالة" : "موقوفة"}</Label></div>}
      </section>

      {s && <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">ملف التطبيق google-services.json</h2>
        {s.packages ? <div className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" />
          <span>مرفوع — التطبيقات المسجّلة: <b dir="ltr">{s.packages.join("، ")}</b></span></div>
          : <p className="text-sm text-muted-foreground">حمّله من Firebase ← Project settings ← General ← تطبيق أندرويد.</p>}
        <Button asChild variant={s.packages ? "outline" : "default"} disabled={busy === "gs"}>
          <label className="cursor-pointer"><Upload className="ml-1 h-4 w-4" />{s.packages ? "تغيير الملف" : "رفع google-services.json"}
            <input type="file" accept=".json,application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const json = await f.text(); await run("gs", () => saveGs({ data: { json } }), "تم حفظ ملف التطبيق"); } }} /></label>
        </Button>
        <p className="text-xs text-muted-foreground">كل زبون له اسم حزمة خاص (مثل me.bhsat.اسم-الزبون) — سجّله في Firebase كتطبيق أندرويد ثم ارفع الملف الجديد هنا.</p>
      </section>}

      {s && <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">٢- إرسال إشعار</h2>
        <div className="space-y-2"><Label>إلى</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المشتركين</SelectItem>
              {q.data?.tenants.map((t) => <SelectItem key={t.id} value={`tenant-${t.id}`}>مشتركو {t.name}</SelectItem>)}
            </SelectContent>
          </Select></div>
        <div className="space-y-2"><Label>العنوان</Label><Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: عرض جديد" /></div>
        <div className="space-y-2"><Label>الرسالة</Label><Textarea value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} /></div>
        <Button disabled={busy === "send" || !title.trim() || !body.trim()} onClick={() => run("send", async () => { await send({ data: { target, title, body } }); setTitle(""); setBody(""); }, "تم إرسال الإشعار")}>
          <Send className="ml-1 h-4 w-4" />إرسال</Button>
      </section>}

      {!!q.data?.history.length && <section className="space-y-2 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">آخر الإشعارات</h2>
        {q.data.history.map((h) => <div key={h.id} className="border-b py-2 text-sm last:border-0">
          <b>{h.title}</b> — {h.body}
          <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("ar")} · {h.status === "sent" ? "تم الإرسال" : `فشل: ${h.error}`}</div>
        </div>)}
      </section>}
    </main>
  );
}
