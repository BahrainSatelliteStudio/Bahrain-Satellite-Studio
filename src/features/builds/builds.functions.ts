import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isHostReachable, providerHttpError } from "@/lib/player/transport";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
export const githubStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin-access.server");
    await assertAdmin(context.supabase, context.userId);
    const { readStatus } = await import("@/lib/github.server");
    return readStatus();
  });

export const setupSigningKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin-access.server");
    await assertAdmin(context.supabase, context.userId);
    const repo = (process.env["GITHUB_REPO"] ?? "").trim();
    if (!repo) throw new Error("لم يتم ربط GitHub بعد");
    const { gh } = await import("@/lib/github.server");
    const { setupSigning } = await import("@/lib/signing.server");
    return setupSigning(gh, repo, "Bahrain Satellite Studio");
  });

export const triggerBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), version: z.string().regex(/^\d+\.\d+\.\d+$/), siteUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin-access.server");
    await assertAdmin(context.supabase, context.userId);
    const repo = (process.env["GITHUB_REPO"] ?? "").trim();
    if (!repo) throw new Error("لم يتم ربط GitHub بعد — اربط اتصال GitHub من إعدادات المشروع");
    const { data: t } = await context.supabase.from("tenants").select("*").eq("id", data.tenantId).single();
    if (!t) throw new Error("الزبون غير موجود");
    if (!t.logo_url) throw new Error("ارفع شعار التطبيق أولًا — هو أيقونة التطبيق ومطلوب للبناء");
    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: fs } = await supabaseAdmin.from("firebase_settings").select("google_services").eq("id", "main").maybeSingle();
      const gs = (fs as any)?.google_services;
      const pkgs: string[] = gs ? (gs.client ?? []).map((c: any) => c?.client_info?.android_client_info?.package_name).filter(Boolean) : [];
      if (!pkgs.includes(t.package_id)) throw new Error(`اسم التطبيق ${t.package_id} غير مسجّل في Firebase — أضفه في Firebase كتطبيق أندرويد، ثم نزّل google-services.json الجديد وارفعه من صفحة «الإشعارات (Firebase)»، وبعدها ابنِ التطبيق`);
    }
    const { data: b, error } = await context.supabase.from("builds").insert({ tenant_id: t.id, version: data.version, status: "building" }).select("id").single();
    if (error) throw new Error(error.message);
    const origin = new URL(data.siteUrl).origin;
    const logo = t.logo_url ? (t.logo_url.startsWith("http") ? t.logo_url : origin + t.logo_url) : "";
    try {
      const { dispatchBuild } = await import("@/lib/github.server");
      await dispatchBuild(repo, {
        build_id: b.id, app_name: t.name, package_id: t.package_id, version: data.version,
        app_url: `${origin}/p/${t.slug}`, logo_url: logo, callback_url: `${origin}/api/public/build-complete`,
        callback_secret: process.env["BUILD_CALLBACK_SECRET"] ?? "",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل تشغيل البناء";
      await context.supabase.from("builds").update({ status: "failed", error: msg.slice(0, 500) }).eq("id", b.id);
      throw new Error(msg);
    }
    await context.supabase.from("tenants").update({ latest_version: data.version }).eq("id", t.id);
    return { buildId: b.id };
  });

