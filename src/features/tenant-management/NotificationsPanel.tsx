import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseStatus,sendPush } from "@/lib/firebase.functions";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
Bell,
Trash2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { card,logChange,uploadImage,type Ctx } from "./shared";
/* ---------------- Notifications ---------------- */
export function Notify(c: Ctx) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ann", c.t.id], queryFn: async () => (await supabase.from("announcements").select("*").eq("tenant_id", c.t.id).order("created_at", { ascending: false })).data ?? [] });
  const [n, setN] = useState({ title: "", body: "", kind: "info", days: "7" });
  const [img, setImg] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState(true);
  const sendPushFn = useServerFn(sendPush);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ann", c.t.id] });
  const kinds: Record<string, string> = { info: "معلومة", maintenance: "صيانة", offer: "عرض", urgent: "عاجل" };
  return (
    <div className="space-y-6">
      {c.isAdmin && <FirebasePanel />}
      <form className={card} onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try {
          const image_url = img ? await uploadImage(c.t.id, img) : null;
          const expires_at = n.days === "0" ? null : new Date(Date.now() + Number(n.days) * 86400000).toISOString();
          const { error } = await supabase.from("announcements").insert({ tenant_id: c.t.id, title: n.title, body: n.body, kind: n.kind, image_url, expires_at });
          if (error) throw error;
          await logChange(c, "الإشعارات", `إرسال: ${n.title}`);
          if (c.isAdmin && push && n.body.trim()) {
            try { await sendPushFn({ data: { target: `tenant-${c.t.id}`, title: n.title.slice(0, 100), body: n.body.slice(0, 500) } }); toast.success("وصل إشعار للجوالات أيضًا"); }
            catch (pe) { toast.error("إشعار الجوال: " + (pe instanceof Error ? pe.message : "فشل")); }
          }
          setN({ ...n, title: "", body: "" }); setImg(null); refresh(); toast.success("تم الإرسال لكل المشتركين");
        } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ"); }
        setBusy(false);
      }}>
        <h2 className="text-lg font-extrabold">إرسال إشعار جديد</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
          <Input placeholder="عنوان الإشعار" required value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
          <select value={n.kind} onChange={(e) => setN({ ...n, kind: e.target.value })} className="h-10 rounded-md border bg-background px-3">{Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select value={n.days} onChange={(e) => setN({ ...n, days: e.target.value })} className="h-10 rounded-md border bg-background px-3"><option value="1">يوم</option><option value="3">3 أيام</option><option value="7">أسبوع</option><option value="30">شهر</option><option value="0">بدون انتهاء</option></select>
        </div>
        <Textarea rows={4} placeholder="نص الرسالة" value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} />
        <div className="space-y-1"><Label>صورة (اختيارية)</Label><Input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} /></div>
        {c.isAdmin && <div className="flex items-center gap-3"><Switch checked={push} onCheckedChange={setPush} /><Label>إرسال إشعار للجوالات أيضًا (Firebase)</Label>
          <Link to="/firebase" className="text-xs text-primary underline">إعدادات Firebase</Link></div>}
        <Button disabled={busy}><Bell className="h-4 w-4" />إرسال للجميع</Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs text-muted-foreground"><tr><th className="p-3 text-right">النوع</th><th className="p-3 text-right">العنوان</th><th className="p-3 text-right">المحتوى</th><th className="p-3 text-right">الإنشاء</th><th className="p-3 text-right">ينتهي</th><th className="p-3">إجراءات</th></tr></thead>
          <tbody>
            {q.data?.map((a) => {
              const expired = a.expires_at && new Date(a.expires_at) < new Date();
              return (
                <tr key={a.id} className="border-t">
                  <td className="p-3"><span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{kinds[a.kind] ?? a.kind}</span></td>
                  <td className="p-3 font-bold">{a.title}</td>
                  <td className="max-w-xs truncate p-3 text-muted-foreground">{a.body}</td>
                  <td className="p-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ar")}</td>
                  <td className="p-3">{expired ? <span className="text-destructive">منتهي</span> : a.expires_at ? new Date(a.expires_at).toLocaleDateString("ar") : "—"}</td>
                  <td className="p-3"><div className="flex items-center justify-center gap-2">
                    <Switch checked={a.active} onCheckedChange={async (v) => { await supabase.from("announcements").update({ active: v }).eq("id", a.id); refresh(); }} />
                    <Button variant="ghost" size="icon" aria-label="حذف" onClick={async () => { await supabase.from("announcements").delete().eq("id", a.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {q.data?.length === 0 && <p className="p-8 text-center text-muted-foreground">لا توجد إشعارات بعد.</p>}
      </div>
    </div>
  );
}

/* ---------------- Firebase (admin only) ---------------- */
function FirebasePanel() {
  const status = useServerFn(getFirebaseStatus);
  const q = useQuery({ queryKey: ["firebase-status-tenant"], queryFn: () => status() });
  const s = q.data?.settings;
  const state = q.isLoading
    ? "جارٍ التحقق من حالة Firebase…"
    : !s
      ? "غير مربوطة — ارفع ملف حساب الخدمة من إعدادات Firebase"
      : s.enabled
        ? "مفعّلة — إشعاراتك توصل لجوالات المشتركين حتى لو التطبيق مقفل"
        : "مربوطة لكن موقوفة — شغّلها من صفحة إعدادات Firebase";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-extrabold">الإشعارات (Firebase)</p>
          <p className="text-xs text-muted-foreground">{state}</p>
        </div>
      </div>
      <Button asChild size="sm"><Link to="/firebase">فتح إعدادات Firebase</Link></Button>
    </div>
  );
}

