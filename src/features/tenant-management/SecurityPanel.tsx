import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

import { card, logChange, Stat, type Ctx } from "./shared";
/* ---------------- Security ---------------- */
export function Security(c: Ctx) {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const display = c.email.endsWith("@users.bhsat.me")
    ? c.email.replace("@users.bhsat.me", "")
    : c.email;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="اسم الدخول"
          value={
            <span className="text-lg" dir="ltr">
              {display.split("@")[0]}
            </span>
          }
        />
        <Stat
          label="الإيميل"
          value={
            <span className="break-all text-sm" dir="ltr">
              {c.email}
            </span>
          }
        />
        <Stat
          label="الصلاحية"
          value={<span className="text-lg">{c.isAdmin ? "مسؤول" : "مالك التطبيق"}</span>}
        />
      </div>
      <form
        className={card}
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 10) {
            toast.error("كلمة المرور 10 أحرف على الأقل");
            return;
          }
          if (pw !== pw2) {
            toast.error("كلمتا المرور غير متطابقتين");
            return;
          }
          setBusy(true);
          const { error: e1 } = await supabase.auth.signInWithPassword({
            email: c.email,
            password: cur,
          });
          if (e1) {
            toast.error("كلمة المرور الحالية غير صحيحة");
            setBusy(false);
            return;
          }
          const { error } = await supabase.auth.updateUser({
            password: pw,
            current_password: cur,
          } as { password: string });
          if (error) toast.error(error.message);
          else {
            toast.success("تم تغيير كلمة المرور");
            setCur("");
            setPw("");
            setPw2("");
            await logChange(c, "الأمان", "تغيير كلمة المرور");
          }
          setBusy(false);
        }}
      >
        <h2 className="text-lg font-extrabold">تغيير كلمة المرور</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>الحالية</Label>
            <Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>الجديدة</Label>
            <Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>تأكيد الجديدة</Label>
            <Input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
        </div>
        <Button disabled={busy}>حفظ كلمة المرور</Button>
      </form>
      <div className={card}>
        <h2 className="text-lg font-extrabold">تسجيل الخروج من كل الأجهزة</h2>
        <p className="text-sm text-muted-foreground">
          إذا تشك أن أحد دخل حسابك، اخرج من كل الأجهزة ثم غيّر كلمة المرور.
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            await supabase.auth.signOut({ scope: "global" });
            location.href = "/auth";
          }}
        >
          خروج من كل الأجهزة
        </Button>
      </div>
    </div>
  );
}
