import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Trash2, Plus, ExternalLink, Hammer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { triggerBuild } from "@/lib/iptv.functions";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

export const Route = createFileRoute("/_authenticated/t/$tenantId")({
  head: () => ({ meta: [{ title: "إدارة التطبيق — BHSAT Studio" }, { name: "description", content: "تحكم بهوية التطبيق والسيرفرات والإعلانات" }, { property: "og:title", content: "إدارة التطبيق — BHSAT Studio" }, { property: "og:description", content: "تحكم بهوية التطبيق والسيرفرات والإعلانات" }] }),
  component: Editor,
});

function Editor() {
  const { tenantId } = Route.useParams();
  const me = useMe();
  const tq = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => { const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId).single(); if (error) throw error; return data; },
  });
  if (!tq.data) return <div className="p-10 text-center text-muted-foreground">جاري التحميل...</div>;
  const t = tq.data;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          {me.data?.isAdmin && <Link to="/dashboard" className="rounded-lg bg-secondary p-2"><ArrowRight className="h-5 w-5" /></Link>}
          {t.logo_url ? <img src={t.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : null}
          <h1 className="text-xl font-extrabold">{t.name}</h1>
        </div>
        <div className="flex gap-2">
          <a href={`/p/${t.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink className="h-4 w-4" />معاينة التطبيق</Button></a>
          <a href={`/install/${t.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink className="h-4 w-4" />صفحة التثبيت</Button></a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Tabs defaultValue="brand" dir="rtl">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="brand">الهوية</TabsTrigger>
            <TabsTrigger value="sources">السيرفرات</TabsTrigger>
            <TabsTrigger value="ann">الإعلانات</TabsTrigger>
            <TabsTrigger value="support">الدعم والتحديث</TabsTrigger>
            <TabsTrigger value="build">البناء والتثبيت</TabsTrigger>
          </TabsList>
          <TabsContent value="brand"><Brand t={t} isAdmin={!!me.data?.isAdmin} /></TabsContent>
          <TabsContent value="sources"><Sources tenantId={t.id} /></TabsContent>
          <TabsContent value="ann"><Ann tenantId={t.id} /></TabsContent>
          <TabsContent value="support"><Support t={t} /></TabsContent>
          <TabsContent value="build"><Builds t={t} isAdmin={!!me.data?.isAdmin} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const card = "mt-4 space-y-4 rounded-2xl border bg-card p-6";

function useSave(t: Tenant) {
  const qc = useQueryClient();
  return async (patch: Partial<Tenant>) => {
    const { error } = await supabase.from("tenants").update(patch).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["tenant", t.id] }); qc.invalidateQueries({ queryKey: ["tenants"] }); }
  };
}

async function uploadImage(tenantId: string, file: File) {
  const path = `${tenantId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "")}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return `/api/public/file?b=branding&p=${encodeURIComponent(path)}`;
}

function Brand({ t, isAdmin }: { t: Tenant; isAdmin: boolean }) {
  const save = useSave(t);
  const [f, setF] = useState({ name: t.name, primary_color: t.primary_color, accent_color: t.accent_color, enabled: t.enabled, theme: t.theme });
  const [busy, setBusy] = useState(false);
  return (
    <div className={card}>
      <div className="flex items-center gap-4">
        {t.logo_url ? <img src={t.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">شعار</div>}
        <div className="space-y-1">
          <Label>الشعار (PNG مربع 512×512)</Label>
          <Input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            setBusy(true);
            try { await save({ logo_url: await uploadImage(t.id, file) }); } catch (err) { toast.error(err instanceof Error ? err.message : "فشل الرفع"); }
            setBusy(false);
          }} />
        </div>
      </div>
      <div className="space-y-1"><Label>اسم التطبيق</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label>اللون الأساسي</Label><div className="flex gap-2"><input type="color" value={f.primary_color} onChange={(e) => setF({ ...f, primary_color: e.target.value })} className="h-10 w-14 rounded" /><Input dir="ltr" value={f.primary_color} onChange={(e) => setF({ ...f, primary_color: e.target.value })} /></div></div>
        <div className="space-y-1"><Label>اللون الثانوي</Label><div className="flex gap-2"><input type="color" value={f.accent_color} onChange={(e) => setF({ ...f, accent_color: e.target.value })} className="h-10 w-14 rounded" /><Input dir="ltr" value={f.accent_color} onChange={(e) => setF({ ...f, accent_color: e.target.value })} /></div></div>
      </div>
      <div className="space-y-1">
        <Label>تصميم الواجهة الافتراضي</Label>
        <div className="grid grid-cols-3 gap-2">
          {([["default", "عادي"], ["blue", "أزرق"], ["cinema", "سينما"]] as const).map(([v, label]) => (
            <button type="button" key={v} onClick={() => setF({ ...f, theme: v })}
              className={`rounded-xl border py-2.5 text-sm font-bold ${f.theme === v ? "border-primary bg-primary text-primary-foreground" : "bg-secondary"}`}>{label}</button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">يقدر المستخدم تغييره من إعدادات التطبيق.</p>
      </div>
      <p className="text-sm text-muted-foreground" dir="ltr">Package: {t.package_id} · /{t.slug}</p>
      {isAdmin && <div className="flex items-center gap-3"><Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /><Label>التطبيق مفعّل</Label></div>}
      <Button onClick={() => save(isAdmin ? f : { name: f.name, primary_color: f.primary_color, accent_color: f.accent_color, theme: f.theme })}>حفظ</Button>
    </div>
  );
}

function Sources({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sources", tenantId], queryFn: async () => (await supabase.from("tenant_sources").select("*").eq("tenant_id", tenantId).order("sort_order")).data ?? [] });
  const [n, setN] = useState({ type: "xtream", name: "", url: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sources", tenantId] });
  const hint: Record<string, string> = { xtream: "http://server.com:8080", m3u: "http://server.com/get.php?username=..&password=..&type=m3u_plus", mac: "http://portal.com:8080/c/" };
  return (
    <div className={card}>
      <h2 className="text-lg font-extrabold">السيرفرات</h2>
      <div className="space-y-2">
        {q.data?.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary p-3">
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold uppercase text-primary-foreground">{s.type}</span>
            <span className="font-bold">{s.name}</span>
            <span dir="ltr" className="flex-1 truncate text-sm text-muted-foreground">{s.url}</span>
            <Switch checked={s.enabled} onCheckedChange={async (v) => { await supabase.from("tenant_sources").update({ enabled: v }).eq("id", s.id); refresh(); }} />
            <Button variant="ghost" size="icon" aria-label="حذف" onClick={async () => { await supabase.from("tenant_sources").delete().eq("id", s.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">لا توجد سيرفرات بعد.</p>}
      </div>
      <form className="grid gap-2 sm:grid-cols-[120px_1fr_2fr_auto]" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("tenant_sources").insert({ tenant_id: tenantId, ...n, sort_order: q.data?.length ?? 0 });
        if (error) toast.error(error.message); else { setN({ ...n, name: "", url: "" }); refresh(); }
      }}>
        <select value={n.type} onChange={(e) => setN({ ...n, type: e.target.value })} className="rounded-md border bg-background px-3"><option value="xtream">Xtream</option><option value="m3u">M3U</option><option value="mac">MAC</option></select>
        <Input placeholder="اسم السيرفر" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        <Input dir="ltr" type="url" placeholder={hint[n.type]} required value={n.url} onChange={(e) => setN({ ...n, url: e.target.value })} />
        <Button><Plus className="h-4 w-4" />إضافة</Button>
      </form>
    </div>
  );
}

function Ann({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ann", tenantId], queryFn: async () => (await supabase.from("announcements").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })).data ?? [] });
  const [n, setN] = useState({ title: "", body: "" });
  const [img, setImg] = useState<File | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ann", tenantId] });
  return (
    <div className={card}>
      <h2 className="text-lg font-extrabold">الرسائل والإعلانات</h2>
      <form className="space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        try {
          const image_url = img ? await uploadImage(tenantId, img) : null;
          const { error } = await supabase.from("announcements").insert({ tenant_id: tenantId, ...n, image_url });
          if (error) throw error;
          setN({ title: "", body: "" }); setImg(null); refresh(); toast.success("تم النشر");
        } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
      }}>
        <Input placeholder="العنوان" required value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
        <Textarea placeholder="نص الرسالة" value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} />
        <Input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
        <Button>نشر</Button>
      </form>
      <div className="space-y-2">
        {q.data?.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl bg-secondary p-3">
            <div className="flex-1"><p className="font-bold">{a.title}</p>{a.body && <p className="text-sm text-muted-foreground">{a.body}</p>}</div>
            <Switch checked={a.active} onCheckedChange={async (v) => { await supabase.from("announcements").update({ active: v }).eq("id", a.id); refresh(); }} />
            <Button variant="ghost" size="icon" aria-label="حذف" onClick={async () => { await supabase.from("announcements").delete().eq("id", a.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Support({ t }: { t: Tenant }) {
  const save = useSave(t);
  const [f, setF] = useState({ support_whatsapp: t.support_whatsapp ?? "", support_telegram: t.support_telegram ?? "", support_phone: t.support_phone ?? "", min_version: t.min_version });
  return (
    <div className={card}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1"><Label>واتساب</Label><Input dir="ltr" placeholder="97333000000" value={f.support_whatsapp} onChange={(e) => setF({ ...f, support_whatsapp: e.target.value })} /></div>
        <div className="space-y-1"><Label>تلغرام</Label><Input dir="ltr" placeholder="@username" value={f.support_telegram} onChange={(e) => setF({ ...f, support_telegram: e.target.value })} /></div>
        <div className="space-y-1"><Label>هاتف</Label><Input dir="ltr" value={f.support_phone} onChange={(e) => setF({ ...f, support_phone: e.target.value })} /></div>
      </div>
      <div className="space-y-1">
        <Label>أقل نسخة مسموحة (إجبار التحديث)</Label>
        <Input dir="ltr" pattern="\d+\.\d+\.\d+" value={f.min_version} onChange={(e) => setF({ ...f, min_version: e.target.value })} />
        <p className="text-xs text-muted-foreground">أي تطبيق نسخته أقل من هذا الرقم يطلب من المستخدم التحديث. أحدث نسخة الآن: {t.latest_version}</p>
      </div>
      <Button onClick={() => save({ support_whatsapp: f.support_whatsapp || null, support_telegram: f.support_telegram || null, support_phone: f.support_phone || null, min_version: f.min_version })}>حفظ</Button>
    </div>
  );
}

function bump(v: string) { const p = v.split(".").map(Number); return `${p[0] ?? 1}.${p[1] ?? 0}.${(p[2] ?? 0) + 1}`; }

function Builds({ t, isAdmin }: { t: Tenant; isAdmin: boolean }) {
  const qc = useQueryClient();
  const build = useServerFn(triggerBuild);
  const q = useQuery({
    queryKey: ["builds", t.id],
    queryFn: async () => (await supabase.from("builds").select("*").eq("tenant_id", t.id).order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: (query) => (query.state.data?.some((b) => b.status === "building") ? 10000 : false),
  });
  const [ver, setVer] = useState(t.latest_version);
  useEffect(() => { setVer(q.data?.length ? bump(t.latest_version) : t.latest_version); }, [q.data?.length, t.latest_version]);
  const [busy, setBusy] = useState(false);
  const label: Record<string, string> = { queued: "بالانتظار", building: "جاري البناء", done: "جاهز", failed: "فشل" };
  return (
    <div className={card}>
      {isAdmin ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label>رقم النسخة</Label><Input dir="ltr" className="w-32" value={ver} onChange={(e) => setVer(e.target.value)} /></div>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            try { await build({ data: { tenantId: t.id, version: ver, siteUrl: window.location.origin } }); toast.success("بدأ البناء — يأخذ تقريبًا 5 دقائق"); qc.invalidateQueries({ queryKey: ["builds", t.id] }); }
            catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
            setBusy(false);
          }}><Hammer className="h-4 w-4" />بناء APK</Button>
        </div>
      ) : <p className="text-sm text-muted-foreground">بناء نسخة جديدة يتم من قبل الإدارة. رابط التثبيت لمشتركيك:</p>}
      <p dir="ltr" className="break-all rounded-xl bg-secondary p-3 font-mono text-sm">{typeof window !== "undefined" ? `${window.location.origin}/install/${t.slug}` : `/install/${t.slug}`}</p>
      <div className="space-y-2">
        {q.data?.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl bg-secondary p-3 text-sm">
            <span className="font-bold" dir="ltr">v{b.version}</span>
            <span className={b.status === "done" ? "text-primary" : b.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{label[b.status]}</span>
            <span className="flex-1 text-muted-foreground">{new Date(b.created_at).toLocaleString("ar")}</span>
            {b.apk_url && <a href={b.apk_url} className="font-bold text-primary">تحميل</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
