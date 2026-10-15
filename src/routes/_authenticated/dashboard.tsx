import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Star, Satellite } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, toLatinDigits, type Host, type Server, type Settings } from "@/lib/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — Bahrain Satellite" },
      { name: "description", content: "إدارة السيرفرات والهوستات وهوية التطبيق" },
      { property: "og:title", content: "لوحة التحكم — Bahrain Satellite" },
      { property: "og:description", content: "إدارة السيرفرات والهوستات" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const nav = useNavigate();
  const isAdmin = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data === true,
  });

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Satellite className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-extrabold">لوحة Bahrain Satellite</h1>
          <span className="ms-auto text-sm text-muted-foreground" dir="ltr">{user.email}</span>
          <Button size="sm" variant="secondary" onClick={signOut}><LogOut className="h-4 w-4" />خروج</Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        {isAdmin.data === false ? (
          <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">هذا الحساب ليس لديه صلاحية مسؤول.</p>
        ) : (
          <Tabs defaultValue="servers">
            <TabsList><TabsTrigger value="servers">السيرفرات والهوستات</TabsTrigger><TabsTrigger value="identity">هوية التطبيق والدعم</TabsTrigger><TabsTrigger value="link">ربط التطبيق</TabsTrigger></TabsList>
            <TabsContent value="servers"><ServersTab /></TabsContent>
            <TabsContent value="identity"><IdentityTab /></TabsContent>
            <TabsContent value="link"><LinkTab /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function ServersTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-servers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("servers").select("*, hosts(*)").order("sort_order").order("created_at");
      if (error) throw error;
      return data as (Server & { hosts: Host[] })[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-servers"] });
  const [code, setCode] = useState(""); const [name, setName] = useState("");

  async function add() {
    if (!code || !name) return toast.error("أدخل الكود والاسم");
    const { error } = await supabase.from("servers").insert({ code, name, sort_order: q.data?.length ?? 0 });
    if (error) return toast.error(error.message.includes("unique") ? "الكود مستخدم" : error.message);
    setCode(""); setName(""); refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-4">
        <div className="w-28 space-y-1"><Label>كود الدخول</Label><Input dir="ltr" value={code} onChange={(e) => setCode(toLatinDigits(e.target.value).slice(0, 6))} placeholder="77" /></div>
        <div className="flex-1 space-y-1"><Label>اسم السيرفر</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={add}><Plus className="h-4 w-4" />إضافة سيرفر</Button>
        <span className="w-full text-xs text-muted-foreground">{q.data?.length ?? 0} / 50 سيرفر — حتى 8 هوستات لكل سيرفر</span>
      </div>
      {q.data?.map((s) => <ServerCard key={s.id} server={s} onChange={refresh} />)}
    </div>
  );
}

function ServerCard({ server, onChange }: { server: Server & { hosts: Host[] }; onChange: () => void }) {
  const [url, setUrl] = useState("");
  const [api, setApi] = useState(server.activation_api_url ?? "");
  const hosts = [...server.hosts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const run = async (p: PromiseLike<{ error: any }>) => { const { error } = await p; if (error) toast.error(error.message); onChange(); };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-primary px-2 py-0.5 font-bold text-primary-foreground" dir="ltr">{server.code}</span>
        <span className="font-bold">{server.name}</span>
        <div className="ms-auto flex items-center gap-2 text-sm">
          مفعّل <Switch checked={server.enabled} onCheckedChange={(v) => run(supabase.from("servers").update({ enabled: v }).eq("id", server.id))} />
          <Button size="icon" variant="ghost" onClick={() => confirm("حذف السيرفر وكل هوستاته؟") && run(supabase.from("servers").delete().eq("id", server.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {hosts.map((h) => (
          <div key={h.id} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-sm">
            <span className="truncate" dir="ltr">{h.url}</span>
            <div className="ms-auto flex gap-1">
              <Button size="icon" variant="ghost" title="تعيين كأساسي" onClick={async () => {
                await supabase.from("hosts").update({ is_primary: false }).eq("server_id", server.id);
                run(supabase.from("hosts").update({ is_primary: true }).eq("id", h.id));
              }}><Star className={`h-4 w-4 ${h.is_primary ? "fill-accent text-accent" : "text-muted-foreground"}`} /></Button>
              <Button size="icon" variant="ghost" onClick={() => run(supabase.from("hosts").delete().eq("id", h.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      {hosts.length < 8 && (
        <div className="mt-2 flex gap-2">
          <Input dir="ltr" placeholder="http://host.example.com:8080" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button variant="secondary" onClick={() => { if (!url) return; run(supabase.from("hosts").insert({ server_id: server.id, url, is_primary: hosts.length === 0, sort_order: hosts.length })); setUrl(""); }}>إضافة هوست</Button>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Input dir="ltr" placeholder="رابط API التفعيل (اختياري، يُحفظ فقط)" value={api} onChange={(e) => setApi(e.target.value)} />
        <Button variant="ghost" onClick={() => run(supabase.from("servers").update({ activation_api_url: api || null }).eq("id", server.id))}>حفظ</Button>
      </div>
    </div>
  );
}

function IdentityTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [f, setF] = useState<Settings | null>(null);
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);
  if (!f) return null;
  const field = (k: keyof Settings, label: string, ltr = false) => (
    <div className="space-y-1"><Label>{label}</Label><Input dir={ltr ? "ltr" : undefined} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  async function save() {
    const { error } = await supabase.from("app_settings").update({ ...f!, config_version: f!.config_version + 1, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("تم النشر — سيقرأ التطبيق الإعدادات الجديدة"); qc.invalidateQueries({ queryKey: ["settings"] });
  }
  return (
    <div className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
      {field("app_name", "اسم التطبيق")}
      {field("logo_url", "رابط الشعار (HTTPS)", true)}
      {field("store_url", "رابط المتجر", true)}
      {field("support_whatsapp", "رقم واتساب الدعم", true)}
      {field("support_phone", "رقم اتصال الدعم", true)}
      {field("support_telegram", "معرّف تيليجرام", true)}
      <div className="sm:col-span-2">{field("announcement", "إعلان يظهر للعملاء")}</div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button onClick={save}>حفظ ونشر</Button>
        <span className="text-xs text-muted-foreground">إصدار الإعدادات الحالي: {f.config_version}</span>
      </div>
    </div>
  );
}

function LinkTab() {
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/public/config` : "/api/public/config";
  return (
    <div className="mt-4 space-y-3 rounded-2xl border bg-card p-5 text-sm">
      <p>التطبيق يقرأ الإعدادات من هذا الرابط:</p>
      <code className="block rounded-lg bg-secondary p-3" dir="ltr">{url}</code>
      <p className="text-muted-foreground">ولسيرفر محدد: <span dir="ltr">?code=77</span>. يعرض فقط السيرفرات المفعّلة، والهوست الأساسي أولاً.</p>
    </div>
  );
}
