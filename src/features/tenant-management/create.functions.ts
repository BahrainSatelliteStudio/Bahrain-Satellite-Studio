import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(2).max(60), slug: slugZ,
      package_id: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/),
      username: z.string().regex(/^[a-z0-9._-]{3,30}$/),
      email: z.string().trim().email().max(255),
      phone: z.string().regex(/^\+\d{1,4} ?\d{6,14}$/),
      password: z.string().min(8).max(72),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin-access.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authEmail = `${data.username}@users.bhsat.me`;
    const { data: t, error } = await supabaseAdmin.from("tenants").insert({ name: data.name, slug: data.slug, package_id: data.package_id, owner_email: data.email, owner_phone: data.phone }).select("id").single();
    if (error) throw new Error(error.message.includes("duplicate") ? "الرابط أو اسم الحزمة مستخدم مسبقًا" : error.message);
    const created = await supabaseAdmin.auth.admin.createUser({ email: authEmail, password: data.password, email_confirm: true });
    if (created.error) {
      await supabaseAdmin.from("tenants").delete().eq("id", t.id);
      throw new Error(created.error.message.includes("already") ? "اسم المستخدم مستخدم مسبقًا — اختر اسمًا مختلفًا" : created.error.message);
    }
    const userId = created.data.user.id;
    const { error: memberError } = await supabaseAdmin.from("tenant_members").insert({ tenant_id: t.id, user_id: userId });
    if (memberError) {
      await supabaseAdmin.from("tenants").delete().eq("id", t.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("تعذر ربط حساب الزبون بالتطبيق؛ لم يتم إكمال الإنشاء");
    }
    return { id: t.id };
  });

