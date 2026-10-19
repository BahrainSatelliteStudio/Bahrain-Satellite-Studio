import { activateCode } from "@/features/activation/redeem.functions";
import { macCall, xtreamApi } from "@/features/player/providers.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Announcements } from "./Announcements";
import type { Session, TenantConfig } from "./types";
const field =
  "w-full rounded-xl border bg-input/40 px-4 py-3 outline-none focus:ring-2 focus:ring-ring";

function deviceMac() {
  let m = localStorage.getItem("device-mac");
  if (!m) {
    const b = crypto.getRandomValues(new Uint8Array(6));
    b[0] = ((b[0] ?? 0) & 0xfc) | 0x02;
    m = Array.from(b, (x) => x.toString(16).padStart(2, "0"))
      .join(":")
      .toUpperCase();
    localStorage.setItem("device-mac", m);
  }
  return m;
}

export function Login({ cfg, onDone }: { cfg: TenantConfig; onDone: (s: Session) => void }) {
  const actOn = !!(cfg as any).activation_enabled;
  const types = [
    ...(actOn ? ["code"] : []),
    ...Array.from(new Set(cfg.sources.map((s) => s.type))),
  ];
  const [type, setType] = useState(types[0] ?? "xtream");
  const list = cfg.sources.filter((s) => s.type === type);
  const [sourceId, setSourceId] = useState(list[0]?.id ?? "");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [mac, setMac] = useState("");
  const [actCode, setActCode] = useState("");
  const [srvCode, setSrvCode] = useState("");
  const [busy, setBusy] = useState(false);
  const xt = useServerFn(xtreamApi);
  const mc = useServerFn(macCall);
  const act = useServerFn(activateCode);
  useEffect(() => {
    setSourceId(cfg.sources.find((s) => s.type === type)?.id ?? "");
  }, [type, cfg.sources]);

  if (!cfg.sources.length)
    return (
      <p className="mt-16 text-center text-muted-foreground">
        لا توجد سيرفرات مضافة لهذا التطبيق بعد.
      </p>
    );
  const labels: Record<string, string> = {
    code: "تفعيل كود",
    xtream: "اسم مستخدم",
    m3u: "قائمة M3U",
    mac: "عنوان MAC",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (type === "code") {
        const r = await act({
          data: {
            slug: cfg.slug,
            serverCode: srvCode,
            code: actCode.trim(),
            deviceId: deviceMac(),
            model: "Android TV",
            firmware: "12",
          },
        });
        const a = await xt({
          data: {
            slug: cfg.slug,
            sourceId: r.sourceId,
            username: r.username,
            password: r.password,
            action: "auth",
          },
        });
        if (String((a.json as any)?.user_info?.auth) !== "1")
          throw new Error("تم التفعيل لكن تعذر الدخول للسيرفر");
        onDone({
          type: "xtream",
          sourceId: r.sourceId,
          username: r.username,
          password: r.password,
        });
      } else if (type === "xtream") {
        const r = await xt({
          data: { slug: cfg.slug, sourceId, username: u, password: p, action: "auth" },
        });
        const info = (r.json as any)?.user_info;
        if (!info || String(info.auth) !== "1")
          throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
        if (info.status && info.status !== "Active") throw new Error("الاشتراك غير فعّال أو منتهي");
        onDone({ type: "xtream", sourceId, username: u, password: p });
      } else if (type === "m3u") onDone({ type: "m3u", sourceId });
      else {
        const r = await mc({ data: { slug: cfg.slug, sourceId, mac, op: "login" } });
        onDone({ type: "mac", sourceId, mac: mac.toUpperCase(), token: (r as any).token });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الدخول");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-6">
      <Announcements cfg={cfg} />
      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
        <h1 className="text-center text-2xl font-extrabold">تسجيل الدخول</h1>
        {types.length > 1 && (
          <div className="grid grid-flow-col gap-2 rounded-xl bg-secondary p-1">
            {types.map((t) => (
              <button
                data-nav
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg py-2 text-sm font-bold ${t === type ? "bg-primary text-primary-foreground" : ""}`}
              >
                {labels[t]}
              </button>
            ))}
          </div>
        )}
        {type === "code" && (
          <>
            <input
              className={field}
              dir="ltr"
              placeholder="رمز التفعيل"
              required
              maxLength={128}
              value={actCode}
              onChange={(e) => setActCode(e.target.value)}
            />
            <input
              className={field}
              dir="ltr"
              inputMode="numeric"
              placeholder="كود السيرفر (اختياري إذا عندك سيرفر واحد)"
              value={srvCode}
              onChange={(e) => setSrvCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </>
        )}
        {type !== "code" && list.length > 1 && (
          <select className={field} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {list.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {type === "xtream" && (
          <>
            <input
              className={field}
              dir="ltr"
              placeholder="اسم المستخدم"
              required
              value={u}
              onChange={(e) => setU(e.target.value)}
            />
            <input
              className={field}
              dir="ltr"
              type="password"
              placeholder="كلمة المرور"
              required
              value={p}
              onChange={(e) => setP(e.target.value)}
            />
          </>
        )}
        {type === "mac" && (
          <input
            className={field}
            dir="ltr"
            placeholder="00:1A:79:XX:XX:XX"
            required
            pattern="([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}"
            value={mac}
            onChange={(e) => setMac(e.target.value)}
          />
        )}
        {type === "m3u" && (
          <p className="text-sm text-muted-foreground">
            سيتم تحميل القنوات من {list.find((s) => s.id === sourceId)?.name}.
          </p>
        )}
        <button
          data-nav
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}دخول
        </button>
      </form>
    </div>
  );
}
