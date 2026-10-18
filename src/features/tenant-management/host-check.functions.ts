import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isHostReachable } from "@/lib/player/transport";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
export const checkHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sourceId: string }) => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s, error } = await context.supabase.from("tenant_sources").select("id,tenant_id,url,backup_urls").eq("id", data.sourceId).single();
    if (error || !s) throw new Error("السيرفر غير موجود");
    const { data: member, error: accessError } = await context.supabase.rpc("is_tenant_member", { _tenant_id: s.tenant_id });
    if (accessError || !member) throw new Error("لا تملك صلاحية فحص هذا السيرفر");
    const urls = [s.url, ...(s.backup_urls ?? [])];
    const results = await Promise.all(urls.map(async (u) => {
      const t0 = Date.now();
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(u.replace(/\/+$/, "") + "/player_api.php", { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 IPTVPlayer" } });
        await r.body?.cancel();
        return { url: u, ok: isHostReachable(r.status), status: r.status, ms: Date.now() - t0 };
      } catch { return { url: u, ok: false, status: 0, ms: Date.now() - t0 }; }
      finally { clearTimeout(tm); }
    }));
    const ok = results.some((r) => r.ok);
    await context.supabase.from("tenant_sources").update({ last_check_ok: ok, last_check_at: new Date().toISOString() }).eq("id", s.id);
    return { ok, results };
  });
