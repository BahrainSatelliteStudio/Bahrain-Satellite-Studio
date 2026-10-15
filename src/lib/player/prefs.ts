// تفضيلات المشغل المحفوظة على الجهاز (لكل زبون على حدة)
export type Progress = { t: number; d: number; title: string; logo?: string | undefined; url: string; at: number };
export type AppSettings = {
  pin: string;            // رقم حماية الإعدادات (افتراضي 0000)
  theme: "auto" | "default" | "blue" | "cinema" | "bhsat"; // auto = حسب اختيار الزبون من لوحته
  lang: "ar" | "en";
};

const DEF_SETTINGS: AppSettings = { pin: "0000", theme: "auto", lang: "ar" };

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

export const prefs = {
  settings: (slug: string): AppSettings => ({ ...DEF_SETTINGS, ...read<Partial<AppSettings>>(`iptv:${slug}:settings`, {}) }),
  saveSettings: (slug: string, s: AppSettings) => write(`iptv:${slug}:settings`, s),

  progress: (slug: string): Record<string, Progress> => read(`iptv:${slug}:progress`, {}),
  saveProgress: (slug: string, id: string, p: Progress) => {
    const all = prefs.progress(slug);
    // احفظ فقط إذا شاهد أكثر من 10 ثوانٍ ولم يكمل 95%
    if (p.t > 10 && p.d > 0 && p.t / p.d < 0.95) { all[id] = p; } else { delete all[id]; }
    const keys = Object.keys(all).sort((a, b) => (all[b]?.at ?? 0) - (all[a]?.at ?? 0)).slice(0, 60); // حد أقصى 60 عنصرًا
    write(`iptv:${slug}:progress`, Object.fromEntries(keys.flatMap((k) => (all[k] ? [[k, all[k]]] : []))));
  },
  clearProgress: (slug: string, id?: string) => {
    if (!id) return write(`iptv:${slug}:progress`, {});
    const all = prefs.progress(slug); delete all[id]; write(`iptv:${slug}:progress`, all);
  },

  // نسخة احتياطية: مفضلة + إعدادات + تقدم المشاهدة
  backup: (slug: string) => JSON.stringify({
    v: 1, slug, at: Date.now(),
    favs: read(`iptv:${slug}:fav`, []),
    settings: prefs.settings(slug),
    progress: prefs.progress(slug),
  }),
  restore: (slug: string, json: string) => {
    const b = JSON.parse(json);
    if (b?.v !== 1) throw new Error("bad backup");
    if (Array.isArray(b.favs)) write(`iptv:${slug}:fav`, b.favs);
    if (b.settings) prefs.saveSettings(slug, { ...DEF_SETTINGS, ...b.settings });
    if (b.progress) write(`iptv:${slug}:progress`, b.progress);
  },
};

// نصوص الواجهة
const STR = {
  ar: {
    live: "مباشر", movies: "أفلام", series: "مسلسلات", fav: "المفضلة", channels: "القنوات",
    search: "بحث...", back: "رجوع", continueWatching: "أكمل المشاهدة", settings: "الإعدادات",
    pinTitle: "أدخل رقم PIN", pinWrong: "رقم PIN غير صحيح", changePin: "تغيير رقم PIN",
    newPin: "الرقم الجديد (4 أرقام)", saved: "تم الحفظ", clearFavs: "مسح المفضلة",
    clearHistory: "مسح سجل المشاهدة", backup: "تنزيل نسخة احتياطية", restore: "استعادة نسخة احتياطية",
    theme: "شكل الواجهة", themeAuto: "حسب الزبون", themeDefault: "عادي", themeBlue: "أزرق", themeCinema: "سينما", themeBhsat: "Bahrain Satellite",
    lang: "اللغة", noCats: "لا توجد أقسام", noContent: "لا يوجد محتوى", open: "فتح",
  },
  en: {
    live: "Live", movies: "Movies", series: "Series", fav: "Favorites", channels: "Channels",
    search: "Search...", back: "Back", continueWatching: "Continue Watching", settings: "Settings",
    pinTitle: "Enter PIN", pinWrong: "Wrong PIN", changePin: "Change PIN",
    newPin: "New PIN (4 digits)", saved: "Saved", clearFavs: "Clear favorites",
    clearHistory: "Clear watch history", backup: "Download backup", restore: "Restore backup",
    theme: "Theme", themeAuto: "Tenant default", themeDefault: "Default", themeBlue: "Blue", themeCinema: "Cinema", themeBhsat: "Bahrain Satellite",
    lang: "Language", noCats: "No categories", noContent: "No content", open: "Open",
  },
} as const;
export type Lang = keyof typeof STR;
export const t = (lang: Lang) => STR[lang];
