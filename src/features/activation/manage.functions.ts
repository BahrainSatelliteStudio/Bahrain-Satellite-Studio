import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activationBatchSchema } from "@/lib/activation-code-rules";

export const listActivationCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: accessError } = await context.supabase.rpc("is_tenant_member", {
      _tenant_id: data.tenantId,
    });
    if (accessError || !allowed) throw new Error("لا تملك صلاحية إدارة أكواد هذا التطبيق");
    const [accounts, codes] = await Promise.all([
      context.supabase
        .from("activation_accounts")
        .select("id,label,mode,source_id")
        .eq("tenant_id", data.tenantId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("activation_codes")
        .select("id,account_id,code_hint,enabled,activated_at,created_at")
        .eq("tenant_id", data.tenantId)
        .order("created_at", { ascending: false }),
    ]);
    if (accounts.error || codes.error) throw new Error("تعذر تحميل الأكواد");
    return { accounts: accounts.data ?? [], codes: codes.data ?? [] };
  });

export const createActivationCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => activationBatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { sha256 } = await import("@/lib/activation");
    const codes = Array.from({ length: data.count }, () => {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      return (
        "BH-" +
        Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()
      );
    });
    const entries = await Promise.all(
      codes.map(async (code) => ({ hash: await sha256(code), hint: code.slice(-6) })),
    );
    const { error } = await context.supabase.rpc("create_activation_bundle", {
      _tenant: data.tenantId,
      _source: data.sourceId,
      _mode: data.mode,
      _label: data.label,
      _username: data.username,
      _password: data.password,
      _account: data.accountId ?? "00000000-0000-0000-0000-000000000000",
      _codes: entries,
    });
    if (error) throw new Error(error.message);
    return { codes };
  });

export const setActivationCodeEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("activation_codes")
      .update({ enabled: data.enabled })
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId)
      .select("id");
    if (error || !rows?.length) throw new Error("تعذر تعديل الكود");
    return { ok: true };
  });
