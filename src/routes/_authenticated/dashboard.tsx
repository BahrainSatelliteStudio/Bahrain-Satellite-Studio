import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createTenant } from "@/lib/iptv.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — BHSAT Studio" }, { name: "description", content: "إدارة تطبيقات الزبائن" }, { property: "og:title", content: "لوحة التحكم — BHSAT Studio" }, { property: "og:description", content: "إدارة تطبيقات الزبائن" }] }),
  component: Dashboard,
});

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      return { uid, email: u.user!.email, isAdmin: !!isAdmin };
    },
  });
}

export async function signOut(qc: ReturnType<typeof useQueryClient>, nav: ReturnType<typeof useNavigate>) {
  await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true });
}

function Dashboard() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const tenants = useQuery({
    queryKey: ["tenants", me.data?.uid, me.data?.isAdmin],
    enabled: !!me.data,
    queryFn: async () => {
      let q = supabase.from("tenants").select("id,name,slug,logo_url,enabled,latest_version").order("created_at", { ascending: false });
      if (!me.data!.isAdmin) {
        const { data: m } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", me.data!.uid);
        q = q.in("id", (m ?? []).map((x) => x.tenant_id));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (me.data && !me.data.isAdmin && tenants.data?.length === 1) nav({ to: "/t/$tenantId", params: { tenantId: tenants.data[0].id }, replace: true });
  }, [me.data, tenants.data, nav]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-extrabold">BHSAT <span className="text-primary">Studio</span></span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span dir="ltr">{me.data?.email}</span>
          <Button variant="secondary" size="sm" onClick={() => signOut(qc, nav)}><LogOut className="h-4 w-4" />خروج</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">{me.data?.isAdmin ? "الزبائن والتطبيقات" : "تطبيقاتي"}</h1>
          {me.data?.isAdmin && <NewTenant onDone={() => qc.invalidateQueries({ queryKey: ["tenants"] })} />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.data?.map((t) => (
            <Link key={t.id} to="/t/$tenantId" params={{ tenantId: t.id }} className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary">
              {t.logo_url ? <img src={t.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-primary-foreground">{t.name[0]}</div>}
              <div className="min-w-0">
                <p className="truncate font-extrabold">{t.name}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">/{t.slug} · v{t.latest_version}</p>
                {!t.enabled && <span className="text-xs text-destructive">معطّل</span>}
              </div>
            </Link>
          ))}
          {tenants.data?.length === 0 && <p className="col-span-full rounded-2xl border bg-card p-10 text-center text-muted-foreground">{me.data?.isAdmin ? "لا يوجد زبائن بعد — أضف أول زبون." : "لا يوجد تطبيق مرتبط بحسابك."}</p>}
        </div>
      </main>
    </div>
  );
}

function NewTenant({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createTenant);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", slug: "", package_id: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
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
    try { await create({ data: f }); toast.success("تم إنشاء الزبون وحسابه"); setOpen(false); setF({ name: "", slug: "", package_id: "", email: "", password: "" }); onDone(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
    setBusy(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" />زبون جديد</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة زبون جديد</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>اسم التطبيق</Label><Input required value={f.name} onChange={set("name")} /></div>
          <div className="space-y-1"><Label>الرابط المختصر (إنجليزي صغير)</Label><Input dir="ltr" required pattern="[a-z0-9][a-z0-9\-]{1,30}" value={f.slug} onChange={set("slug")} placeholder="mytv" /></div>
          <div className="space-y-1"><Label>اسم الحزمة (لا يتغير لاحقًا)</Label><Input dir="ltr" required value={f.package_id} onChange={set("package_id")} /></div>
          <div className="space-y-1"><Label>بريد دخول الزبون</Label><Input dir="ltr" type="email" required value={f.email} onChange={set("email")} /></div>
          <div className="space-y-1"><Label>كلمة مرور الزبون</Label><Input dir="ltr" minLength={8} required value={f.password} onChange={set("password")} /></div>
          <Button className="w-full" disabled={busy}>إنشاء</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
