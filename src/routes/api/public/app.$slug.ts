import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/app/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(params.slug)) return new Response("bad slug", { status: 400 });
        const { loadTenantConfig } = await import("@/lib/supabase-public.server");
        const cfg = await loadTenantConfig(params.slug);
        if (!cfg) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(cfg, { headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } });
      },
    },
  },
});
