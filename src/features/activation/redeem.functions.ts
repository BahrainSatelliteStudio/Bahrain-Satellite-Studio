import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
// تفعيل كود: الخادم وسيط آمن — رابط خدمة التفعيل ومفتاح XOR لا يصلان للتطبيق أبدًا
const activationLocks = new Set<string>();
export const activateCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: slugZ,
        serverCode: z
          .string()
          .regex(/^\d{1,6}$/)
          .optional()
          .or(z.literal("")),
        code: z
          .string()
          .min(1)
          .max(128)
          .regex(/^[\x20-\x7e]+$/),
        deviceId: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
        model: z.string().max(60).default("Android TV"),
        firmware: z.string().max(20).default("12"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { activateWithProvider, sha256 } = await import("@/lib/activation");
    const { data: t } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", data.slug)
      .eq("enabled", true)
      .maybeSingle();
    if (!t) throw new Error("التطبيق غير موجود");
    if (data.code.trim().toUpperCase().startsWith("BH-")) {
      const { normalizeActivationCode } = await import("@/lib/activation-code-rules");
      const { data: result, error } = await supabaseAdmin.rpc("redeem_builtin_code", {
        _slug: data.slug,
        _hash: await sha256(normalizeActivationCode(data.code)),
        _device: data.deviceId.toUpperCase(),
      });
      if (error) throw new Error("تعذر تفعيل الكود، حاول مجددًا");
      const parsed = z
        .object({ sourceId: z.string().uuid(), username: z.string(), password: z.string() })
        .safeParse(result);
      if (!parsed.success) {
        const failure = z.object({ error: z.string() }).safeParse(result);
        throw new Error(failure.success ? failure.data.error : "تعذر تفعيل الكود");
      }
      return parsed.data;
    }
    const { data: all } = await supabaseAdmin
      .from("tenant_sources")
      .select("id,login_code,activation_api_url,type")
      .eq("tenant_id", t.id)
      .eq("enabled", true)
      .eq("type", "xtream")
      .not("activation_api_url", "is", null);
    const list = (all ?? []).filter((s) => s.activation_api_url?.trim());
    const src = data.serverCode
      ? list.find((s) => s.login_code === data.serverCode)
      : list.length === 1
        ? list[0]
        : null;
    if (!src)
      throw new Error(
        data.serverCode
          ? "كود السيرفر غير صحيح أو التفعيل غير مفعّل له"
          : list.length
            ? "أدخل كود السيرفر"
            : "تفعيل الأكواد غير متاح",
      );
    const mac = data.deviceId.toUpperCase();
    const rid = await sha256(`${src.id}|${src.activation_api_url}|${mac}|${data.code}`);
    const { data: old } = await supabaseAdmin
      .from("activation_receipts")
      .select("username,password")
      .eq("id", rid)
      .maybeSingle();
    if (old) return { sourceId: src.id, ...old };
    const lock = `${src.id}|${data.code}`;
    if (activationLocks.has(lock)) throw new Error("جارٍ تفعيل هذا الرمز، انتظر قليلًا");
    activationLocks.add(lock);
    try {
      if (!src.activation_api_url) throw new Error("خدمة التفعيل غير متاحة");
      const r = await activateWithProvider(src.activation_api_url, {
        code: data.code,
        mac,
        model: data.model,
        firmware: data.firmware,
      });
      await supabaseAdmin
        .from("activation_receipts")
        .insert({ id: rid, tenant_id: t.id, source_id: src.id, ...r });
      return { sourceId: src.id, ...r };
    } finally {
      activationLocks.delete(lock);
    }
  });
