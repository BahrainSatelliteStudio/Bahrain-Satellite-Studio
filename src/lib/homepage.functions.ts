import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { homepageSchema, resolveHomepage } from "./homepage";

export const getHomepage = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./supabase-public.server");
  const { data, error } = await publicClient().from("homepage_settings").select("content").eq("id", "home").maybeSingle();
  if (error) throw new Error("تعذر تحميل إعدادات الصفحة");
  return resolveHomepage(data?.content);
});

export const saveHomepage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => homepageSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("تعديل الصفحة متاح للمسؤول فقط");
    const { error } = await context.supabase.from("homepage_settings").upsert({ id: "home", content: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { success: true };
  });