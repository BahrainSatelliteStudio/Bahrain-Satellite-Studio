import { prefs, t as str, type AppSettings, type Lang } from "@/lib/player/prefs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { TenantConfig } from "./types";
export function SettingsDialog({
  cfg,
  settings,
  onSave,
  onClose,
}: {
  cfg: TenantConfig;
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const L = str(settings.lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" ||
        (e.key === "Backspace" && !(document.activeElement as HTMLElement)?.matches("input"))
      )
        onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tryPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === settings.pin) setUnlocked(true);
    else {
      toast.error(L.pinWrong);
      setPin("");
    }
  };

  const downloadBackup = () => {
    const blob = new Blob([prefs.backup(cfg.slug)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${cfg.slug}-backup.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restoreBackup = async (f: File) => {
    try {
      prefs.restore(cfg.slug, await f.text());
      onSave(prefs.settings(cfg.slug));
      toast.success(L.saved);
    } catch {
      toast.error("ملف النسخة غير صالح");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{L.settings}</h2>
          <button
            data-nav
            onClick={onClose}
            className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold"
          >
            ✕
          </button>
        </div>
        {!unlocked ? (
          <form onSubmit={tryPin} className="space-y-3">
            <p className="text-sm text-muted-foreground">{L.pinTitle}</p>
            <input
              autoFocus
              dir="ltr"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border bg-input/40 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••"
            />
            <button
              data-nav
              className="w-full rounded-xl bg-primary py-3 font-extrabold text-primary-foreground"
            >
              {L.open}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold">{L.theme}</label>
              <div className="grid grid-cols-4 gap-2">
                {(["auto", "default", "blue", "cinema", "bhsat"] as const).map((th) => (
                  <button
                    key={th}
                    data-nav
                    onClick={() => onSave({ ...settings, theme: th })}
                    className={`rounded-xl border py-2 text-xs font-bold ${settings.theme === th ? "border-primary bg-primary text-primary-foreground" : "bg-secondary"}`}
                  >
                    {
                      {
                        auto: L.themeAuto,
                        default: L.themeDefault,
                        blue: L.themeBlue,
                        cinema: L.themeCinema,
                        bhsat: cfg.name,
                      }[th]
                    }
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold">{L.lang}</label>
              <div className="grid grid-cols-2 gap-2">
                {(["ar", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    data-nav
                    onClick={() => onSave({ ...settings, lang: l })}
                    className={`rounded-xl border py-2 text-sm font-bold ${settings.lang === l ? "border-primary bg-primary text-primary-foreground" : "bg-secondary"}`}
                  >
                    {l === "ar" ? "العربية" : "English"}
                  </button>
                ))}
              </div>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (/^\d{4}$/.test(newPin)) {
                  onSave({ ...settings, pin: newPin });
                  setNewPin("");
                  toast.success(L.saved);
                }
              }}
            >
              <input
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                placeholder={L.newPin}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                className="flex-1 rounded-xl border bg-input/40 px-4 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
              <button data-nav className="rounded-xl bg-secondary px-4 font-bold">
                {L.changePin}
              </button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <button
                data-nav
                onClick={() => {
                  localStorage.removeItem(`iptv:${cfg.slug}:fav`);
                  onSave({ ...settings });
                  toast.success(L.saved);
                }}
                className="rounded-xl bg-secondary py-2.5 text-sm font-bold"
              >
                {L.clearFavs}
              </button>
              <button
                data-nav
                onClick={() => {
                  prefs.clearProgress(cfg.slug);
                  onSave({ ...settings });
                  toast.success(L.saved);
                }}
                className="rounded-xl bg-secondary py-2.5 text-sm font-bold"
              >
                {L.clearHistory}
              </button>
              <button
                data-nav
                onClick={downloadBackup}
                className="rounded-xl bg-secondary py-2.5 text-sm font-bold"
              >
                {L.backup}
              </button>
              <button
                data-nav
                onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-secondary py-2.5 text-sm font-bold"
              >
                {L.restore}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) restoreBackup(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
