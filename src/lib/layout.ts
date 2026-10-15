// تخطيط التطبيق: قالب الشكل + إعدادات كل قسم (مخزّن في tenants.layout)
import { Tv, Film, Clapperboard, Heart, History, Star, Radio, Trophy, Baby, Music, Flame, Globe, type LucideIcon } from "lucide-react";

export const TEMPLATES = [
  ["classic", "قالب 1 — كلاسيكي", "تبويبات علوية وشبكة بطاقات"],
  ["sidebar", "قالب 2 — قائمة جانبية", "قائمة جانبية مناسبة للتلفاز"],
  ["cinema", "قالب 3 — سينمائي", "صفوف أفقية وبوسترات كبيرة وشريط سفلي"],
] as const;
export type TemplateKey = (typeof TEMPLATES)[number][0];

export const SECTION_KEYS = ["continue", "live", "movie", "series", "fav"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export const SECTION_DEFAULT_LABEL: Record<SectionKey, string> = { continue: "أكمل المشاهدة", live: "البث المباشر", movie: "الأفلام", series: "المسلسلات", fav: "المفضلة" };

export const ICONS: Record<string, LucideIcon> = { tv: Tv, film: Film, clapper: Clapperboard, heart: Heart, history: History, star: Star, radio: Radio, trophy: Trophy, baby: Baby, music: Music, flame: Flame, globe: Globe };
const DEFAULT_ICON: Record<SectionKey, string> = { continue: "history", live: "tv", movie: "film", series: "clapper", fav: "heart" };

export type SectionCfg = {
  key: SectionKey; visible: boolean; label: string; icon: string;
  view: "grid" | "row"; size: "sm" | "md" | "lg"; limit: number; hiddenCats: string[];
};
export type AppLayout = { template: TemplateKey; sections: SectionCfg[] };

export function resolveLayout(raw: unknown): AppLayout {
  const r = (raw ?? {}) as Partial<AppLayout>;
  const template = TEMPLATES.some((t) => t[0] === r.template) ? (r.template as TemplateKey) : "classic";
  const given = Array.isArray(r.sections) ? r.sections.filter((s) => SECTION_KEYS.includes(s?.key)) : [];
  const keys = [...given.map((s) => s.key), ...SECTION_KEYS.filter((k) => !given.some((s) => s.key === k))];
  const sections = keys.map((key) => {
    const s = given.find((x) => x.key === key) ?? ({} as Partial<SectionCfg>);
    return {
      key, visible: s.visible ?? true, label: s.label?.trim() || SECTION_DEFAULT_LABEL[key],
      icon: s.icon && s.icon in ICONS ? s.icon : DEFAULT_ICON[key],
      view: s.view === "row" ? "row" : "grid", size: s.size === "sm" || s.size === "lg" ? s.size : "md",
      limit: Math.max(0, Math.min(2000, Number(s.limit) || 0)), hiddenCats: Array.isArray(s.hiddenCats) ? s.hiddenCats.map(String) : [],
    } satisfies SectionCfg;
  });
  return { template, sections };
}

export const previewChannel = (slug: string) => `layout-preview:${slug}`;
