import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("هذه الصفحة للمسؤول فقط");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadAccount(admin: any) {
  const { data } = await admin.from("firebase_settings").select("*").eq("id", "main").maybeSingle();
  if (!data) throw new Error("ارفع ملف حساب الخدمة أولًا");
  return data as { service_account: any; enabled: boolean };
}

export const getFirebaseStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const { data: raw } = await admin.from("firebase_settings").select("project_id, client_email, enabled, updated_at, google_services").eq("id", "main").maybeSingle();
    const gs = (raw as any)?.google_services;
    const data = raw ? { project_id: raw.project_id, client_email: raw.client_email, enabled: raw.enabled, updated_at: raw.updated_at,
      packages: gs ? ((gs.client ?? []).map((c: any) => c?.client_info?.android_client_info?.package_name).filter(Boolean) as string[]) : null } : null;
    const { data: history } = await admin.from("push_notifications").select("id, target, title, body, status, error, created_at").order("created_at", { ascending: false }).limit(20);
    const { data: tenants } = await admin.from("tenants").select("id, name").order("name");
    return { settings: data ?? null, history: history ?? [], tenants: (tenants ?? []) as { id: string; name: string }[] };
  });

const saSchema = z.object({
  type: z.literal("service_account"),
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().includes("PRIVATE KEY"),
}).passthrough();

export const saveFirebaseAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json: string }) => z.object({ json: z.string().min(10).max(20000) }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    let parsed: unknown;
    try { parsed = JSON.parse(data.json); } catch { throw new Error("الملف ليس بصيغة JSON صحيحة"); }
    const r = saSchema.safeParse(parsed);
    if (!r.success) throw new Error("هذا ليس ملف حساب خدمة Firebase");
    const sa = r.data;
    const { error } = await admin.from("firebase_settings").upsert({
      id: "main", service_account: sa as never, project_id: sa.project_id, client_email: sa.client_email, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { project_id: sa.project_id };
  });

export const saveGoogleServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json: string }) => z.object({ json: z.string().min(10).max(50000) }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    let p: any;
    try { p = JSON.parse(data.json); } catch { throw new Error("الملف ليس بصيغة JSON صحيحة"); }
    const pkgs: string[] = (p?.client ?? []).map((c: any) => c?.client_info?.android_client_info?.package_name).filter(Boolean);
    if (!p?.project_info?.project_id || !pkgs.length) throw new Error("هذا ليس ملف google-services.json");
    const { data: row } = await admin.from("firebase_settings").select("project_id").eq("id", "main").maybeSingle();
    if (!row) throw new Error("ارفع ملف حساب الخدمة أولًا");
    if (row.project_id !== p.project_info.project_id) throw new Error("الملف من مشروع Firebase مختلف عن حساب الخدمة");
    const { error } = await admin.from("firebase_settings").update({ google_services: p }).eq("id", "main");
    if (error) throw new Error(error.message);
    return { packages: pkgs };
  });

export const setFirebaseEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { error } = await admin.from("firebase_settings").update({ enabled: data.enabled }).eq("id", "main");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testFirebase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);
    const row = await loadAccount(admin);
    const { sendToTopic } = await import("./firebase.server");
    await sendToTopic(row.service_account, "all", "test", "test", true);
    return { ok: true };
  });

export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { target: string; title: string; body: string }) => z.object({
    target: z.string().regex(/^(all|tenant-[0-9a-f-]{36})$/),
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(500),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const row = await loadAccount(admin);
    if (!row.enabled) throw new Error("الإشعارات موقوفة — شغّلها أولًا");
    const { sendToTopic } = await import("./firebase.server");
    try {
      await sendToTopic(row.service_account, data.target, data.title, data.body);
      await admin.from("push_notifications").insert({ ...data, status: "sent", created_by: context.userId });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("push_notifications").insert({ ...data, status: "failed", error: msg.slice(0, 500), created_by: context.userId });
      throw new Error(msg);
    }
  });
