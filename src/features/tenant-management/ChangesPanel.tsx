import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

import { card,type Ctx } from "./shared";
/* ---------------- Changes ---------------- */
export function Changes(c: Ctx) {
  const q = useQuery({ queryKey: ["changes", c.t.id], queryFn: async () => (await supabase.from("tenant_changes").select("*").eq("tenant_id", c.t.id).order("created_at", { ascending: false }).limit(200)).data ?? [] });
  return (
    <div className={card}>
      {q.data?.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد تغييرات مسجلة بعد.</p>}
      {q.data?.map((x) => (
        <div key={x.id} className="flex flex-wrap items-center gap-3 border-b pb-3 text-sm last:border-0">
          <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">{x.section}</span>
          <span className="flex-1 font-bold">{x.summary}</span>
          <span className="text-muted-foreground">{x.user_email}</span>
          <span className="text-muted-foreground">{new Date(x.created_at).toLocaleString("ar")}</span>
        </div>
      ))}
    </div>
  );
}

