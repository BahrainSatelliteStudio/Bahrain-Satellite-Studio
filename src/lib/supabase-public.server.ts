import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function loadTenantConfig(slug: string) {
  const sb = publicClient();
  const { data: t } = await sb
    .from("tenants")
    .select("id,slug,name,logo_url,primary_color,accent_color,theme,layout,support_whatsapp,support_telegram,support_phone,support_facebook,support_website,support_email,customer_notice,store_url,banner_url,colors,latest_version,min_version,update_url,enabled,panel_url")
    .eq("slug", slug)
    .eq("enabled", true)
    .maybeSingle();
  if (!t) return null;
  const [{ data: sources }, { data: ann }, { data: build }] = await Promise.all([
    sb.from("tenant_sources").select("id,type,name").eq("tenant_id", t.id).eq("enabled", true).order("sort_order"),
    sb.from("announcements").select("id,title,body,image_url,kind").eq("tenant_id", t.id).eq("active", true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("created_at", { ascending: false }),
    sb.from("builds").select("version,apk_url,finished_at").eq("tenant_id", t.id).eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { id: _id, enabled: _e, panel_url, ...rest } = t;
  // هل للزبون سيرفر يدعم تفعيل الأكواد؟ (بدون كشف الرابط)
  const { data: actCount } = await sb.rpc("tenant_activation_count", { _slug: slug });
  const cloud = { ...rest, sources: sources ?? [], activation_enabled: Number(actCount) > 0, announcements: ann ?? [], latest_build: build ?? null };
  // إذا كان للزبون لوحة مستقلة على سيرفره، تكون هي مصدر الإعدادات (مع الرجوع للوحة السحابية عند تعذر الوصول)
  if (panel_url) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${panel_url.replace(/\/+$/, "")}/api/public/config`, { signal: ctrl.signal, headers: { "User-Agent": "IPTVStudio/1.0" } });
      clearTimeout(tm);
      if (res.ok) {
        const panel = (await res.json()) as Record<string, unknown>;
        return { ...cloud, ...panel, slug: cloud.slug, latest_build: cloud.latest_build, panel_url };
      }
    } catch { /* اللوحة المستقلة غير متاحة — نستخدم إعدادات السحابة */ }
  }
  return cloud;
}

export async function getSourceUrl(slug: string, sourceId: string, type: string) {
  const sb = publicClient();
  const { data: t } = await sb.from("tenants").select("id").eq("slug", slug).eq("enabled", true).maybeSingle();
  if (!t) throw new Error("التطبيق غير موجود");
  // url column is readable for enabled sources (non-secret server base urls)
  const { data: s } = await sb.from("tenant_sources").select("url,type").eq("id", sourceId).eq("tenant_id", t.id).eq("enabled", true).maybeSingle();
  if (!s || s.type !== type) throw new Error("السيرفر غير متاح");
  return s.url.replace(/\/+$/, "");
}
