import { createFileRoute } from "@tanstack/react-router";

// Serves logos and APK files from private storage (read policy allows these buckets).
export const Route = createFileRoute("/api/public/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const b = u.searchParams.get("b") ?? "";
        const p = u.searchParams.get("p") ?? "";
        if (!["branding", "apks"].includes(b) || !/^[\w\-./]{3,200}$/.test(p) || p.includes("..")) return new Response("bad request", { status: 400 });
        const { publicClient } = await import("@/lib/supabase-public.server");
        const { data, error } = await publicClient().storage.from(b).download(p);
        if (error || !data) return new Response("not found", { status: 404 });
        const name = p.split("/").pop()!;
        return new Response(data, {
          headers: {
            "content-type": b === "apks" ? "application/vnd.android.package-archive" : data.type || "image/png",
            "cache-control": b === "apks" ? "public, max-age=300" : "public, max-age=3600",
            "access-control-allow-origin": "*",
            ...(b === "apks" ? { "content-disposition": `attachment; filename="${name}"` } : {}),
          },
        });
      },
    },
  },
});
