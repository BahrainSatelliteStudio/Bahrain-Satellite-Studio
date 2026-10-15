import { createFileRoute, notFound } from "@tanstack/react-router";
import { getTenantConfig } from "@/lib/iptv.functions";
import { PlayerApp, type TenantConfig } from "@/components/player/PlayerApp";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const cfg = await getTenantConfig({ data: { slug: params.slug } });
    if (!cfg) throw notFound();
    return cfg as TenantConfig;
  },
  head: ({ loaderData }) => {
    const t = loaderData?.name ?? "المشغل";
    return {
      meta: [
        { title: `${t} — مشغل IPTV` },
        { name: "description", content: `شاهد القنوات والأفلام والمسلسلات على ${t}` },
        { property: "og:title", content: `${t} — مشغل IPTV` },
        { property: "og:description", content: `شاهد القنوات والأفلام والمسلسلات على ${t}` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">هذا التطبيق غير متاح</div>,
  component: PlayerPage,
});

function PlayerPage() {
  const cfg = Route.useLoaderData();
  return <PlayerApp cfg={cfg} />;
}
