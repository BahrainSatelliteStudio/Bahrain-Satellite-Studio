import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Palette, Smartphone, Server } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BHSAT Studio — صانع مشغلات IPTV" },
      { name: "description", content: "اصنع مشغل IPTV باسمك وشعارك وتحكم فيه من لوحة خاصة" },
      { property: "og:title", content: "BHSAT Studio — صانع مشغلات IPTV" },
      { property: "og:description", content: "مشغل IPTV مخصص لكل زبون مع لوحة تحكم وملف APK" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const features = [
  { i: Palette, t: "اسمك وشعارك", d: "كل زبون يحصل على تطبيق مستقل بهويته وألوانه." },
  { i: Server, t: "Xtream و M3U و MAC", d: "يدعم كل أنواع الاشتراكات الشائعة." },
  { i: Tv, t: "قنوات وأفلام ومسلسلات", d: "تصفح بالأقسام، بحث، ومفضلة." },
  { i: Smartphone, t: "APK جاهز", d: "بناء تلقائي وصفحة تثبيت لكل زبون." },
];

function Home() {
  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: "var(--gradient-sky)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-xl font-extrabold">BHSAT <span className="text-primary">Studio</span></span>
        <Link to="/dashboard" className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground">لوحة التحكم</Link>
      </header>
      <section className="mx-auto max-w-4xl px-4 pb-12 pt-16 text-center">
        <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">مشغل IPTV <span className="text-primary">باسمك</span></h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">صمّم تطبيق مشغل لكل زبون باسمه وشعاره، وخلّه يتحكم بالسيرفرات والإعلانات وأرقام الدعم من لوحة خاصة فيه.</p>
        <Link to="/auth" className="mt-8 inline-block rounded-2xl bg-primary px-8 py-4 text-lg font-extrabold text-primary-foreground">ابدأ الآن</Link>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-6">
            <f.i className="h-8 w-8 text-accent" />
            <h3 className="mt-4 text-lg font-extrabold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
