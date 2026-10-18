import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Eye, Palette, Smartphone, Hammer, Check, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import { applicationsQuery, withApplicationTemplate } from "@/lib/application-library";
import { TEMPLATES, resolveLayout, type TemplateKey } from "@/lib/layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import cover from "@/assets/preview/cinema-horizon.jpg";

export const Route = createFileRoute("/_authenticated/applications")({
  loader: ({ context }) => context.queryClient.ensureQueryData(applicationsQuery()),
  head: () => ({ meta: [
    { title: "صناعة التطبيقات والثيمات — BHSAT Studio" },
    { name: "description", content: "مكتبة تطبيقات Bahrain Satellite وقوالبها ومعاينتها وإصداراتها من مصدر موحد." },
    { property: "og:title", content: "صناعة التطبيقات والثيمات — BHSAT Studio" },
    { property: "og:description", content: "إدارة التطبيقات واختيار قوالب المشاهدة ومعاينتها." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Applications,
});

function Applications() {
  const { data: apps } = useSuspenseQuery(applicationsQuery());
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [template, setTemplate] = useState<TemplateKey>("experience");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = apps.find((app) => app.id === selectedId) ?? apps[0];
  const filtered = apps.filter((app) => `${app.name} ${app.slug}`.toLowerCase().includes(q.toLowerCase()));
  const apply = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const { data: current, error: readError } = await supabase.from("tenants").select("layout").eq("id", selected.id).single();
      if (readError) throw readError;
      const { error } = await supabase.from("tenants").update({ layout: withApplicationTemplate(current.layout, template) }).eq("id", selected.id);
      if (error) throw error;
      await Promise.all([qc.invalidateQueries({ queryKey: ["application-library"] }), qc.invalidateQueries({ queryKey: ["tenant", selected.id] })]);
      toast.success("تم حفظ الثيم للتطبيق");
    } catch { toast.error("تعذر حفظ الثيم، حاول مجددًا"); }
    finally { setSaving(false); }
  };
  return <div dir="rtl" className="theme-bhsat min-h-screen bg-background text-foreground">
    <header className="border-b"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 p-5">
      <div className="flex items-center gap-3"><Layers className="text-primary" /><span className="text-xl font-extrabold">BHSAT Studio</span></div>
      <Button asChild variant="outline"><Link to="/dashboard"><ArrowRight />الزبائن والإدارة</Link></Button>
    </div></header>
    <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-extrabold">صناعة التطبيقات</h1><span className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="h-4 w-4" />مصدر موحّد · {TEMPLATES.length} ثيمات · {apps.length} تطبيق</span></div>
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">تطبيقاتي</h2><div className="relative"><Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="بحث التطبيقات" placeholder="ابحث عن تطبيق…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" /></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((app) => <Button key={app.id} variant="outline" onClick={() => { setSelectedId(app.id); setTemplate(resolveLayout(app.layout).template); }} className={`h-auto min-h-24 justify-start gap-4 whitespace-normal p-4 text-start ${selected?.id === app.id ? "border-primary bg-primary/10" : ""}`}>
          {app.logo_url ? <img src={app.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-md object-contain" /> : <Smartphone className="h-8 w-8 shrink-0 text-primary" />}
          <span className="min-w-0"><span className="block break-words font-bold">{app.name}</span><span className="block text-xs text-muted-foreground" dir="ltr">v{app.latest_version} · {app.enabled ? "نشط" : "متوقف"}</span></span>{selected?.id === app.id && <Check className="ms-auto shrink-0 text-primary" />}
        </Button>)}</div>
        {!filtered.length && <p className="py-6 text-muted-foreground">{apps.length ? "لا توجد نتائج." : "لا توجد تطبيقات بعد."}</p>}
      </section>
      <section className="space-y-4 border-t pt-6"><h2 className="flex items-center gap-2 text-xl font-bold"><Palette className="text-primary" />مكتبة الثيمات</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{TEMPLATES.map(([key, name, description]) => <Button key={key} variant="outline" onClick={() => setTemplate(key)} aria-pressed={template === key} className={`h-auto flex-col items-stretch gap-0 overflow-hidden whitespace-normal p-0 text-start ${template === key ? "border-primary ring-1 ring-primary" : ""}`}>
          <img src={cover} alt="" className="aspect-[16/7] w-full object-cover" />
          <span className="space-y-2 p-4"><span className="flex items-center justify-between gap-2 font-bold">{name}{template === key && <Check className="shrink-0 text-primary" />}</span><span className="block min-h-10 text-xs leading-5 text-muted-foreground">{description}</span></span>
        </Button>)}</div>
      </section>
      {selected && <section className="space-y-4 border-t pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">معاينة — {selected.name}</h2><div className="flex flex-wrap gap-2">
        <Button onClick={apply} disabled={saving}><Check />{saving ? "جارٍ الحفظ…" : "اعتماد الثيم"}</Button>
        <Button asChild variant="secondary"><Link to="/t/$tenantId" params={{ tenantId: selected.id }} search={{ section: "studio" }}><Palette />تخصيص التطبيق</Link></Button>
        <Button asChild variant="outline"><Link to="/t/$tenantId" params={{ tenantId: selected.id }} search={{ section: "builds" }}><Hammer />إصدارات APK</Link></Button>
        <Button asChild variant="outline"><Link to="/preview/$slug" params={{ slug: selected.slug }} search={{ template }} target="_blank"><Eye />فتح المعاينة</Link></Button>
      </div></div><iframe key={`${selected.id}:${template}`} src={`/preview/${selected.slug}?template=${template}`} title={`معاينة ثيم ${selected.name}`} className="h-[640px] w-full rounded-md border bg-card" /></section>}
    </main>
  </div>;
}