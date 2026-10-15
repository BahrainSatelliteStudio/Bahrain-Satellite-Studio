import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "الدخول — BHSAT Studio" },
      { name: "description", content: "تسجيل دخول فريق إدارة Bahrain Satellite" },
      { property: "og:title", content: "الدخول — BHSAT Studio" },
      { property: "og:description", content: "تسجيل دخول فريق الإدارة" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const login = email.trim().toLowerCase();
    const em = login.includes("@") ? login : `${login.replace(/[^a-z0-9._-]/g, "")}@users.bhsat.me`;
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) toast.error("بيانات الدخول غير صحيحة");
      else nav({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({ email: em, password, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
      if (error) toast.error(error.message);
      else { toast.success("تم إنشاء الحساب"); nav({ to: "/dashboard" }); };
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" style={{ backgroundImage: "var(--gradient-sky)" }}>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">{mode === "in" ? "سجّل دخولك للوحة التحكم" : "أول حساب يُنشأ يصبح المسؤول"}</p>
        </div>
        <div className="space-y-1"><Label>اسم المستخدم أو البريد</Label><Input type="text" autoComplete="username" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1"><Label>كلمة المرور</Label><Input type="password" dir="ltr" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={busy}>{mode === "in" ? "دخول" : "إنشاء حساب"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </div>
  );
}
