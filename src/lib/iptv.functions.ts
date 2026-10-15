import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);

export const getTenantConfig = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugZ }).parse(d))
  .handler(async ({ data }) => {
    const { loadTenantConfig } = await import("./supabase-public.server");
    return loadTenantConfig(data.slug);
  });

async function fetchText(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "User-Agent": "Mozilla/5.0 (Linux; Android) IPTVPlayer", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`السيرفر رد بخطأ ${res.status}`);
  return res.text();
}

export const xtreamApi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      slug: slugZ, sourceId: z.string().uuid(), username: z.string().min(1).max(100), password: z.string().min(1).max(100),
      action: z.enum(["auth", "get_live_categories", "get_live_streams", "get_vod_categories", "get_vod_streams", "get_series_categories", "get_series", "get_series_info", "get_vod_info"]),
      extra: z.record(z.string().max(40)).optional(),
    }).parse(d))
  .handler(async ({ data }) => {
    const { getSourceUrl } = await import("./supabase-public.server");
    const base = await getSourceUrl(data.slug, data.sourceId, "xtream");
    const q = new URLSearchParams({ username: data.username, password: data.password });
    if (data.action !== "auth") q.set("action", data.action);
    for (const [k, v] of Object.entries(data.extra ?? {})) q.set(k, v);
    const text = await fetchText(`${base}/player_api.php?${q}`);
    return { base, json: JSON.parse(text) as any };
  });

export const m3uFetch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: slugZ, sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getSourceUrl } = await import("./supabase-public.server");
    const url = await getSourceUrl(data.slug, data.sourceId, "m3u");
    const text = await fetchText(url);
    const items: { name: string; group: string; logo: string; url: string }[] = [];
    let cur: { name: string; group: string; logo: string } | null = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith("#EXTINF")) {
        cur = {
          name: line.split(",").slice(1).join(",").trim(),
          group: /group-title="([^"]*)"/.exec(line)?.[1] || "عام",
          logo: /tvg-logo="([^"]*)"/.exec(line)?.[1] || "",
        };
      } else if (line && !line.startsWith("#") && cur) {
        items.push({ ...cur, url: line });
        cur = null;
        if (items.length >= 20000) break;
      }
    }
    return items;
  });

export const macCall = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      slug: slugZ, sourceId: z.string().uuid(),
      mac: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
      op: z.enum(["login", "genres", "channels", "link"]),
      token: z.string().max(200).optional(),
      genre: z.string().max(40).optional(),
      cmd: z.string().max(500).optional(),
      page: z.number().int().min(1).max(500).optional(),
    }).parse(d))
  .handler(async ({ data }) => {
    const { getSourceUrl } = await import("./supabase-public.server");
    let base = await getSourceUrl(data.slug, data.sourceId, "mac");
    base = base.replace(/\/c$/, "");
    const endpoint = base.endsWith(".php") ? base : `${base}/portal.php`;
    const mac = data.mac.toUpperCase();
    const headers = (token?: string): Record<string, string> => ({
      Cookie: `mac=${encodeURIComponent(mac)}; stb_lang=en; timezone=Asia/Bahrain`,
      "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3",
      "X-User-Agent": "Model: MAG250; Link: WiFi",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    const call = async (params: Record<string, string>, token?: string) => {
      const t = await fetchText(`${endpoint}?${new URLSearchParams({ ...params, JsHttpRequest: "1-xml" })}`, { headers: headers(token) });
      return (JSON.parse(t) as { js: any }).js;
    };
    if (data.op === "login") {
      const hs = await call({ type: "stb", action: "handshake", token: "" });
      const token = hs?.token as string;
      if (!token) throw new Error("فشل الاتصال بالبوابة");
      const profile = await call({ type: "stb", action: "get_profile" }, token);
      if (profile?.status === 2 || profile?.blocked === "1") throw new Error("هذا الـ MAC غير مفعّل");
      return { token };
    }
    if (data.op === "genres") return call({ type: "itv", action: "get_genres" }, data.token);
    if (data.op === "channels")
      return call({ type: "itv", action: "get_ordered_list", genre: data.genre ?? "*", p: String(data.page ?? 1), sortby: "number" }, data.token);
    const js = await call({ type: "itv", action: "create_link", cmd: data.cmd ?? "" }, data.token);
    const cmd = String(js?.cmd ?? "");
    return { url: cmd.replace(/^ffmpeg\s+/, "").replace(/^auto\s+/, "") };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("هذه العملية للمسؤول فقط");
}

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(2).max(60), slug: slugZ,
      package_id: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/),
      username: z.string().regex(/^[a-z0-9._-]{3,30}$/),
      email: z.string().email().optional().or(z.literal("")),
      password: z.string().min(8).max(72),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authEmail = `${data.username}@users.bhsat.me`;
    const { data: t, error } = await supabaseAdmin.from("tenants").insert({ name: data.name, slug: data.slug, package_id: data.package_id, support_email: data.email || null }).select("id").single();
    if (error) throw new Error(error.message.includes("duplicate") ? "الرابط أو اسم الحزمة مستخدم مسبقًا" : error.message);
    let userId: string | undefined;
    const created = await supabaseAdmin.auth.admin.createUser({ email: authEmail, password: data.password, email_confirm: true });
    if (created.error) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      userId = list.users.find((u) => u.email?.toLowerCase() === authEmail)?.id;
      if (!userId) { await supabaseAdmin.from("tenants").delete().eq("id", t.id); throw new Error(created.error.message.includes("already") ? "اسم المستخدم مستخدم مسبقًا" : created.error.message); }
    } else userId = created.data.user.id;
    await supabaseAdmin.from("tenant_members").insert({ tenant_id: t.id, user_id: userId });
    return { id: t.id };
  });

export const triggerBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), version: z.string().regex(/^\d+\.\d+\.\d+$/), siteUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const token = process.env["GITHUB_TOKEN"];
    const repo = process.env["GITHUB_REPO"];
    if (!token || !repo) throw new Error("لم يتم ربط GitHub بعد — أضف مفتاح GitHub واسم المستودع");
    const { data: t } = await context.supabase.from("tenants").select("*").eq("id", data.tenantId).single();
    if (!t) throw new Error("الزبون غير موجود");
    const { data: b, error } = await context.supabase.from("builds").insert({ tenant_id: t.id, version: data.version, status: "building" }).select("id").single();
    if (error) throw new Error(error.message);
    const origin = new URL(data.siteUrl).origin;
    const logo = t.logo_url ? (t.logo_url.startsWith("http") ? t.logo_url : origin + t.logo_url) : "";
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/android-apk.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "iptv-studio" },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          build_id: b.id, app_name: t.name, package_id: t.package_id, version: data.version,
          app_url: `${origin}/p/${t.slug}`, logo_url: logo, callback_url: `${origin}/api/public/build-complete`,
        },
      }),
    });
    if (!res.ok) {
      const msg = await res.text();
      await context.supabase.from("builds").update({ status: "failed", error: msg.slice(0, 500) }).eq("id", b.id);
      throw new Error("فشل تشغيل البناء على GitHub: " + res.status);
    }
    await context.supabase.from("tenants").update({ latest_version: data.version }).eq("id", t.id);
    return { buildId: b.id };
  });

export const checkHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sourceId: string }) => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s, error } = await context.supabase.from("tenant_sources").select("id,url,backup_urls").eq("id", data.sourceId).single();
    if (error || !s) throw new Error("السيرفر غير موجود");
    const urls = [s.url, ...(s.backup_urls ?? [])];
    const results = await Promise.all(urls.map(async (u) => {
      const t0 = Date.now();
      try {
        const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(u.replace(/\/+$/, "") + "/player_api.php", { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 IPTVPlayer" } });
        clearTimeout(tm);
        return { url: u, ok: r.status < 500, status: r.status, ms: Date.now() - t0 };
      } catch { return { url: u, ok: false, status: 0, ms: Date.now() - t0 }; }
    }));
    const ok = results.some((r) => r.ok);
    await context.supabase.from("tenant_sources").update({ last_check_ok: ok, last_check_at: new Date().toISOString() }).eq("id", s.id);
    return { ok, results };
  });
