import { providerHttpError } from "@/lib/player/transport";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
async function fetchText(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (Linux; Android) IPTVPlayer", ...(init?.headers ?? {}) } });
    if (!res.ok) throw new Error(providerHttpError(res.status));
    return await res.text();
  } catch (error) {
    if (ctrl.signal.aborted) throw new Error("انتهت مهلة الاتصال بسيرفر البث — حاول مجددًا");
    if (error instanceof TypeError) throw new Error("تعذر الوصول إلى سيرفر البث — تحقق من العنوان والاتصال");
    throw error;
  } finally { clearTimeout(timeout); }
}

export const xtreamApi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      slug: slugZ, sourceId: z.string().uuid(), username: z.string().min(1).max(100), password: z.string().min(1).max(100),
      action: z.enum(["auth", "get_live_categories", "get_live_streams", "get_vod_categories", "get_vod_streams", "get_series_categories", "get_series", "get_series_info", "get_vod_info"]),
      extra: z.record(z.string().max(40)).optional(),
    }).parse(d))
  .handler(async ({ data }) => {
    const { getSourceUrl } = await import("@/lib/supabase-public.server");
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
    const { getSourceUrl } = await import("@/lib/supabase-public.server");
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
    const { getSourceUrl } = await import("@/lib/supabase-public.server");
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

