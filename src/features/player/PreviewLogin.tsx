import { useEffect, useMemo, useRef, useState } from "react";
import { ExperienceNav } from "@/components/player/ExperienceNav";
import { ExperienceHome } from "@/components/player/ExperienceHome";
import { progressKey, progressNamespace } from "@/lib/player/media";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Tv, Film, Clapperboard, Heart, LogOut, Search, MessageCircle, Send, Phone, ChevronRight, Loader2, Settings, Play, History, Smartphone, House } from "lucide-react";
import { xtreamApi, m3uFetch, macCall, activateCode } from "@/lib/iptv.functions";
import { prefs, t as str, type AppSettings, type Lang } from "@/lib/player/prefs";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { resolveLayout, previewChannel, ICONS, type AppLayout, type SectionCfg } from "@/lib/layout";
import { Button } from "@/components/ui/button";
import { PREVIEW_CATALOG } from "@/lib/player/demo";

import type { TenantConfig, Session, Kind, Cat, Item, Playing } from "./types";
export function PreviewLogin({ cfg, lang, onDone }: { cfg: TenantConfig; lang: Lang; onDone: () => void }) {
  const ar = lang === "ar";
  const [mode, setMode] = useState<"code" | "creds">("code");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [srv, setSrv] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = () => {
    setErr("");
    if (mode === "code" && !code.trim()) return setErr(ar ? "أدخل رمز التفعيل" : "Enter the activation code");
    if (mode === "creds" && (!user.trim() || !pw)) return setErr(ar ? "اسم المستخدم وكلمة المرور مطلوبة" : "Username and password are required");
    if (mode === "creds" && srv && !/^\d{1,6}$/.test(srv)) return setErr(ar ? "أدخل كود سيرفر صحيحًا من 1 إلى 6 أرقام، أو اتركه فارغًا للتعرف التلقائي" : "Server code must be 1–6 digits, or leave empty for auto-detect");
    setBusy(true);
    setTimeout(onDone, 700);
  };
  const input = "w-full rounded-xl border bg-secondary px-4 py-3 text-sm focus:border-primary focus:outline-none";
  return (
    <div className="mx-auto mt-10 max-w-sm space-y-4 px-4 text-center">
      {cfg.logo_url && <img src={cfg.logo_url} alt="" className="mx-auto h-20 w-20 rounded-3xl object-cover" />}
      <h1 className="text-xl font-extrabold">{ar ? `تسجيل الدخول إلى ${cfg.name}` : `Sign in to ${cfg.name}`}</h1>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1">
        {(["code", "creds"] as const).map((m) => (
          <button key={m} data-nav onClick={() => { setMode(m); setErr(""); }}
            className={`rounded-xl py-2 text-sm font-bold ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "code" ? (ar ? "رمز التفعيل" : "Activation code") : (ar ? "اسم المستخدم وكلمة المرور" : "Username & password")}
          </button>
        ))}
      </div>
      {mode === "code" ? (
        <input data-nav value={code} onChange={(e) => setCode(e.target.value)} placeholder={ar ? "أدخل رمز التفعيل" : "Enter activation code"} className={`${input} text-center tracking-widest`} />
      ) : (
        <div className="space-y-3">
          <input data-nav value={user} onChange={(e) => setUser(e.target.value)} placeholder={ar ? "اسم المستخدم" : "Username"} className={input} />
          <div className="relative">
            <input data-nav type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={ar ? "كلمة المرور" : "Password"} className={input} />
            <button data-nav type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 end-3 text-xs font-bold text-primary">
              {showPw ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
            </button>
          </div>
          <input data-nav inputMode="numeric" value={srv} onChange={(e) => setSrv(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={ar ? "كود السيرفر (اختياري — فارغ للتعرف التلقائي)" : "Server code (optional — auto-detect)"} className={input} />
        </div>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button data-nav onClick={submit} disabled={busy} className="w-full rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60">
        {busy ? (ar ? "جاري البحث عن سيرفر الاشتراك…" : "Finding your server…") : mode === "code" ? (ar ? "تفعيل" : "Activate") : (ar ? "تسجيل الدخول" : "Sign in")}
      </button>
      <p className="text-xs text-muted-foreground">{ar ? "محاكاة — أي بيانات تفتح التطبيق التجريبي" : "Simulation — any details open the demo app"}</p>
    </div>
  );
}


