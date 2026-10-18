import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { checkHost } from "@/lib/iptv.functions";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
Plus,
RefreshCw,
Trash2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { hostCount,logChange,Stat,useSources,type Ctx,type Source } from "./shared";
/* ---------------- Servers ---------------- */
export function Servers(c: Ctx) {
  const qc = useQueryClient();
  const q = useSources(c.t.id);
  const [search, setSearch] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["sources", c.t.id] });
  const list = (q.data ?? []).filter((s) => !search || s.name.includes(search) || (s.login_code ?? "").includes(search));
  const add = async () => {
    const n = (q.data?.length ?? 0) + 1;
    const { error } = await supabase.from("tenant_sources").insert({ tenant_id: c.t.id, type: "xtream", name: `سيرفر ${n}`, url: "http://", sort_order: n, login_code: String(n) });
    if (error) toast.error(error.message); else { await logChange(c, "السيرفرات", `إضافة سيرفر ${n}`); refresh(); }
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="السيرفرات" value={q.data?.length ?? 0} />
        <Stat label="المفعّلة" value={q.data?.filter((s) => s.enabled).length ?? 0} />
        <Stat label="الهوستات المستخدمة" value={hostCount(q.data ?? [])} sub={`/ ${c.t.max_hosts}`} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="ابحث بالاسم أو كود الدخول" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button className="mr-auto" onClick={add}><Plus className="h-4 w-4" />إضافة سيرفر</Button>
      </div>
      {list.map((s, i) => <ServerCard key={s.id} c={c} s={s} idx={i + 1} onChange={refresh} />)}
      {q.data?.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">لا توجد سيرفرات. اضغط «إضافة سيرفر».</p>}
    </div>
  );
}

function ServerCard({ c, s, idx, onChange }: { c: Ctx; s: Source; idx: number; onChange: () => void }) {
  const check = useServerFn(checkHost);
  const [f, setF] = useState({ name: s.name, type: s.type, url: s.url, login_code: s.login_code ?? "", backup_urls: s.backup_urls ?? [], activation_api_url: s.activation_api_url ?? "" });
  const [res, setRes] = useState<{ url: string; ok: boolean; ms: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const { error } = await supabase.from("tenant_sources").update({ ...f, login_code: f.login_code || null, activation_api_url: f.activation_api_url || null, backup_urls: f.backup_urls.filter(Boolean) }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success("تم حفظ السيرفر"); await logChange(c, "السيرفرات", `تعديل ${f.name}`); onChange(); }
  };
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b bg-secondary/50 px-5 py-3">
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-sm font-extrabold text-primary">#{idx}</span>
        <span className="font-bold">{s.name}</span>
        {s.last_check_at && <span className={`text-xs ${s.last_check_ok ? "text-primary" : "text-destructive"}`}>{s.last_check_ok ? "● متصل" : "● لا يستجيب"}</span>}
        <div className="mr-auto flex items-center gap-3">
          <Switch checked={s.enabled} onCheckedChange={async (v) => { await supabase.from("tenant_sources").update({ enabled: v }).eq("id", s.id); onChange(); }} />
          <span className="text-sm">{s.enabled ? "مفعّل" : "متوقف"}</span>
          <button className="text-sm font-bold text-destructive" onClick={async () => { if (!confirm("حذف السيرفر؟")) return; await supabase.from("tenant_sources").delete().eq("id", s.id); await logChange(c, "السيرفرات", `حذف ${s.name}`); onChange(); }}>حذف</button>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1"><Label>اسم السيرفر</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>النوع</Label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="xtream">Xtream Codes</option><option value="m3u">M3U</option><option value="mac">MAC Portal</option></select></div>
          <div className="space-y-1"><Label>كود الدخول في التطبيق</Label><Input dir="ltr" value={f.login_code} onChange={(e) => setF({ ...f, login_code: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>الهوست الأساسي</Label><Input dir="ltr" placeholder="http://server.com:8080" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">المشترك يكتب كود الدخول، أو يتركه فارغًا ويبحث التطبيق في كل السيرفرات بالاسم وكلمة المرور.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><Label>الهوستات الاحتياطية {f.backup_urls.length} / 7</Label>
            <Button size="sm" variant="secondary" disabled={f.backup_urls.length >= 7} onClick={() => setF({ ...f, backup_urls: [...f.backup_urls, ""] })}><Plus className="h-4 w-4" />إضافة احتياطي</Button></div>
          {f.backup_urls.map((u, i) => (
            <div key={i} className="flex gap-2">
              <Input dir="ltr" placeholder="http://backup.com:8080" value={u} onChange={(e) => { const b = [...f.backup_urls]; b[i] = e.target.value; setF({ ...f, backup_urls: b }); }} />
              <Button variant="ghost" size="icon" aria-label="حذف" onClick={() => setF({ ...f, backup_urls: f.backup_urls.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">إذا تعطل الهوست الأساسي ينتقل التطبيق تلقائيًا للاحتياطي.</p>
        </div>
        <div className="space-y-1"><Label>رابط API لتفعيل الأكواد (اختياري)</Label><Input dir="ltr" placeholder="https://provider.example/api/activate" value={f.activation_api_url} onChange={(e) => setF({ ...f, activation_api_url: e.target.value })} /></div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button onClick={save}>حفظ السيرفر</Button>
          <Button variant="secondary" disabled={busy} onClick={async () => {
            setBusy(true);
            try { const r = await check({ data: { sourceId: s.id } }); setRes(r.results); onChange(); } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الفحص"); }
            setBusy(false);
          }}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />فحص الاتصال</Button>
          <span className="text-xs text-muted-foreground">يفحص الهوستات المحفوظة، ولا يتحقق من صلاحية الاشتراكات.</span>
        </div>
        {res && <div className="space-y-1">{res.map((r) => <p key={r.url} dir="ltr" className={`text-sm ${r.ok ? "text-primary" : "text-destructive"}`}>{r.ok ? "✓" : "✗"} {r.url} · {r.ms}ms</p>)}</div>}
      </div>
    </div>
  );
}

