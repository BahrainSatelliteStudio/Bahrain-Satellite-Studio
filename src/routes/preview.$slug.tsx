import { createFileRoute, notFound } from "@tanstack/react-router";
import { getTenantConfig } from "@/lib/iptv.functions";
import { PlayerApp, type TenantConfig } from "@/components/player/PlayerApp";

export const Route = createFileRoute("/preview/$slug")({
  loader: async ({ params }) => {
    const cfg = await getTenantConfig({ data: { slug: params.slug } });
    if (!cfg) throw notFound();
    return cfg as TenantConfig;
  },
  head: ({ loaderData }) => {
    const t = loaderData?.name ?? "التطبيق";
    return {
      meta: [
        { title: `معاينة مباشرة — ${t}` },
        { name: "description", content: `معاينة مباشرة لتصميم وأقسام تطبيق ${t}` },
        { property: "og:title", content: `معاينة مباشرة — ${t}` },
        { property: "og:description", content: `معاينة مباشرة لتصميم وأقسام تطبيق ${t}` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">هذا التطبيق غير متاح</div>,
  component: PreviewPage,
});

function PreviewPage() {
  const cfg = Route.useLoaderData();
  return (
    <div>
      <div className="sticky top-0 z-50 bg-primary py-1.5 text-center text-xs font-bold text-primary-foreground">معاينة مباشرة — بيانات تجريبية، تتحدث فورًا مع تعديلاتك في اللوحة</div>
      <PlayerApp cfg={cfg} preview />
    </div>
  );
}
