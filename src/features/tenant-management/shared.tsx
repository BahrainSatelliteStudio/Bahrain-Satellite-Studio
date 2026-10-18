import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { toast } from "sonner";

export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Source = Database["public"]["Tables"]["tenant_sources"]["Row"];
export type Sec = "home" | "studio" | "servers" | "brand" | "layout" | "activation" | "contact" | "notify" | "builds" | "changes" | "backup" | "security";
export type Ctx = { t: Tenant; isAdmin: boolean; email: string; uid: string; go: (s: Sec) => void };
export const card = "space-y-4 rounded-2xl border bg-card p-6";

export async function logChange(c: Ctx, section: string, summary: string) {
  await supabase.from("tenant_changes").insert({ tenant_id: c.t.id, user_id: c.uid, user_email: c.email, section, summary });
}

export function useSave(c: Ctx) {
  const qc = useQueryClient();
  return async (patch: Partial<Tenant>, section: string, summary: string) => {
    const { error } = await supabase.from("tenants").update(patch).eq("id", c.t.id);
    if (error) { toast.error(error.message); return false; }
    await logChange(c, section, summary);
    toast.success("تم الحفظ — يظهر في التطبيقات خلال ثوانٍ");
    qc.invalidateQueries({ queryKey: ["tenant", c.t.id] }); qc.invalidateQueries({ queryKey: ["changes", c.t.id] });
    return true;
  };
}

export async function uploadImage(tenantId: string, file: File) {
  if (file.size > 3 * 1024 * 1024) throw new Error("الحد الأقصى للصورة 3MB");
  const path = `${tenantId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "")}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return `/api/public/file?b=branding&p=${encodeURIComponent(path)}`;
}

export function useSources(id: string) {
  return useQuery({ queryKey: ["sources", id], queryFn: async () => (await supabase.from("tenant_sources").select("*").eq("tenant_id", id).order("sort_order")).data ?? [] });
}
export const hostCount = (s: Source[]) => s.reduce((n, x) => n + 1 + (x.backup_urls?.length ?? 0), 0);

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold">{value}{sub && <span className="mr-2 text-sm font-medium text-muted-foreground">{sub}</span>}</p></div>;
}

