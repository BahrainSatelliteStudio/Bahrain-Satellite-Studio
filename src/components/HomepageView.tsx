import { Link } from "@tanstack/react-router";
import { Palette, Server, Tv, Smartphone, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Homepage } from "@/lib/homepage";

export const homeIcons = { palette: Palette, server: Server, tv: Tv, phone: Smartphone, star: Star, shield: Shield };
export function HomepageView({ config: c, preview = false }: { config: Homepage; preview?: boolean }) {
  const size = { small: "text-3xl md:text-4xl", medium: "text-4xl md:text-5xl", large: "text-4xl md:text-6xl" }[c.titleSize];
  const cols = { "2": "sm:grid-cols-2", "3": "sm:grid-cols-2 lg:grid-cols-3", "4": "sm:grid-cols-2 lg:grid-cols-4" }[c.columns];
  return <div className={`homepage-theme-${c.theme} relative isolate min-h-screen overflow-hidden bg-background text-foreground`}>
    {c.background && <img src={c.background} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />}
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
      <div className="flex min-w-0 items-center gap-3">
        {c.logo && <img src={c.logo} alt={c.brand} className="h-12 w-12 shrink-0 object-contain" />}
        <span className="break-words text-xl font-extrabold">{c.brand} <span className="text-primary">{c.brandAccent}</span></span>
      </div>
      {c.showAdmin && (preview ? <Button>{c.adminLabel}</Button> : <Button asChild><Link to="/dashboard">{c.adminLabel}</Link></Button>)}
    </header>
    <section className={`mx-auto max-w-4xl px-4 pb-12 pt-16 ${c.align === "center" ? "text-center" : "text-start"}`}>
      <h1 className={`${size} break-words font-extrabold leading-tight`}>{c.title} <span className="text-primary">{c.titleAccent}</span></h1>
      <p className={`mt-5 max-w-2xl whitespace-pre-line break-words text-lg text-muted-foreground ${c.align === "center" ? "mx-auto" : ""}`}>{c.description}</p>
      {c.showCta && (preview ? <Button size="lg" className="mt-8">{c.ctaLabel}</Button> : <Button asChild size="lg" className="mt-8"><Link to="/dashboard" onClick={() => { try { sessionStorage.setItem("bhsat_open_new", "1"); } catch { /* Storage unavailable */ } }}>{c.ctaLabel}</Link></Button>)}
    </section>
    {c.showFeatures && <section className={`mx-auto grid max-w-6xl gap-4 px-4 pb-20 ${cols}`}>
      {c.features.filter((f) => f.visible).map((f) => { const Icon = homeIcons[f.icon]; return <article key={f.id} className="rounded-lg border bg-card p-6 text-card-foreground"><Icon className="h-8 w-8 text-accent" /><h2 className="mt-4 break-words text-lg font-extrabold">{f.title}</h2><p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{f.description}</p></article>; })}
    </section>}
  </div>;
}