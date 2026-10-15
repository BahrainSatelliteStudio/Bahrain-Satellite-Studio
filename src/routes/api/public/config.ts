import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Public config consumed by the Android app. Only non-secret, published data.
export const Route = createFileRoute("/api/public/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(process.env.SUPABASE_URL!, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_")) { h.delete("Authorization"); h.set("apikey", key); }
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const code = new URL(request.url).searchParams.get("code");
        const [{ data: settings }, { data: servers }] = await Promise.all([
          sb.from("app_settings").select("app_name,logo_url,store_url,support_whatsapp,support_phone,support_telegram,announcement,config_version").eq("id", 1).single(),
          sb.from("servers").select("id,code,name,sort_order,hosts(url,is_primary,sort_order)").eq("enabled", true).order("sort_order"),
        ]);
        let list = (servers ?? []).map((s: any) => ({
          code: s.code, name: s.name,
          hosts: (s.hosts ?? []).sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order).map((h: any) => h.url),
        }));
        if (code) list = list.filter((s) => s.code === code);
        return Response.json({ settings, servers: list }, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
      },
    },
  },
});
