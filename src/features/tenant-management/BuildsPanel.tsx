import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { triggerBuild } from "@/lib/iptv.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Hammer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { card, useSave, type Ctx } from "./shared";
/* ---------------- Builds ---------------- */
function bump(v: string) {
  const p = v.split(".").map(Number);
  return `${p[0] ?? 1}.${p[1] ?? 0}.${(p[2] ?? 0) + 1}`;
}
export function Builds(c: Ctx) {
  const { t, isAdmin } = c;
  const qc = useQueryClient();
  const save = useSave(c);
  const build = useServerFn(triggerBuild);
  const q = useQuery({
    queryKey: ["builds", t.id],
    queryFn: async () =>
      (
        await supabase
          .from("builds")
          .select("*")
          .eq("tenant_id", t.id)
          .order("created_at", { ascending: false })
          .limit(20)
      ).data ?? [],
    refetchInterval: (query) =>
      query.state.data?.some((b) => b.status === "building") ? 10000 : false,
  });
  const [ver, setVer] = useState(t.latest_version);
  const [minV, setMinV] = useState(t.min_version);
  useEffect(() => {
    setVer(q.data?.length ? bump(t.latest_version) : t.latest_version);
  }, [q.data?.length, t.latest_version]);
  const [busy, setBusy] = useState(false);
  const label: Record<string, string> = {
    queued: "بالانتظار",
    building: "جاري البناء",
    done: "جاهز",
    failed: "فشل",
  };
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/install/${t.slug}`
      : `/install/${t.slug}`;
  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-extrabold">رابط التثبيت لمشتركيك</h2>
        <div className="flex gap-2">
          <p dir="ltr" className="flex-1 break-all rounded-xl bg-secondary p-3 font-mono text-sm">
            {url}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("تم النسخ");
            }}
          >
            نسخ
          </Button>
        </div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">إجبار التحديث</h2>
        <p className="text-sm text-muted-foreground">
          أي تطبيق نسخته أقل من هذا الرقم يطلب من المستخدم التحديث. أحدث نسخة: v{t.latest_version}
        </p>
        <div className="flex gap-2">
          <Input
            dir="ltr"
            className="w-36"
            value={minV}
            onChange={(e) => setMinV(e.target.value)}
          />
          <Button
            onClick={() =>
              /^\d+\.\d+\.\d+$/.test(minV)
                ? save({ min_version: minV }, "التحديثات", `أقل نسخة ${minV}`)
                : toast.error("الصيغة 1.0.0")
            }
          >
            حفظ
          </Button>
        </div>
      </div>
      <div className={card}>
        <h2 className="text-lg font-extrabold">الإصدارات المنشورة</h2>
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>رقم النسخة</Label>
              <Input
                dir="ltr"
                className="w-32"
                value={ver}
                onChange={(e) => setVer(e.target.value)}
              />
            </div>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await build({
                    data: { tenantId: t.id, version: ver, siteUrl: window.location.origin },
                  });
                  toast.success("بدأ البناء — حوالي 5 دقائق");
                  qc.invalidateQueries({ queryKey: ["builds", t.id] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "خطأ");
                }
                setBusy(false);
              }}
            >
              <Hammer className="h-4 w-4" />
              بناء APK
            </Button>
          </div>
        )}
        {q.data?.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-xl bg-secondary p-3 text-sm">
            <span className="font-bold" dir="ltr">
              v{b.version}
            </span>
            <span
              className={
                b.status === "done"
                  ? "text-primary"
                  : b.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }
            >
              {label[b.status]}
            </span>
            <span className="flex-1 text-muted-foreground">
              {new Date(b.created_at).toLocaleString("ar")}
            </span>
            {b.apk_url && (
              <a href={b.apk_url} className="font-bold text-primary">
                تحميل
              </a>
            )}
          </div>
        ))}
        {q.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد إصدارات بعد.</p>
        )}
      </div>
    </div>
  );
}
