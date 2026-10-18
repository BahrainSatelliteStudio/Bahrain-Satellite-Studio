import { createFileRoute, notFound } from "@tanstack/react-router";
import { getTenantConfig } from "@/lib/iptv.functions";
import { PlayerApp, type TenantConfig } from "@/components/player/PlayerApp";
import { TEMPLATES, resolveLayout, type TemplateKey } from "@/lib/layout";

export const Route = createFileRoute("/preview/$slug")({
  validateSearch: (search: Record<string, unknown>): { template?: TemplateKey } => ({ template: TEMPLATES.some(([key]) => key === search.template) ? search.template as TemplateKey : undefined }),
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
  const { template } = Route.useSearch();
  const previewCfg = template ? { ...cfg, layout: { ...resolveLayout(cfg.layout), template } } : cfg;
  return (
    <div>
      <div className="sticky top-0 z-50 bg-secondary py-1.5 text-center text-xs font-bold text-foreground">معاينة مباشرة — بيانات تجريبية، تتحدث فورًا مع تعديلاتك في اللوحة</div>
      <PlayerApp cfg={previewCfg} preview />
    </div>
  );
}
