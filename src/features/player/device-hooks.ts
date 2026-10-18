import { useEffect } from "react";
// تنقل الريموت/الكيبورد بين العناصر [data-nav]
export function useTvNav() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dirs: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const d = dirs[e.key];
      if (!d) return;
      if (document.querySelector("[data-player-active]")) return;
      const cur = document.activeElement as HTMLElement | null;
      if (
        cur &&
        (cur.tagName === "INPUT" ||
          cur.tagName === "TEXTAREA" ||
          cur.tagName === "SELECT" ||
          cur.tagName === "VIDEO")
      )
        return;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]")).filter(
        (el) => el.offsetParent !== null,
      );
      if (!els.length) return;
      if (!cur || !els.includes(cur)) {
        e.preventDefault();
        els[0]?.focus();
        return;
      }
      const c = cur.getBoundingClientRect();
      const cx = c.left + c.width / 2,
        cy = c.top + c.height / 2;
      let best: HTMLElement | null = null;
      let bestScore = Infinity;
      for (const el of els) {
        if (el === cur) continue;
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2,
          y = r.top + r.height / 2;
        const dx = x - cx,
          dy = y - cy;
        if (d[0] !== 0 && Math.sign(dx) !== d[0]) continue;
        if (d[1] !== 0 && Math.sign(dy) !== d[1]) continue;
        const primary = d[0] !== 0 ? Math.abs(dx) : Math.abs(dy);
        const secondary = d[0] !== 0 ? Math.abs(dy) : Math.abs(dx);
        if (primary < 4) continue;
        const score = primary + secondary * 2.5;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      if (best) {
        e.preventDefault();
        best.focus();
        best.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// يسجّل الجهاز لاستقبال إشعارات Firebase (داخل تطبيق الأندرويد فقط).
export function usePushRegistration(slug: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const cap = (window as any).Capacitor;
    const push = cap?.Plugins?.PushNotifications;
    if (!cap?.isNativePlatform?.() || !push || !cap.isPluginAvailable?.("PushNotifications"))
      return;
    (async () => {
      try {
        await push.addListener("registration", async (t: { value: string }) => {
          await fetch("/api/public/push-register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, token: t.value }),
          });
        });
        let perm = await push.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale")
          perm = await push.requestPermissions();
        if (perm.receive === "granted") await push.register();
      } catch (e) {
        console.warn("push registration failed", e);
      }
    })();
  }, [slug, enabled]);
}
