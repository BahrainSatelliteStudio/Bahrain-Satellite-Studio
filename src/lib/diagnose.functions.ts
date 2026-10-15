import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `أنت خبير في بناء تطبيقات أندرويد (Capacitor + Gradle + GitHub Actions + توقيع APK).
سيُعطى لك سجل بناء APK. أجب بالعربية فقط وبهذا الترتيب:
1) السبب الرئيسي للخطأ (سطر أو سطرين، واذكر السطر المهم من السجل).
2) خطوات إصلاح عملية مرقّمة وواضحة لشخص غير مبرمج.
3) إن لزم: الأمر أو التعديل المطلوب بالضبط داخل كتلة كود.
إذا لم يوجد خطأ واضح، قل ذلك واقترح ما يجب التحقق منه.`;

export const diagnoseBuildLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { log: string }) => {
    const log = String(d?.log ?? "").trim();
    if (log.length < 20) throw new Error("ألصق سجل البناء أولًا");
    return { log: log.slice(-60000) };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("هذه الميزة للمسؤول فقط");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { error: "مفتاح الذكاء الاصطناعي غير مُعد" };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input: [{ role: "user", content: `سجل البناء:\n\n${data.log}` }],
        stream: true,
        store: false,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("AI gateway", res.status, body);
      if (res.status === 402) return { error: "رصيد الذكاء الاصطناعي انتهى — أضف رصيدًا من الإعدادات" };
      if (res.status === 429) return { error: "طلبات كثيرة — حاول بعد دقيقة" };
      return { error: `تعذّر التشخيص (${res.status})` };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", refused = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const p = line.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") refused += ev.delta ?? "";
          else if (ev.type === "error" || ev.type === "response.failed") return { error: "فشل التشخيص — حاول مرة أخرى" };
        } catch { /* partial */ }
      }
    }
    if (!text && refused) return { error: "رفض النموذج تحليل هذا السجل" };
    return { text: text || "لم يصل رد من النموذج" };
  });
