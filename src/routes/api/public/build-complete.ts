import { createFileRoute } from "@tanstack/react-router";

// Called by GitHub Actions after building a tenant APK. Verified with a shared secret.
export const Route = createFileRoute("/api/public/build-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BUILD_CALLBACK_SECRET"];
        if (!secret || request.headers.get("x-build-secret") !== secret) return new Response("unauthorized", { status: 401 });
        const form = await request.formData();
        const buildId = String(form.get("build_id") ?? "");
        if (!/^[0-9a-f-]{36}$/.test(buildId)) return new Response("bad build id", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: build } = await supabaseAdmin.from("builds").select("id,tenant_id,version").eq("id", buildId).single();
        if (!build) return new Response("not found", { status: 404 });
        const status = String(form.get("status") ?? "done");
        const file = form.get("apk");
        if (status !== "done" || !(file instanceof File)) {
          await supabaseAdmin.from("builds").update({ status: "failed", error: String(form.get("error") ?? "build failed").slice(0, 500), finished_at: new Date().toISOString() }).eq("id", buildId);
          return Response.json({ ok: true });
        }
        const { data: t } = await supabaseAdmin.from("tenants").select("slug").eq("id", build.tenant_id).single();
        const path = `${build.tenant_id}/${t?.slug ?? "app"}-${build.version}.apk`;
        const up = await supabaseAdmin.storage.from("apks").upload(path, file, { upsert: true, contentType: "application/vnd.android.package-archive" });
        if (up.error) return new Response(up.error.message, { status: 500 });
        const apk_url = `/api/public/file?b=apks&p=${encodeURIComponent(path)}`;
        await supabaseAdmin.from("builds").update({ status: "done", apk_url, finished_at: new Date().toISOString() }).eq("id", buildId);
        await supabaseAdmin.from("tenants").update({ update_url: apk_url }).eq("id", build.tenant_id);
        return Response.json({ ok: true });
      },
    },
  },
});
