import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe, signOut } from "@/lib/me";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, LogOut, Search, Users, CheckCircle2, Ban, Eye, BookOpen, Copy, Smartphone, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createTenant } from "@/lib/iptv.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — BHSAT Studio" }, { name: "description", content: "إدارة تطبيقات الزبائن" }, { property: "og:title", content: "لوحة التحكم — BHSAT Studio" }, { property: "og:description", content: "إدارة تطبيقات الزبائن" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

type Tenant = { id: string; name: string; slug: string; logo_url: string | null; enabled: boolean; latest_version: string };

function Dashboard() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const tenants = useQuery({
    queryKey: ["tenants", me.data?.uid, me.data?.isAdmin],
    enabled: !!me.data,
    queryFn: async () => {
      let qy = supabase.from("tenants").select("id,name,slug,logo_url,enabled,latest_version").order("created_at", { ascending: false });
      if (!me.data!.isAdmin) {
        const { data: m } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", me.data!.uid);
        qy = qy.in("id", (m ?? []).map((x) => x.tenant_id));
      }
      const { data, error } = await qy;
      if (error) throw error;
      return data as Tenant[];
    },
  });

  useEffect(() => {
    if (me.data && !me.data.isAdmin && tenants.data?.length === 1) nav({ to: "/t/$tenantId", params: { tenantId: tenants.data[0]!.id }, replace: true });
  }, [me.data, tenants.data, nav]);

  const list = tenants.data ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((t) => t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
  }, [list, q]);
  const active = list.filter((t) => t.enabled).length;
  const disabled = list.length - active;
  const [autoNew, setAutoNew] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("bhsat_open_new") === "1") {
        sessionStorage.removeItem("bhsat_open_new");
        setAutoNew(true);
      }
    } catch { /* تجاهل */ }
  }, []);

  const copy = (text: string, msg: string) => { navigator.clipboard.writeText(text); toast.success(msg); };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-extrabold">BHSAT <span className="text-primary">Studio</span></span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/diagnose" className="flex items-center gap-1 hover:text-foreground"><Stethoscope className="h-4 w-4" />تشخيص البناء</Link>
          <span dir="ltr">{me.data?.email}</span>
          <Button variant="secondary" size="sm" onClick={() => signOut(qc, () => nav({ to: "/auth", replace: true }))}><LogOut className="h-4 w-4" />خروج</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">{me.data?.isAdmin ? "الزبائن والتطبيقات" : "تطبيقاتي"}</h1>
          {me.data?.isAdmin && <NewTenant autoOpen={autoNew} onDone={() => qc.invalidateQueries({ queryKey: ["tenants"] })} />}
        </div>

        {me.data?.isAdmin && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={<Users className="h-5 w-5" />} label="إجمالي الزبائن" value={list.length} />
            <Stat icon={<CheckCircle2 className="h-5 w-5 text-primary" />} label="نشط" value={active} />
            <Stat icon={<Ban className="h-5 w-5 text-destructive" />} label="معطّل" value={disabled} />
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرابط…" className="ps-9" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="group flex flex-col rounded-2xl border bg-card p-5 transition hover:border-primary">
              <Link to="/t/$tenantId" params={{ tenantId: t.id }} className="flex items-center gap-4">
                {t.logo_url ? <img src={t.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-primary-foreground">{t.name[0]}</div>}
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{t.name}</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">/{t.slug} · v{t.latest_version}</p>
                  {t.enabled
                    ? <span className="text-xs text-primary">نشط</span>
                    : <span className="text-xs text-destructive">معطّل</span>}
                </div>
              </Link>
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                <Button asChild size="sm" variant="secondary"><Link to="/t/$tenantId" params={{ tenantId: t.id }}><Smartphone className="h-3.5 w-3.5" />إدارة</Link></Button>
                <Button asChild size="sm" variant="outline"><a href={`/preview/${t.slug}`} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" />معاينة</a></Button>
                <Button asChild size="sm" variant="outline"><a href={`/guide/${t.slug}?name=${encodeURIComponent(t.name)}`} target="_blank" rel="noreferrer"><BookOpen className="h-3.5 w-3.5" />الدليل</a></Button>
                <Button size="sm" variant="ghost" onClick={() => copy(`${window.location.origin}/install/${t.slug}`, "نُسخ رابط التثبيت")}><Copy className="h-3.5 w-3.5" />رابط التثبيت</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              {list.length === 0
                ? (me.data?.isAdmin ? "لا يوجد زبائن بعد — أضف أول زبون." : "لا يوجد تطبيق مرتبط بحسابك.")
                : "لا توجد نتائج مطابقة للبحث."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">{icon}</div>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function NewTenant({ autoOpen, onDone }: { autoOpen: boolean; onDone: () => void }) {
  const create = useServerFn(createTenant);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);
  const [f, setF] = useState({ name: "", slug: "", package_id: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; slug: string; username: string; password: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setF((p) => {
      const n = { ...p, [k]: v };
      if (k === "slug") n.package_id = `me.bhsat.${v.replace(/[^a-z0-9]/g, "")}`;
      return n;
    });
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await create({ data: f }); toast.success("تم إنشاء الزبون وحسابه"); setDone({ name: f.name, slug: f.slug, username: f.username, password: f.password }); setF({ name: "", slug: "", package_id: "", username: "", email: "", password: "" }); onDone(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    setBusy(false);
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDone(null); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" />زبون جديد</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إضافة زبون جديد</DialogTitle></DialogHeader>
        {done ? (
          <div className="space-y-3 text-sm leading-7">
            <p className="font-bold text-primary">تم إنشاء «{done.name}» ✅ — الخطوة التالية: سلّم الزبون بيانات دخوله ودليله الشامل.</p>
            <div className="rounded-lg border bg-muted/40 p-3" dir="ltr">
              <p className="text-xs text-muted-foreground" dir="rtl">بيانات دخول الزبون للوحة التحكم (تظهر مرة واحدة فقط):</p>
              <p className="font-mono text-sm">user: {done.username}</p>
              <p className="font-mono text-sm">pass: {done.password}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(`بيانات دخول لوحة التحكم:\nاسم المستخدم: ${done.username}\nكلمة المرور: ${done.password}\nرابط الدخول: ${window.location.origin}/auth`); toast.success("نُسخت بيانات الدخول"); }}>نسخ بيانات الدخول للزبون</Button>
            <p className="text-muted-foreground">الدليل يشرح التطبيق ولوحة التحكم وطريقة تثبيتها على Windows وMac/Linux وVPS وDocker وWindows Server وcPanel.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild><a href={`/guide/${done.slug}?name=${encodeURIComponent(done.name)}`} target="_blank" rel="noreferrer">فتح دليل الزبون</a></Button>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/guide/${done.slug}?name=${encodeURIComponent(done.name)}`); toast.success("نُسخ رابط الدليل"); }}>نسخ الرابط للزبون</Button>
              <Button variant="ghost" onClick={() => { setOpen(false); setDone(null); }}>إغلاق</Button>
            </div>
          </div>
        ) : (<>
        <details className="rounded-lg border bg-muted/40 p-3 text-sm leading-7" open>
          <summary className="cursor-pointer font-bold">قائمة استقبال الزبون — اطلب منه:</summary>
          <ul className="list-disc pr-5 mt-1">
            <li><b>ضروري:</b> اسم التطبيق، الشعار (PNG/JPG)، بريد الدخول.</li>
            <li><b>السيرفر:</b> Host + يوزر + باسورد، والنوع Xtream / M3U.</li>
            <li><b>التواصل:</b> رقم واتساب الدعم.</li>
            <li><b>نحدده نحن:</b> اسم الحزمة (لا يتغير)، الباقة، القالب، كلمة المرور.</li>
            <li className="text-muted-foreground">الباقي (ألوان، روابط، رسائل) يعدّله الزبون بنفسه من لوحته.</li>
          </ul>
        </details>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>اسم التطبيق</Label><Input required value={f.name} onChange={set("name")} /></div>
          <div className="space-y-1"><Label>الرابط المختصر (إنجليزي صغير)</Label><Input dir="ltr" required pattern="[a-z0-9][a-z0-9\-]{1,30}" value={f.slug} onChange={set("slug")} placeholder="mytv" /></div>
          <div className="space-y-1"><Label>اسم الحزمة (لا يتغير لاحقًا)</Label><Input dir="ltr" required value={f.package_id} onChange={set("package_id")} /></div>
          <div className="space-y-1"><Label>اسم مستخدم الزبون (إنجليزي صغير)</Label><Input dir="ltr" required pattern="[a-z0-9._\-]{3,30}" value={f.username} onChange={set("username")} placeholder="mytv" /></div>
          <div className="space-y-1"><Label>كلمة مرور الزبون</Label><Input dir="ltr" minLength={8} required value={f.password} onChange={set("password")} /></div>
          <div className="space-y-1"><Label>بريد الزبون (اختياري — للتواصل)</Label><Input dir="ltr" type="email" value={f.email} onChange={set("email")} /></div>
          <Button className="w-full" disabled={busy}>إنشاء</Button>
        </form>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
