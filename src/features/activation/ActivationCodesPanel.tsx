import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  createActivationCodes,
  listActivationCodes,
  setActivationCodeEnabled,
} from "@/lib/activation-codes.functions";

export function ActivationCodesPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listActivationCodes);
  const create = useServerFn(createActivationCodes);
  const toggle = useServerFn(setActivationCodeEnabled);
  const q = useQuery({
    queryKey: ["activation-codes", tenantId],
    queryFn: () => list({ data: { tenantId } }),
  });
  const sources = useQuery({
    queryKey: ["activation-sources", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_sources")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("enabled", true)
        .eq("type", "xtream");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [mode, setMode] = useState<"individual" | "shared">("individual");
  const [accountId, setAccountId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const selectedAccount = q.data?.accounts.find((a) => a.id === accountId);
  const effectiveSource = selectedAccount?.source_id ?? sourceId ?? "";
  const refresh = () => qc.invalidateQueries({ queryKey: ["activation-codes", tenantId] });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await create({
        data: {
          tenantId,
          sourceId: effectiveSource || sources.data?.[0]?.id || "",
          mode,
          ...(accountId ? { accountId } : {}),
          label: selectedAccount?.label ?? label,
          username: accountId ? "existing-account" : username,
          password: accountId ? "existing-account" : password,
          count: mode === "individual" ? 1 : count,
        },
      });
      setGenerated(result.codes);
      setPassword("");
      await refresh();
      toast.success("تم إنشاء الأكواد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إنشاء الأكواد");
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([generated.join("\n")], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "activation-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-5 border-b pb-8">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">إنشاء أكواد تفعيل</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="طريقة الحساب">
          <Button
            type="button"
            variant={mode === "individual" ? "default" : "outline"}
            onClick={() => {
              setMode("individual");
              setAccountId("");
              setCount(1);
            }}
          >
            حساب مستقل لكل كود
          </Button>
          <Button
            type="button"
            variant={mode === "shared" ? "default" : "outline"}
            onClick={() => {
              setMode("shared");
              setAccountId("");
            }}
          >
            حساب مشترك لعدة أكواد
          </Button>
        </div>
        {mode === "shared" && (
          <div className="space-y-2">
            <Label htmlFor="activation-account">الحساب المشترك</Label>
            <select
              id="activation-account"
              className="h-10 w-full rounded-md border bg-background px-3"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">حساب مشترك جديد</option>
              {q.data?.accounts
                .filter((a) => a.mode === "shared")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
            </select>
          </div>
        )}
        {!accountId && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activation-source">سيرفر البث</Label>
              <select
                id="activation-source"
                required
                className="h-10 w-full rounded-md border bg-background px-3"
                value={sourceId || sources.data?.[0]?.id || ""}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {!sources.data?.length && <option value="">لا يوجد سيرفر بث مفعّل</option>}
                {sources.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activation-label">اسم الحساب</Label>
              <Input
                id="activation-label"
                required
                maxLength={80}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activation-user">اسم مستخدم البث</Label>
              <Input
                id="activation-user"
                dir="ltr"
                required
                autoComplete="off"
                maxLength={100}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activation-password">كلمة مرور البث</Label>
              <Input
                id="activation-password"
                dir="ltr"
                type="password"
                required
                autoComplete="new-password"
                maxLength={100}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        )}
        {mode === "shared" && (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="activation-count">عدد الأكواد</Label>
            <Input
              id="activation-count"
              type="number"
              min={1}
              max={100}
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
        )}
        <Button disabled={busy || !sources.data?.length}>
          <Plus />
          {busy ? "جارٍ الإنشاء…" : "إنشاء الأكواد"}
        </Button>
      </form>
      {!!generated.length && (
        <section className="space-y-3 border-b pb-6" aria-label="الأكواد الجديدة">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">الأكواد الجديدة — احفظها الآن</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generated.join("\n"));
                    toast.success("تم النسخ");
                  } catch {
                    toast.error("تعذر النسخ؛ استخدم التنزيل");
                  }
                }}
              >
                <Copy />
                نسخ
              </Button>
              <Button type="button" variant="outline" onClick={download}>
                <Download />
                تنزيل
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            تظهر الأكواد كاملة مرة واحدة فقط. تفعيل كل كود مرتبط بأول جهاز يستخدمه، وإيقافه يمنع
            التفعيل مجددًا ولا يوقف حساب البث المفتوح.
          </p>
          <pre dir="ltr" className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-sm">
            {generated.join("\n")}
          </pre>
        </section>
      )}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">الأكواد المسجلة</h2>
        {q.isLoading && <p className="text-muted-foreground">جارٍ تحميل الأكواد…</p>}
        {(q.error || sources.error) && (
          <div role="alert" className="text-destructive">
            تعذر تحميل البيانات.{" "}
            <Button
              variant="outline"
              onClick={() => {
                q.refetch();
                sources.refetch();
              }}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}
        {q.data?.codes.length === 0 && <p className="text-muted-foreground">لا توجد أكواد بعد.</p>}
        <div className="divide-y">
          {q.data?.codes.map((code) => {
            const account = q.data.accounts.find((a) => a.id === code.account_id);
            return (
              <div key={code.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-bold">
                    {account?.label}{" "}
                    <span dir="ltr" className="font-mono text-muted-foreground">
                      …{code.code_hint}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {account?.mode === "shared" ? "حساب مشترك" : "حساب مستقل"} ·{" "}
                    {code.activated_at ? "تم التفعيل" : "لم يُفعّل"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{code.enabled ? "مفعّل" : "موقوف"}</span>
                  <Switch
                    aria-label={`تفعيل الكود ${code.code_hint}`}
                    checked={code.enabled}
                    onCheckedChange={async (enabled) => {
                      try {
                        await toggle({ data: { tenantId, id: code.id, enabled } });
                        await refresh();
                      } catch {
                        toast.error("تعذر تعديل الكود");
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
