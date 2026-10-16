import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe, signOut } from "@/lib/me";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, LogOut, Search, Users, CheckCircle2, Ban, Eye, BookOpen, Copy, Smartphone, Stethoscope, RefreshCw, Github, CircleCheck, CircleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createTenant, githubStatus, setupSigningKey } from "@/lib/iptv.functions";
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

  const copy = (text: string, msg: string) => { navigator.clipboard.writeText(text); toast.success(msg); };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-xl font-extrabold">BHSAT <span className="text-primary">Studio</span></span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {me.data?.isAdmin && <Button asChild variant="outline" size="sm"><Link to="/site-settings">إدارة الصفحة الرئيسية</Link></Button>}
          {me.data?.isAdmin && <Link to="/diagnose" className="flex items-center gap-1 hover:text-foreground"><Stethoscope className="h-4 w-4" />تشخيص البناء</Link>}
          <span dir="ltr">{me.data?.email}</span>
          <Button variant="secondary" size="sm" onClick={() => signOut(qc, () => nav({ to: "/auth", replace: true }))}><LogOut className="h-4 w-4" />خروج</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">{me.data?.isAdmin ? "الزبائن والتطبيقات" : "تطبيقاتي"}</h1>
          {me.data?.isAdmin && <NewTenant onDone={() => qc.invalidateQueries({ queryKey: ["tenants"] })} />}
        </div>

        {me.data?.isAdmin && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={<Users className="h-5 w-5" />} label="إجمالي الزبائن" value={list.length} />
            <Stat icon={<CheckCircle2 className="h-5 w-5 text-primary" />} label="نشط" value={active} />
          <Stat icon={<Ban className="h-5 w-5 text-destructive" />} label="معطّل" value={disabled} />
          </div>
        )}

        {me.data?.isAdmin && <GithubStrip />}

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

// تحويل اسم التطبيق (عربي أو إنجليزي) إلى رابط مختصر + اسم حزمة + اسم مستخدم
const AR: Record<string, string> = {
  "أ": "a", "إ": "a", "آ": "a", "ا": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h",
  "خ": "kh", "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d",
  "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m",
  "ن": "n", "ه": "h", "و": "w", "ي": "y", "ى": "a", "ة": "h", "ؤ": "o", "ئ": "e", "ء": "",
};

// كلمات شائعة في أسماء التطبيقات — نفضّل شكلها الإنجليزي المعروف
const WORDS: Record<string, string> = {
  "البحرين": "bahrain", "بحرين": "bahrain", "البحريني": "bahrain", "بحريني": "bahrain",
  "سات": "sat", "ساتلايت": "satellite", "تلفاز": "tv", "تلفزيون": "tv", "tv": "tv",
  "قناة": "channel", "قنوات": "channels", "رياضة": "sport", "رياضي": "sport", "رياضية": "sport",
  "أطفال": "kids", "اطفال": "kids", "أفلام": "movies", "افلام": "movies", "فيلم": "movie",
  "مباشر": "live", "عربى": "arabic", "عربي": "arabic", "عربية": "arabic", "بريميوم": "premium",
  "ذهبي": "gold", "فضي": "silver", "جديد": "new", "الاول": "one", "الأول": "one",
};

function slugify(name: string) {
  const words = name.trim().split(/\s+/).map((w) => {
    const t = w.replace(/[\u064B-\u0652]/g, "");
    return WORDS[t] ?? WORDS[t.replace(/^[أإآا]ل(.+)$/, "$1")] ?? t;
  });
  const latin = Array.from(words.join(" ").toLowerCase()).map((ch) => (AR[ch] !== undefined ? AR[ch] : ch)).join("");
  const s = latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return s.length >= 2 ? s : "";
}

function packageFor(slug: string) {
  const seg = slug.replace(/[^a-z0-9_]/g, "_").replace(/^[^a-z]+/, "").replace(/_+$/g, "");
  return `me.bhsat.${seg || "app"}`;
}

function userFor(slug: string) {
  const u = slug.replace(/[^a-z0-9]/g, "").slice(0, 30);
  return u.length >= 3 ? u : "";
}

function genPass() {
  const A = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += A[Math.floor(Math.random() * A.length)];
  return `Bhs-${s}1`;
}

function NewTenant({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createTenant);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", slug: "", package_id: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [cc, setCc] = useState("+973");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<{ name: string; slug: string; username: string; password: string } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const logoPreview = useMemo(() => (logo ? URL.createObjectURL(logo) : ""), [logo]);
  const getStatus = useServerFn(githubStatus);
  const gs = useQuery({ queryKey: ["github-status"], queryFn: () => getStatus({}), staleTime: 30_000, enabled: open });
  const SIGN_KEYS = ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"];
  const signed = SIGN_KEYS.every((k) => gs.data?.secrets?.includes(k));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTouched((t) => ({ ...t, [k]: true }));
    setF((p) => {
      const n = { ...p, [k]: v };
      if (k === "name") {
        const s = slugify(v);
        if (s && !touched["slug"]) n.slug = s;
        const base = touched["slug"] ? n.slug : s;
        if (base && !touched["package_id"]) n.package_id = packageFor(base);
        if (base && !touched["username"]) n.username = userFor(base);
        if (!touched["password"] && !n.password) n.password = genPass();
      }
      if (k === "slug") {
        const s = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
        n.slug = s;
        if (!touched["package_id"]) n.package_id = packageFor(s);
        if (!touched["username"]) n.username = userFor(s);
      }
      if (k === "package_id") n.package_id = v.toLowerCase().replace(/[^a-z0-9._]/g, "");
      if (k === "username") n.username = v.toLowerCase().replace(/[^a-z0-9._-]/g, "");
      return n;
    });
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (!logo) throw new Error("شعار التطبيق مطلوب");
      if (!signed) throw new Error("أنشئ مفتاح التوقيع أولًا");
      if (logo.size > 3 * 1024 * 1024) throw new Error("الحد الأقصى للشعار 3MB");
      const r = await create({ data: { ...f, phone: `${cc} ${phone}` } });
      if (logo) {
        const path = `${r.id}/${Date.now()}-${logo.name.replace(/[^\w.\-]/g, "")}`;
        const up = await supabase.storage.from("branding").upload(path, logo, { upsert: true, contentType: logo.type });
        if (up.error) toast.error("أُنشئ الزبون لكن فشل رفع الشعار — ارفعه من صفحة الزبون");
        else await supabase.from("tenants").update({ logo_url: `/api/public/file?b=branding&p=${encodeURIComponent(path)}` }).eq("id", r.id);
      }
      setLogo(null); setPhone(""); toast.success("تم إنشاء الزبون وحسابه"); setDone({ name: f.name, slug: f.slug, username: f.username, password: f.password }); setF({ name: "", slug: "", package_id: "", username: "", email: "", password: "" }); setTouched({}); onDone(); }
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
            <li><b>ضروري:</b> اسم التطبيق، الشعار (PNG مربع — يصبح أيقونة التطبيق)، البريد ورقم الجوال.</li>
            <li><b>السيرفر:</b> Host + يوزر + باسورد، والنوع Xtream / M3U.</li>
            <li><b>التواصل:</b> رقم واتساب الدعم.</li>
            <li><b>نحدده تلقائيًا:</b> الرابط المختصر، اسم الحزمة، اسم المستخدم، كلمة المرور.</li>
            <li className="text-muted-foreground">الباقي (ألوان، روابط، رسائل) يعدّله الزبون بنفسه من لوحته.</li>
          </ul>
        </details>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>اسم التطبيق</Label><Input required value={f.name} onChange={set("name")} placeholder="Bahrain Satellite" /></div>
          <p className="-mt-2 text-xs text-muted-foreground">الحقول التالية تُعبَّأ تلقائيًا من الاسم — تعدّل أيًّا منها لو تبي.</p>
          <div className="space-y-1"><Label>الرابط المختصر (إنجليزي صغير)</Label><Input dir="ltr" required pattern="[a-z0-9][a-z0-9\-]{1,30}" value={f.slug} onChange={set("slug")} placeholder="mytv" /></div>
          <div className="space-y-1"><Label>اسم الحزمة (لا يتغير لاحقًا)</Label><Input dir="ltr" required value={f.package_id} onChange={set("package_id")} /></div>
          <div className="space-y-1"><Label>شعار التطبيق <span className="text-xs font-normal text-muted-foreground">(إلزامي — يصبح أيقونة التطبيق على الجهاز)</span></Label>
            <div className="flex items-center gap-3">
              {logoPreview ? <img src={logoPreview} alt="الشعار" className="h-14 w-14 rounded-xl bg-secondary object-contain p-1" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-xs text-muted-foreground">لا يوجد</div>}
              <Input type="file" required accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
            </div>
            <p className="text-xs text-muted-foreground">يفضّل PNG مربع 512×512 بخلفية شفافة، حتى 3MB.</p>
          </div>
          <div className={`rounded-lg border p-3 text-sm leading-7 ${signed ? "border-primary/40 bg-primary/5" : "bg-muted/40"}`}>
            <p className="font-bold">توقيع التطبيق <span className="text-xs font-normal text-muted-foreground">(إلزامي)</span></p>
            {gs.isLoading ? <p className="text-muted-foreground">جارٍ فحص مفتاح التوقيع…</p> : signed ? (
              <p className="text-primary">✅ مفتاح التوقيع جاهز — كل التطبيقات تُبنى نسخة Release موقّعة ومحمية.</p>
            ) : <SigningSetup onDone={() => gs.refetch()} />}
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3">
          <p className="text-sm font-bold">بيانات لوحة التحكم والتواصل مع الزبون <span className="text-xs font-normal text-muted-foreground">(إلزامية — لا تظهر في التطبيق)</span></p>
          <div className="space-y-1"><Label>اسم مستخدم الزبون (إنجليزي صغير)</Label><Input dir="ltr" required pattern="[a-z0-9._\-]{3,30}" value={f.username} onChange={set("username")} placeholder="mytv" /></div>
          <div className="space-y-1"><Label>كلمة مرور الزبون</Label>
            <div className="flex gap-2">
              <Input dir="ltr" minLength={8} required value={f.password} onChange={set("password")} />
              <Button type="button" size="icon" variant="outline" title="كلمة مرور جديدة" onClick={() => { setTouched((t) => ({ ...t, password: true })); setF((p) => ({ ...p, password: genPass() })); }}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-1"><Label>بريد الزبون</Label><Input dir="ltr" type="email" required maxLength={255} value={f.email} onChange={set("email")} placeholder="name@example.com" /></div>
          <div className="space-y-1"><Label>رقم جوال الزبون</Label>
            <div className="flex gap-2" dir="ltr">
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={cc} onChange={(e) => setCc(e.target.value)}>
                {COUNTRIES.map((c) => <option key={c[1] + c[0]} value={c[1]}>{c[0]} {c[1]}</option>)}
              </select>
              <Input dir="ltr" required inputMode="numeric" pattern="[0-9]{6,14}" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))} placeholder="33001122" />
            </div>
          </div>
          </div>
          <Button className="w-full" disabled={busy}>إنشاء</Button>
        </form>
        </>)}
      </DialogContent>
    </Dialog>
  );
}

const COUNTRIES: [string, string][] = [
  ["🇧🇭 البحرين", "+973"], ["🇸🇦 السعودية", "+966"], ["🇦🇪 الإمارات", "+971"], ["🇰🇼 الكويت", "+965"],
  ["🇶🇦 قطر", "+974"], ["🇴🇲 عُمان", "+968"], ["🇮🇶 العراق", "+964"], ["🇯🇴 الأردن", "+962"],
  ["🇱🇧 لبنان", "+961"], ["🇸🇾 سوريا", "+963"], ["🇵🇸 فلسطين", "+970"], ["🇪🇬 مصر", "+20"],
  ["🇱🇾 ليبيا", "+218"], ["🇹🇳 تونس", "+216"], ["🇩🇿 الجزائر", "+213"], ["🇲🇦 المغرب", "+212"],
  ["🇸🇩 السودان", "+249"], ["🇾🇪 اليمن", "+967"], ["🇹🇷 تركيا", "+90"], ["🇮🇷 إيران", "+98"],
  ["🇬🇧 بريطانيا", "+44"], ["🇩🇪 ألمانيا", "+49"], ["🇫🇷 فرنسا", "+33"], ["🇳🇱 هولندا", "+31"],
  ["🇸🇪 السويد", "+46"], ["🇺🇸 أمريكا/كندا", "+1"], ["🇦🇺 أستراليا", "+61"], ["🇮🇳 الهند", "+91"], ["🇵🇰 باكستان", "+92"],
];

// حالة اتصال GitHub المستخدمة في بناء APK
function GithubStrip() {
  const getStatus = useServerFn(githubStatus);
  const q = useQuery({ queryKey: ["github-status"], queryFn: () => getStatus({}), staleTime: 30_000 });
  const s = q.data;
  const ready = Boolean(s?.connected && s.repoFound && s.workflowFound);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-5 py-3 text-sm">
      <Github className="h-4 w-4 shrink-0" />
      <b>اتصال GitHub:</b>
      {!s ? (
        <span className="text-muted-foreground">جارٍ الفحص…</span>
      ) : s.error ? (
        <span className="flex items-center gap-1 text-destructive"><CircleAlert className="h-4 w-4" />{s.error}</span>
      ) : ready ? (
        <span className="flex items-center gap-1 text-primary"><CircleCheck className="h-4 w-4" />جاهز للبناء — {s.account}</span>
      ) : (
        <span className="flex items-center gap-1 text-destructive"><CircleAlert className="h-4 w-4" />غير مكتمل</span>
      )}
      {s?.repo && <span className="text-muted-foreground" dir="ltr">{s.repo}</span>}
      <Button size="sm" variant="ghost" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className="h-3.5 w-3.5" />فحص</Button>
      {s && !s.repoFound && (
        <p className="w-full text-xs leading-6 text-muted-foreground">
          {s.repos.length
            ? <>المستودعات التي يراها هذا الحساب: <span dir="ltr">{s.repos.map((r) => r.name).join("، ")}</span></>
            : "لا يوجد مستودع متاح لهذا الحساب بعد."}
        </p>
      )}
    </div>
  );
}

function SigningSetup({ onDone }: { onDone: () => void }) {
  const run = useServerFn(setupSigningKey);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ keystoreB64: string; password: string; alias: string; sha256: string } | null>(null);
  const download = (r: NonNullable<typeof res>) => {
    const bin = Uint8Array.from(atob(r.keystoreB64), (c) => c.charCodeAt(0));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bin], { type: "application/x-pkcs12" }));
    a.download = "bahrain-satellite-release.p12"; a.click();
  };
  if (res) return (
    <div className="space-y-2">
      <p className="text-primary">✅ تم إنشاء مفتاح التوقيع وحفظه مشفّرًا في GitHub.</p>
      <p className="text-xs text-destructive">احفظ نسخة احتياطية الآن (تظهر مرة واحدة فقط) — ضياع المفتاح يمنع تحديث كل التطبيقات.</p>
      <div dir="ltr" className="rounded bg-background p-2 font-mono text-xs break-all">alias: {res.alias}<br />password: {res.password}<br />SHA-256: {res.sha256}</div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => download(res)}>تحميل ملف المفتاح</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`alias: ${res.alias}\npassword: ${res.password}\nSHA-256: ${res.sha256}`); toast.success("نُسخت بيانات المفتاح"); }}>نسخ البيانات</Button>
      </div>
    </div>
  );
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">لا يوجد مفتاح توقيع. ننشئ مفتاحًا احترافيًا (RSA 4096 — صالح 30 سنة) ونحفظه مشفّرًا في GitHub تلقائيًا. يُنشأ مرة واحدة ويُستخدم لكل التطبيقات.</p>
      <Button type="button" size="sm" disabled={busy} onClick={async () => {
        setBusy(true);
        try { const r = await run({}); setRes(r); download(r); onDone(); toast.success("تم إنشاء مفتاح التوقيع"); }
        catch (e) { toast.error(e instanceof Error ? e.message : "فشل إنشاء المفتاح"); }
        setBusy(false);
      }}>{busy ? "جارٍ الإنشاء…" : "إنشاء مفتاح التوقيع الآن"}</Button>
    </div>
  );
}
