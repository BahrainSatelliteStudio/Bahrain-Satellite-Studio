import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveLayout, type TemplateKey } from "@/lib/layout";

export const applicationsQuery = () => queryOptions({
  queryKey: ["application-library"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tenants").select("id,name,slug,logo_url,enabled,latest_version,layout").order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل التطبيقات");
    return data ?? [];
  },
});

export function withApplicationTemplate(layout: unknown, template: TemplateKey) {
  return { ...resolveLayout(layout), template };
}