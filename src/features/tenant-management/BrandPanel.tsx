import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { card, uploadImage, useSave, type Ctx } from "./shared";
type Colors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  button: string;
};
/* ---------------- Brand ---------------- */
const PRESETS = {
  bhsat: {
    label: "Bahrain Satellite",
    theme: "bhsat",
    c: {
      primary: "#FBBD23",
      secondary: "#303540",
      accent: "#DCA518",
      background: "#14181F",
      surface: "#20242C",
      text: "#F8F8F6",
      button: "#20242C",
    },
  },
  purple: {
    label: "Dark Purple VIP",
    theme: "default",
    c: {
      primary: "#8B5CF6",
      secondary: "#2E2545",
      accent: "#C084FC",
      background: "#120E1C",
      surface: "#1E1830",
      text: "#F5F3FF",
      button: "#2E2545",
    },
  },
  neon: {
    label: "Cyber Neon",
    theme: "default",
    c: {
      primary: "#22C55E",
      secondary: "#1F2937",
      accent: "#06B6D4",
      background: "#0A0F0D",
      surface: "#141C18",
      text: "#ECFDF5",
      button: "#1F2937",
    },
  },
  gold: {
    label: "Classic Gold",
    theme: "cinema",
    c: {
      primary: "#F59E0B",
      secondary: "#3A2A12",
      accent: "#FCD34D",
      background: "#140F08",
      surface: "#221A10",
      text: "#FFFBEB",
      button: "#3A2A12",
    },
  },
  ocean: {
    label: "Ocean Blue",
    theme: "blue",
    c: {
      primary: "#0EA5E9",
      secondary: "#1E3A5F",
      accent: "#38BDF8",
      background: "#0B1220",
      surface: "#132036",
      text: "#F0F9FF",
      button: "#1E3A5F",
    },
  },
} satisfies Record<string, { label: string; theme: string; c: Colors }>;
const COLOR_FIELDS: [keyof Colors, string][] = [
  ["primary", "اللون الأساسي"],
  ["secondary", "اللون الثانوي"],
  ["accent", "اللون المميز"],
  ["background", "الخلفية"],
  ["surface", "البطاقات"],
  ["text", "النص"],
  ["button", "الأزرار"],
];

function mix(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  return (
    "#" +
    [f(n >> 16), f((n >> 8) & 255), f(n & 255)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function Brand(c: Ctx) {
  const { t } = c;
  const save = useSave(c);
  const stored = (t.colors ?? {}) as Partial<Colors>;
  const [name, setName] = useState(t.name);
  const [theme, setTheme] = useState(t.theme);
  const [col, setCol] = useState<Colors>({
    ...PRESETS.bhsat.c,
    primary: t.primary_color,
    accent: t.accent_color,
    ...stored,
  });
  const [busy, setBusy] = useState(false);
  const valid = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
  const upload = async (field: "logo_url" | "banner_url", file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await save(
        { [field]: await uploadImage(t.id, file) },
        "الهوية",
        field === "logo_url" ? "تغيير الشعار" : "تغيير البنر",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    }
    setBusy(false);
  };
  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-extrabold">الشعار والبنر والاسم</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>الشعار (PNG شفاف، 512×512)</Label>
            <div className="flex items-center gap-4">
              {t.logo_url ? (
                <img
                  src={t.logo_url}
                  alt="الشعار"
                  className="h-20 w-20 rounded-2xl bg-secondary object-contain p-1"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => upload("logo_url", e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>البنر (1920×1080 يظهر في الدخول والرئيسية)</Label>
            {t.banner_url ? (
              <img
                src={t.banner_url}
                alt="البنر"
                className="aspect-video w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-secondary text-sm text-muted-foreground">
                لا يوجد بنر
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => upload("banner_url", e.target.files?.[0])}
              />
              {t.banner_url && (
                <Button
                  variant="secondary"
                  onClick={() => save({ banner_url: null }, "الهوية", "حذف البنر")}
                >
                  حذف
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => save({ name }, "الهوية", `تغيير الاسم إلى ${name}`)}>
            حفظ الاسم
          </Button>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-lg font-extrabold">الثيم والألوان</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button
              key={k}
              onClick={() => {
                setCol(p.c);
                setTheme(p.theme);
              }}
              className="rounded-xl border p-3 text-sm font-bold hover:border-primary"
            >
              <div className="mb-2 flex justify-center gap-1">
                {[p.c.primary, p.c.background, p.c.accent].map((x) => (
                  <span key={x} className="h-4 w-4 rounded-full border" style={{ background: x }} />
                ))}
              </div>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-secondary p-3">
          <p className="w-full text-sm font-bold">توليد ثيم كامل من لونين</p>
          <Input
            dir="ltr"
            className="w-32"
            placeholder="#FBBD23"
            id="g1"
            defaultValue={col.primary}
          />
          <Input
            dir="ltr"
            className="w-32"
            placeholder="#14181F"
            id="g2"
            defaultValue={col.background}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const a = (document.getElementById("g1") as HTMLInputElement).value.trim(),
                b = (document.getElementById("g2") as HTMLInputElement).value.trim();
              if (!valid(a) || !valid(b)) {
                toast.error("اكتب كود لون صحيح مثل #FBBD23");
                return;
              }
              setCol({
                primary: a.toUpperCase(),
                accent: mix(a, -0.12),
                background: b.toUpperCase(),
                surface: mix(b, 0.06),
                secondary: mix(b, 0.14),
                button: mix(b, 0.06),
                text: "#F8F8F6",
              });
              setTheme("bhsat");
            }}
          >
            توليد
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label>{label}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  aria-label={label}
                  value={valid(col[k]) ? col[k] : "#000000"}
                  onChange={(e) => setCol({ ...col, [k]: e.target.value.toUpperCase() })}
                  className="h-10 w-12 rounded border bg-transparent"
                />
                <Input
                  dir="ltr"
                  value={col[k]}
                  className={valid(col[k]) ? "" : "border-destructive"}
                  onChange={(e) => setCol({ ...col, [k]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label>معاينة</Label>
          <div className="rounded-2xl p-4" style={{ background: col.background, color: col.text }}>
            <div
              className="mb-3 flex items-center gap-2 font-extrabold"
              style={{ color: col.primary }}
            >
              {name}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["مباشر", "أفلام", "مسلسلات"].map((x, i) => (
                <div
                  key={x}
                  className="rounded-xl p-4 text-center text-sm font-bold"
                  style={{
                    background: i === 0 ? col.primary : col.surface,
                    color: i === 0 ? col.background : col.text,
                  }}
                >
                  {x}
                </div>
              ))}
            </div>
            <div
              className="mt-3 rounded-lg px-4 py-2 text-center text-sm font-bold"
              style={{ background: col.button, color: col.accent }}
            >
              زر
            </div>
          </div>
        </div>
        <Button
          disabled={COLOR_FIELDS.some(([k]) => !valid(col[k]))}
          onClick={() =>
            save(
              { colors: col, primary_color: col.primary, accent_color: col.accent, theme },
              "الهوية",
              "تحديث الثيم والألوان",
            )
          }
        >
          حفظ الثيم
        </Button>
      </div>
    </div>
  );
}
