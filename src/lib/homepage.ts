import { z } from "zod";

const image = z.string().max(2000).refine((v) => !v || /^https:\/\//.test(v), "رابط الصورة يجب أن يبدأ بـ https://");
export const homepageSchema = z.object({
  brand: z.string().min(1).max(80), brandAccent: z.string().max(80),
  title: z.string().min(1).max(150), titleAccent: z.string().max(100), description: z.string().max(1000),
  adminLabel: z.string().min(1).max(60), ctaLabel: z.string().min(1).max(60),
  showAdmin: z.boolean(), showCta: z.boolean(), showFeatures: z.boolean(),
  logo: image, background: image,
  theme: z.enum(["default", "bahrain", "blue", "cinema"]),
  align: z.enum(["center", "start"]), titleSize: z.enum(["small", "medium", "large"]),
  columns: z.enum(["2", "3", "4"]),
  features: z.array(z.object({ id: z.string().max(80), icon: z.enum(["palette", "server", "tv", "phone", "star", "shield"]), title: z.string().max(100), description: z.string().max(400), visible: z.boolean() })).max(12),
});
export type Homepage = z.infer<typeof homepageSchema>;
export const defaultHomepage: Homepage = {
  brand: "BHSAT", brandAccent: "Studio", title: "مشغل IPTV", titleAccent: "باسمك",
  description: "صمّم تطبيق مشغل لكل زبون باسمه وشعاره، وخلّه يتحكم بالسيرفرات والإعلانات وأرقام الدعم من لوحة خاصة فيه.",
  adminLabel: "لوحة التحكم", ctaLabel: "ابدأ الآن", showAdmin: true, showCta: true, showFeatures: true,
  logo: "", background: "", theme: "default", align: "center", titleSize: "large", columns: "4",
  features: [
    { id: "brand", icon: "palette", title: "اسمك وشعارك", description: "كل زبون يحصل على تطبيق مستقل بهويته وألوانه.", visible: true },
    { id: "sources", icon: "server", title: "Xtream و M3U و MAC", description: "يدعم كل أنواع الاشتراكات الشائعة.", visible: true },
    { id: "media", icon: "tv", title: "قنوات وأفلام ومسلسلات", description: "تصفح بالأقسام، بحث، ومفضلة.", visible: true },
    { id: "apk", icon: "phone", title: "APK جاهز", description: "بناء تلقائي وصفحة تثبيت لكل زبون.", visible: true },
  ],
};
export function resolveHomepage(raw: unknown): Homepage {
  const result = homepageSchema.safeParse({ ...defaultHomepage, ...(raw && typeof raw === "object" ? raw : {}) });
  return result.success ? result.data : defaultHomepage;
}