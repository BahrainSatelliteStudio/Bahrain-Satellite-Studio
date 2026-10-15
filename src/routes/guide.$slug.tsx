import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({ name: typeof s["name"] === "string" ? s["name"] : "" }),
  head: () => ({
    meta: [
      { title: "دليل الزبون الشامل — BHSAT Studio" },
      { name: "description", content: "شرح التطبيق ولوحة التحكم وطرق تثبيت اللوحة على كل الأنظمة." },
      { property: "og:title", content: "دليل الزبون الشامل — BHSAT Studio" },
      { property: "og:description", content: "شرح التطبيق ولوحة التحكم وطرق التثبيت." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-2xl border bg-card p-6 space-y-3">
      <h2 className="text-xl font-bold text-primary">{n}. {title}</h2>
      <div className="space-y-2 leading-8 text-foreground/90">{children}</div>
    </section>
  );
}
const Code = ({ children }: { children: string }) => (
  <pre dir="ltr" className="overflow-x-auto rounded-lg bg-muted p-3 text-sm text-left">{children}</pre>
);

function Guide() {
  const { slug } = Route.useParams();
  const { name } = Route.useSearch();
  const app = name || slug;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl space-y-5 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">دليل تطبيق «{app}» الشامل</h1>
            <p className="text-muted-foreground">كل ما تحتاجه: التطبيق، لوحة التحكم، وطريقة التثبيت.</p>
          </div>
          <Button onClick={() => window.print()} className="print:hidden">طباعة / حفظ PDF</Button>
        </header>

        <Sec n="1" title="ما تستلمه منا">
          <ul className="list-disc pr-6">
            <li><b>ملف التطبيق (APK)</b> باسمك وشعارك — يُثبَّت على الجوال والتابلت والتلفاز وأجهزة Android TV.</li>
            <li><b>ملف لوحة التحكم</b> (ZIP) تركّبه على جهازك أو سيرفرك وتدير منه تطبيقك.</li>
            <li><b>صفحة تثبيت</b> لعملائك: <span dir="ltr">{origin}/install/{slug}</span></li>
          </ul>
        </Sec>

        <Sec n="2" title="شرح التطبيق">
          <ul className="list-disc pr-6">
            <li><b>القنوات المباشرة</b> مقسّمة حسب الفئات، مع بحث سريع.</li>
            <li><b>الأفلام والمسلسلات</b> بملصقات وتفاصيل، وتكملة المشاهدة من حيث توقفت.</li>
            <li><b>المفضلة</b> لحفظ القنوات والأفلام المفضلة.</li>
            <li><b>قفل الأهل (PIN)</b> لإخفاء الفئات الحساسة.</li>
            <li><b>الدخول</b>: عميلك يدخل بكود الدخول أو باسم المستخدم وكلمة المرور الخاصة باشتراكه.</li>
            <li><b>الإشعارات والتحديثات</b> تظهر تلقائيًا داخل التطبيق.</li>
            <li>يدعم التنقل بريموت التلفاز واللغتين العربية والإنجليزية.</li>
          </ul>
        </Sec>

        <Sec n="3" title="شرح لوحة التحكم">
          <p>أي تعديل تسويه في اللوحة يوصل للتطبيق عند فتحه التالي — بدون الحاجة لملف APK جديد.</p>
          <ul className="list-disc pr-6">
            <li><b>السيرفرات والهوستات</b>: أضف سيرفرات Xtream / M3U، الهوست الأساسي والاحتياطي وكود الدخول.</li>
            <li><b>هوية التطبيق والألوان</b>: غيّر الشعار والبنر والألوان.</li>
            <li><b>روابط التواصل</b>: واتساب، تيليجرام، فيسبوك، الموقع، الإيميل ورسالة لعملائك.</li>
            <li><b>الإشعارات الجماعية</b>: أرسل إشعارًا لكل مشتركيك.</li>
            <li><b>تحديثات التطبيق</b>: حدد أحدث نسخة ورابط تحميلها.</li>
            <li><b>النسخ الاحتياطي</b>: نزّل نسخة من إعداداتك واسترجعها وقت الحاجة.</li>
            <li><b>أمان الحساب</b>: غيّر بيانات دخولك وأضف حسابات إضافية.</li>
          </ul>
          <p className="text-muted-foreground">الأقسام الظاهرة لك تعتمد على باقتك.</p>
        </Sec>

        <Sec n="4" title="قبل التثبيت">
          <ul className="list-disc pr-6">
            <li>المتطلب الوحيد: <b>Node.js 18 أو أحدث</b> (من nodejs.org).</li>
            <li>اللوحة تعمل على المنفذ <b dir="ltr">8090</b>.</li>
            <li>بعد أول تشغيل تجد بيانات الدخول في الملف <span dir="ltr">data/initial-login.txt</span> — غيّرها فورًا.</li>
          </ul>
        </Sec>

        <Sec n="5" title="التثبيت على كمبيوتر Windows">
          <p>فك الضغط عن الملف ← اضغط مرتين على <b dir="ltr">install-windows.bat</b> ← افتح المتصفح على:</p>
          <Code>http://localhost:8090</Code>
          <p className="text-muted-foreground">ملاحظة: حتى يقرأ التطبيق إعداداته من خارج بيتك يلزم رابط عام (Cloudflare Tunnel أو سيرفر).</p>
        </Sec>

        <Sec n="6" title="التثبيت على Mac أو Linux محلي">
          <Code>{`cd bhsat-panel\nnode server.js`}</Code>
          <p>للحصول على رابط عام مجاني بدون سيرفر:</p>
          <Code>cloudflared tunnel --url http://localhost:8090</Code>
        </Sec>

        <Sec n="7" title="السيرفر VPS (Ubuntu / Debian) — الطريقة الأفضل">
          <Code>{`unzip bhsat-panel-offline.zip -d bhsat-panel\ncd bhsat-panel\nsudo bash install-linux.sh`}</Code>
          <p>لربط دومين مع HTTPS:</p>
          <Code>{`sudo apt install -y nginx certbot python3-certbot-nginx\n# وجّه الدومين إلى 127.0.0.1:8090 في إعدادات nginx\nsudo certbot --nginx -d panel.example.com`}</Code>
        </Sec>

        <Sec n="8" title="Docker">
          <Code>{`cd bhsat-panel\ndocker compose up -d`}</Code>
          <p>البيانات محفوظة في مجلد <span dir="ltr">data/</span> خارج الحاوية.</p>
        </Sec>

        <Sec n="9" title="Windows Server">
          <p>ثبّت Node.js ← شغّل <b dir="ltr">install-windows.bat</b> كمسؤول ← افتح المنفذ 8090 في الجدار الناري، أو اربطه بدومين عبر IIS.</p>
        </Sec>

        <Sec n="10" title="استضافة cPanel">
          <p>ارفع الملف وفك ضغطه ← من <b>Setup Node.js App</b> أنشئ تطبيقًا: الإصدار 18+، ملف البدء <span dir="ltr">server.js</span> ← اضغط Start.</p>
        </Sec>

        <Sec n="11" title="ربط اللوحة بالتطبيق">
          <p>أرسل لنا رابط لوحتك العام (مثل <span dir="ltr">https://panel.example.com</span>) ونربطه بتطبيقك. للتأكد افتح:</p>
          <Code>https://panel.example.com/api/public/config</Code>
          <p>إذا ظهرت إعدادات تطبيقك فالربط سليم. وإذا توقف سيرفرك يعمل التطبيق تلقائيًا بالإعدادات الاحتياطية.</p>
        </Sec>

        <Sec n="12" title="النسخ الاحتياطي وحل المشاكل">
          <ul className="list-disc pr-6">
            <li>احتفظ بنسخة من مجلد <span dir="ltr">data/</span> بشكل دوري.</li>
            <li>اللوحة لا تفتح: تأكد أن Node.js مثبت وأن المنفذ 8090 مفتوح.</li>
            <li>التطبيق لا يقرأ التعديلات: تأكد أن الرابط عام ويعمل من خارج الشبكة، ثم أعد فتح التطبيق.</li>
            <li>نسيت كلمة المرور: احذف ملف المستخدمين في <span dir="ltr">data/</span> وأعد التشغيل لإنشاء دخول جديد.</li>
          </ul>
        </Sec>
      </main>
    </div>
  );
}
