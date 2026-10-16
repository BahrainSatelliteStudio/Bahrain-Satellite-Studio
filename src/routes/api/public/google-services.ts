import { createFileRoute } from "@tanstack/react-router";

// يُستدعى من GitHub Actions أثناء البناء (محمي بسر البناء) لجلب google-services.json لحزمة الزبون.
export const Route = createFileRoute("/api/public/google-services")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["BUILD_CALLBACK_SECRET"];
        if (!secret || request.headers.get("x-build-secret") !== secret) return new Response("unauthorized", { status: 401 });
        const pkg = new URL(request.url).searchParams.get("package") ?? "";
        if (!/^[a-zA-Z][\w.]{2,150}$/.test(pkg)) return new Response("bad package", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("firebase_settings").select("google_services, enabled").eq("id", "main").maybeSingle();
        const gs = data?.google_services as any;
        if (!data?.enabled || !gs) return new Response("not configured", { status: 404 });
        const client = (gs.client ?? []).filter((c: any) => c?.client_info?.android_client_info?.package_name === pkg);
        if (!client.length) return new Response("package not registered", { status: 404 });
        return Response.json({ ...gs, client });
      },
    },
  },
});
