import { createServerFn } from "@tanstack/react-start";

const API = "https://api.opensubtitles.com/api/v1";
const UA = "LovablePlayer v1.0";

function apiKey() {
  const key = process.env.OPENSUBTITLES_API_KEY;
  if (!key) throw new Error("ميزة الترجمة من الإنترنت غير مفعّلة بعد — أضف مفتاح OpenSubtitles في إعدادات المشروع");
  return key;
}

export type SubResult = { fileId: number; name: string; lang: string; downloads: number; hearingImpaired: boolean };

// البحث عن ترجمات في OpenSubtitles
export const searchSubtitles = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string; lang?: string; season?: number; episode?: number; year?: number }) => d)
  .handler(async ({ data }): Promise<SubResult[]> => {
    const key = apiKey();
    const params = new URLSearchParams({ query: data.query, languages: data.lang === "en" ? "en" : "ar" });
    if (data.season) params.set("season_number", String(data.season));
    if (data.episode) params.set("episode_number", String(data.episode));
    if (data.year) params.set("year", String(data.year));
    const r = await fetch(`${API}/subtitles?${params}`, { headers: { "Api-Key": key, "User-Agent": UA } });
    if (!r.ok) throw new Error("تعذر البحث عن الترجمة — حاول لاحقًا");
    const j: any = await r.json();
    return ((j.data ?? []) as any[])
      .map((s) => ({
        fileId: s.attributes?.files?.[0]?.file_id as number,
        name: (s.attributes?.release || s.attributes?.feature_details?.title || "ترجمة") as string,
        lang: s.attributes?.language as string,
        downloads: (s.attributes?.download_count ?? 0) as number,
        hearingImpaired: !!s.attributes?.hearing_impaired,
      }))
      .filter((s) => s.fileId)
      .slice(0, 20);
  });

// تنزيل ملف الترجمة (SRT) وإرجاع نصه
export const downloadSubtitle = createServerFn({ method: "POST" })
  .inputValidator((d: { fileId: number }) => d)
  .handler(async ({ data }): Promise<{ srt: string }> => {
    const key = apiKey();
    const r = await fetch(`${API}/download`, {
      method: "POST",
      headers: { "Api-Key": key, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ file_id: data.fileId }),
    });
    if (!r.ok) throw new Error("تعذر تنزيل الترجمة — حاول لاحقًا");
    const j: any = await r.json();
    if (!j.link) throw new Error("تعذر تنزيل الترجمة — حاول لاحقًا");
    const res = await fetch(j.link);
    if (!res.ok) throw new Error("تعذر تنزيل الترجمة — حاول لاحقًا");
    const srt = await res.text();
    if (!srt.trim()) throw new Error("ملف الترجمة فارغ");
    return { srt };
  });
