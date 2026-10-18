export type TenantConfig = {
  slug: string; name: string; logo_url: string | null; primary_color: string; accent_color: string;
  theme: "default" | "blue" | "cinema" | "bhsat";
  support_whatsapp: string | null; support_telegram: string | null; support_phone: string | null;
  latest_version: string; min_version: string; update_url: string | null;
  sources: { id: string; type: string; name: string }[];
  announcements: { id: string; title: string; body: string | null; image_url: string | null }[];
  layout?: unknown;
};

export type Session =
  | { type: "xtream"; sourceId: string; username: string; password: string }
  | { type: "m3u"; sourceId: string }
  | { type: "mac"; sourceId: string; mac: string; token: string }
  | { type: "demo"; sourceId: string };
export type Kind = "live" | "movie" | "series";
export type Cat = { id: string; name: string };
export type Item = { id: string; name: string; logo?: string; url?: string; cmd?: string; kind: Kind | "episode" };
export type Playing = { src: string; title: string; itemId?: string | undefined; logo?: string | undefined };

