import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ArrowUp, ArrowDown, Save, Plus, Trash2, Upload, RotateCcw, ExternalLink } from "lucide-react";
import { useMe } from "@/lib/me";
import { supabase } from "@/integrations/supabase/client";
import { getHomepage, saveHomepage } from "@/lib/homepage.functions";
import { defaultHomepage, type Homepage } from "@/lib/homepage";
import { HomepageView, homeIcons } from "@/components/HomepageView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/site-settings")({
  head: () => ({ meta: [
    { title: "إدارة الصفحة الرئيسية — BHSAT Studio" }, { name: "description", content: "تعديل هوية ومحتوى ومظهر الصفحة الرئيسية" },
    { property: "og:title", content: "إدارة الصفحة الرئيسية — BHSAT Studio" }, { property: "og:description", content: "إعدادات الصفحة الرئيسية للمسؤول" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SiteSettings,
});

function SiteSettings() {
  const me = useMe();
  const read = useServerFn(getHomepage);
  const query = useQuery({ queryKey: ["homepage"], queryFn: () => read(), enabled: !!me.data?.isAdmin });
  if (me.isPending) return <p className="p-8">جارٍ التحميل…</p>;
  if (!me.data?.isAdmin) return <main className="p-8"><h1 className="text-2xl font-bold">هذه الصفحة للمسؤول فقط</h1><Button asChild variant="outline" className="mt-4"><Link to="/dashboard">العودة</Link></Button></main>;
  if (query.isError) return <div className="p-8"><p>تعذر تحميل إعدادات الصفحة</p><Button onClick={() => query.refetch()}>إعادة المحاولة</Button></div>;
  if (!query.data) return <p className="p-8">جارٍ تحميل الصفحة…</p>;
  return <Editor initial={query.data} uid={me.data.uid} />;
}

function Editor({ initial, uid }: { initial: Homepage; uid: string }) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const save = useServerFn(saveHomepage);
  const qc = useQueryClient();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof Homepage>(key: K, value: Homepage[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: "brand" | "brandAccent" | "title" | "titleAccent" | "adminLabel" | "ctaLabel", label: string) => <div className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} value={draft[key]} maxLength={key === "title" ? 150 : 60} onChange={(e) => set(key, e.target.value)} /></div>;
  const toggle = (key: "showAdmin" | "showCta" | "showFeatures", label: string) => <div className="flex items-center justify-between gap-4"><Label htmlFor={key}>{label}</Label><Switch id={key} checked={draft[key]} onCheckedChange={(v) => set(key, v)} /></div>;
  const updateFeature = (index: number, patch: Partial<Homepage["features"][number]>) => set("features", draft.features.map((f, i) => i === index ? { ...f, ...patch } : f));
  const move = (index: number, offset: number) => {
    const next = [...draft.features];
    const item = next[index]; const other = next[index + offset];
    if (!item || !other) return;
    next[index] = other; next[index + offset] = item; set("features", next);
  };
  async function upload(file: File | undefined, key: "logo" | "background") {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error("اختر صورة PNG أو JPG أو WebP لا تتجاوز 5MB"); return; }
    setUploading(true);
    try {
      const path = `${uid}/homepage-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type });
      if (error) throw error;
      set(key, `${window.location.origin}/api/public/file?b=branding&p=${encodeURIComponent(path)}`);
      toast.success("رُفعت الصورة، احفظ التغييرات لاعتمادها");
    } catch { toast.error("تعذر رفع الصورة"); } finally { setUploading(false); }
  }
  async function commit() {
    setBusy(true);
    try { await save({ data: draft }); setSaved(draft); await qc.invalidateQueries({ queryKey: ["homepage"] }); toast.success("حُفظت الصفحة الرئيسية"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "تعذر الحفظ"); } finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-background">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
      <div className="flex items-center gap-3"><Button asChild size="icon" variant="ghost" title="العودة للإدارة"><Link to="/dashboard"><ArrowRight /></Link></Button><div><h1 className="text-xl font-extrabold">إدارة الصفحة الرئيسية</h1><p className="text-sm text-muted-foreground">{dirty ? "تغييرات غير محفوظة" : "جميع التغييرات محفوظة"}</p></div></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/" target="_blank"><ExternalLink />فتح الصفحة</Link></Button><Button disabled={busy || uploading || !dirty} onClick={commit}><Save />{busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}</Button></div>
    </header>
    <main className="mx-auto grid max-w-[1600px] gap-8 p-4 lg:grid-cols-[420px_minmax(0,1fr)] lg:p-6">
      <section className="min-w-0 space-y-6">
        <Tabs defaultValue="content">
          <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="content">المحتوى</TabsTrigger><TabsTrigger value="appearance">المظهر</TabsTrigger><TabsTrigger value="features">البطاقات</TabsTrigger></TabsList>
          <TabsContent value="content" className="space-y-5 pt-4">
            {text("brand", "اسم الموقع")}{text("brandAccent", "الجزء المميز من الاسم")}{text("title", "العنوان الرئيسي")}{text("titleAccent", "الجزء الملون من العنوان")}
            <div className="space-y-2"><Label htmlFor="description">النص التعريفي</Label><Textarea id="description" rows={5} maxLength={1000} value={draft.description} onChange={(e) => set("description", e.target.value)} /></div>
            <div className="space-y-4 border-t pt-5">{toggle("showAdmin", "إظهار زر لوحة التحكم")}{text("adminLabel", "نص زر لوحة التحكم")}{toggle("showCta", "إظهار زر البدء")}{text("ctaLabel", "نص زر البدء")}</div>
          </TabsContent>
          <TabsContent value="appearance" className="space-y-5 pt-4">
            <div className="space-y-2"><Label>الألوان</Label><Select value={draft.theme} onValueChange={(v) => set("theme", v as Homepage["theme"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">ألوان الموقع الحالية</SelectItem><SelectItem value="bahrain">البحرين — ذهبي وداكن</SelectItem><SelectItem value="blue">أزرق</SelectItem><SelectItem value="cinema">سينمائي</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>حجم العنوان</Label><Select value={draft.titleSize} onValueChange={(v) => set("titleSize", v as Homepage["titleSize"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="small">صغير</SelectItem><SelectItem value="medium">متوسط</SelectItem><SelectItem value="large">كبير</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>محاذاة النص</Label><Select value={draft.align} onValueChange={(v) => set("align", v as Homepage["align"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="center">وسط</SelectItem><SelectItem value="start">يمين</SelectItem></SelectContent></Select></div>
            {(["logo", "background"] as const).map((key) => <div key={key} className="space-y-3 border-t pt-5"><Label htmlFor={key}>{key === "logo" ? "شعار الموقع" : "صورة الخلفية"}</Label><Input id={key} dir="ltr" placeholder="https://…" value={draft[key]} onChange={(e) => set(key, e.target.value)} /><div className="flex gap-2"><Button asChild variant="outline" disabled={uploading}><label><Upload />رفع صورة<input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { void upload(e.target.files?.[0], key); e.target.value = ""; }} /></label></Button><Button variant="ghost" size="icon" title="إزالة الصورة" onClick={() => set(key, "")}><Trash2 /></Button></div>{draft[key] && <img src={draft[key]} alt={key === "logo" ? "الشعار" : "الخلفية"} className="h-24 max-w-full rounded-lg object-contain" />}</div>)}
          </TabsContent>
          <TabsContent value="features" className="space-y-5 pt-4">
            {toggle("showFeatures", "إظهار بطاقات الصفحة")}
            <div className="space-y-2"><Label>عدد الأعمدة</Label><Select value={draft.columns} onValueChange={(v) => set("columns", v as Homepage["columns"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">٢</SelectItem><SelectItem value="3">٣</SelectItem><SelectItem value="4">٤</SelectItem></SelectContent></Select></div>
            {draft.features.map((f, i) => <article key={f.id} className="space-y-3 rounded-lg border p-4"><div className="flex items-center justify-between"><span className="font-bold">البطاقة {i + 1}</span><div className="flex items-center gap-1"><Switch aria-label={`إظهار البطاقة ${i + 1}`} checked={f.visible} onCheckedChange={(v) => updateFeature(i, { visible: v })} /><Button size="icon" variant="ghost" title="نقل للأعلى" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" title="نقل للأسفل" disabled={i === draft.features.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" title="حذف البطاقة" onClick={() => set("features", draft.features.filter((_, n) => n !== i))}><Trash2 /></Button></div></div><Input aria-label={`عنوان البطاقة ${i + 1}`} maxLength={100} value={f.title} onChange={(e) => updateFeature(i, { title: e.target.value })} /><Textarea aria-label={`وصف البطاقة ${i + 1}`} maxLength={400} value={f.description} onChange={(e) => updateFeature(i, { description: e.target.value })} /><div className="flex flex-wrap gap-1">{Object.entries(homeIcons).map(([key, Icon]) => <Button key={key} size="icon" variant={f.icon === key ? "secondary" : "ghost"} title={key} aria-label={key} onClick={() => updateFeature(i, { icon: key as typeof f.icon })}><Icon /></Button>)}</div></article>)}
            <Button variant="outline" disabled={draft.features.length >= 12} onClick={() => set("features", [...draft.features, { id: crypto.randomUUID(), title: "بطاقة جديدة", description: "", icon: "star", visible: true }])}><Plus />إضافة بطاقة</Button>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" disabled={!dirty} onClick={() => setDraft(saved)}>إلغاء التعديلات</Button><Button variant="ghost" onClick={() => { if (window.confirm("استعادة المحتوى الافتراضي؟ لن يُعتمد حتى تحفظ.")) setDraft(defaultHomepage); }}><RotateCcw />استعادة الافتراضي</Button></div>
      </section>
      <section className="min-w-0"><h2 className="mb-3 text-sm font-bold text-muted-foreground">معاينة الصفحة</h2><div className="overflow-hidden rounded-lg border"><HomepageView config={draft} preview /></div></section>
    </main>
  </div>;
}