import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Satellite, MessageCircle, Phone, Send, ShoppingBag, Server as ServerIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, toLatinDigits, type Host, type Server } from "@/lib/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bahrain Satellite — التطبيق" },
      { name: "description", content: "أدخل كود السيرفر واحصل على الهوستات وأرقام الدعم" },
      { property: "og:title", content: "Bahrain Satellite" },
      { property: "og:description", content: "تطبيق Bahrain Satellite للعملاء" },
    ],
  }),
  component: ClientApp,
});

function ClientApp() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [code, setCode] = useState("");
  const [result, setResult] = useState<(Server & { hosts: Host[] })[] | null>(null);
  const [busy, setBusy] = useState(false);
  const s = settings.data;

  async function search() {
    setBusy(true);
    let q = supabase.from("servers").select("*, hosts(*)").eq("enabled", true).order("sort_order");
    if (code) q = q.eq("code", code);
    const { data } = await q;
    setResult((data as any) ?? []);
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: "var(--gradient-sky)" }}>
      <div className="mx-auto max-w-md px-5 py-8">
        <header className="mb-8 flex flex-col items-center text-center">
          {s?.logo_url ? <img src={s.logo_url} alt="" className="mb-3 h-20 w-20 rounded-2xl object-cover" /> :
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Satellite className="h-10 w-10" /></div>}
          <h1 className="text-3xl font-extrabold">{s?.app_name ?? "Bahrain Satellite"}</h1>
          {s?.announcement && <p className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">{s.announcement}</p>}
        </header>

        <section className="rounded-2xl border bg-card p-5">
          <label className="mb-2 block text-sm text-muted-foreground">كود السيرفر (اتركه فارغًا للبحث التلقائي)</label>
          <div className="flex gap-2">
            <Input inputMode="numeric" dir="ltr" placeholder="77" value={code} onChange={(e) => setCode(toLatinDigits(e.target.value).slice(0, 6))} className="text-center text-lg" />
            <Button onClick={search} disabled={busy}>دخول</Button>
          </div>
          {result && (
            <div className="mt-5 space-y-3">
              {result.length === 0 && <p className="text-center text-sm text-muted-foreground">لا يوجد سيرفر بهذا الكود</p>}
              {result.map((sv) => (
                <div key={sv.id} className="rounded-xl bg-secondary p-4">
                  <div className="mb-2 flex items-center gap-2 font-bold"><ServerIcon className="h-4 w-4 text-primary" />{sv.name}<span className="ms-auto text-xs text-muted-foreground">#{sv.code}</span></div>
                  {[...sv.hosts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order).map((h) => (
                    <button key={h.id} onClick={() => { navigator.clipboard.writeText(h.url); toast.success("تم النسخ"); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted" dir="ltr">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{h.url}</span>
                      {h.is_primary && <span className="ms-auto rounded bg-primary px-1.5 text-xs text-primary-foreground">أساسي</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          {s?.support_whatsapp && <a className="flex items-center justify-center gap-2 rounded-xl border bg-card p-4 font-medium" href={`https://wa.me/${s.support_whatsapp.replace(/\D/g, "")}`}><MessageCircle className="h-5 w-5 text-primary" />واتساب</a>}
          {s?.support_phone && <a className="flex items-center justify-center gap-2 rounded-xl border bg-card p-4 font-medium" href={`tel:${s.support_phone}`}><Phone className="h-5 w-5 text-primary" />اتصال</a>}
          {s?.support_telegram && <a className="flex items-center justify-center gap-2 rounded-xl border bg-card p-4 font-medium" href={`https://t.me/${s.support_telegram.replace("@", "")}`}><Send className="h-5 w-5 text-primary" />تيليجرام</a>}
          {s?.store_url && <a className="flex items-center justify-center gap-2 rounded-xl bg-accent p-4 font-bold text-accent-foreground" href={s.store_url} target="_blank" rel="noreferrer"><ShoppingBag className="h-5 w-5" />المتجر</a>}
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground"><Link to="/auth" className="hover:text-foreground">دخول المسؤول</Link></p>
      </div>
    </div>
  );
}
