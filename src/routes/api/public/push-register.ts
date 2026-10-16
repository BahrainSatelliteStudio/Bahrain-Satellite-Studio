import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// يسجّل جهاز المشترك في مواضيع الإشعارات (all + tenant-<id>). لا يرجع أي بيانات خاصة.
const schema = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/), token: z.string().min(20).max(4096) });

export const Route = createFileRoute("/api/public/push-register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const p = schema.safeParse(await request.json().catch(() => null));
        if (!p.success) return new Response("bad input", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: t } = await supabaseAdmin.from("tenants").select("id").eq("slug", p.data.slug).maybeSingle();
        if (!t) return new Response("not found", { status: 404 });
        const { data: fs } = await supabaseAdmin.from("firebase_settings").select("service_account, enabled").eq("id", "main").maybeSingle();
        if (!fs?.enabled || !fs.service_account) return Response.json({ ok: false, reason: "disabled" });
        const { subscribeToTopics } = await import("@/lib/firebase.server");
        try {
          await subscribeToTopics(fs.service_account as never, p.data.token, ["all", `tenant-${t.id}`]);
        } catch (e) {
          console.error(e);
          return new Response("subscribe failed", { status: 502 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
