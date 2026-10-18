import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

import { card,useSave,type Ctx,type Tenant } from "./shared";
/* ---------------- Contact ---------------- */
export function Contact(c: Ctx) {
  const { t } = c;
  const save = useSave(c);
  const [f, setF] = useState({ support_whatsapp: t.support_whatsapp ?? "", support_telegram: t.support_telegram ?? "", support_facebook: t.support_facebook ?? "", support_website: t.support_website ?? "", support_email: t.support_email ?? "", support_phone: t.support_phone ?? "", store_url: t.store_url ?? "", customer_notice: t.customer_notice ?? "" });
  const fields: [keyof typeof f, string, string][] = [["support_whatsapp", "واتساب (رقم أو رابط)", "+97333000000"], ["support_telegram", "تيليجرام (قناة أو معرّف)", "@username"], ["support_facebook", "صفحة فيسبوك", "https://facebook.com/..."], ["support_website", "الموقع الرسمي", "https://..."], ["support_email", "إيميل الدعم", "support@..."], ["support_phone", "هاتف", "+973..."], ["store_url", "رابط المتجر/الاشتراك", "https://.../products"]];
  return (
    <div className={card}>
      <p className="text-sm text-muted-foreground">هذه الروابط تظهر داخل التطبيق ليتواصل معك المشتركون.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([k, l, ph]) => <div key={k} className="space-y-1"><Label>{l}</Label><Input dir="ltr" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
      </div>
      <div className="space-y-1"><Label>رسالة للعملاء / ملاحظات التفعيل</Label><Textarea rows={5} value={f.customer_notice} onChange={(e) => setF({ ...f, customer_notice: e.target.value })} placeholder="📢 للاشتراك أو التجديد يرجى زيارة موقعنا..." /></div>
      <Button onClick={() => save(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as Partial<Tenant>, "التواصل", "تحديث روابط التواصل")}>حفظ روابط التواصل</Button>
    </div>
  );
}

