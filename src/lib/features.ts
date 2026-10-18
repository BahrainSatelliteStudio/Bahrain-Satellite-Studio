// Feature flags per tenant: plan preset + per-feature overrides (stored in tenants.features).
export const FEATURES = [
  ["activation", "أكواد التفعيل"],
  ["servers", "السيرفرات والهوستات"],
  ["brand", "الشعار والبنر"],
  ["themes", "تصميم ثيم وألوان مخصصة"],
  ["contact", "روابط التواصل والدعم"],
  ["notify", "الإشعارات الجماعية"],
  ["builds", "الإصدارات والتحديثات"],
  ["backup", "النسخ الاحتياطي"],
  ["subtitles", "جلب الترجمة من الإنترنت"],
  ["downloads", "التنزيل للمشاهدة دون إنترنت"],
] as const;
export type FeatureKey = (typeof FEATURES)[number][0];

type Plan = { label: string; maxHosts: number; on: readonly FeatureKey[] };
export type PlanKey = "basic" | "pro" | "premium";
export const PLANS: Record<PlanKey, Plan> = {
  basic: { label: "أساسية", maxHosts: 2, on: ["servers", "contact"] },
  pro: { label: "احترافية", maxHosts: 4, on: ["servers", "brand", "contact", "notify", "builds", "subtitles"] },
  premium: { label: "مميزة", maxHosts: 8, on: FEATURES.map((f) => f[0]) },
};

export type FeatureState = { workflow?: string; selected?: string[]; plan?: string; overrides?: Partial<Record<FeatureKey, boolean>> };

export function resolveFeatures(raw: unknown): Record<FeatureKey, boolean> {
  const s = (raw ?? {}) as FeatureState;
  const plan = PLANS[(s.plan as PlanKey) in PLANS ? (s.plan as PlanKey) : "premium"];
  const out = {} as Record<FeatureKey, boolean>;
  for (const [k] of FEATURES) out[k] = s.workflow === "order" ? k === "builds" || !!s.selected?.includes(k) : s.overrides?.[k] ?? plan.on.includes(k);
  return out;
}
