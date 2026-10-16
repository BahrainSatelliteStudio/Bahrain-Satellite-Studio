import { createFileRoute } from "@tanstack/react-router";
import { getHomepage } from "@/lib/homepage.functions";
import { HomepageView } from "@/components/HomepageView";

export const Route = createFileRoute("/")({
  loader: () => getHomepage(),
  head: ({ loaderData: c }) => ({
    meta: [
      { title: `${c?.brand ?? "BHSAT"} ${c?.brandAccent ?? "Studio"} — ${c?.title ?? "صانع مشغلات IPTV"}` },
      { name: "description", content: c?.description ?? "اصنع مشغل IPTV باسمك وشعارك" },
      { property: "og:title", content: `${c?.brand ?? "BHSAT"} — ${c?.title ?? "مشغل IPTV"}` },
      { property: "og:description", content: c?.description ?? "مشغل IPTV مخصص لكل زبون" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...(c?.background ? [{ property: "og:image", content: c.background }, { name: "twitter:image", content: c.background }] : []),
    ],
  }),
  component: Home,
});

function Home() {
  return <HomepageView config={Route.useLoaderData()} />;
}
