import { House, History, Settings, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICONS, type SectionCfg } from "@/lib/layout";

export type ExperienceDestination = "home" | "continue" | "apps" | "live" | "movie" | "series" | "fav";
export function ExperienceNav({ name, logo, sections, active, onSelect, onSettings, english }: {
  name: string; logo: string | null; sections: SectionCfg[]; active: ExperienceDestination;
  onSelect: (key: ExperienceDestination) => void; onSettings: () => void; english: boolean;
}) {
  const entries = [{ key: "home" as const, label: english ? "Home" : "الرئيسية", icon: House },
    ...sections.filter((s) => s.visible).map((s) => ({ key: s.key, label: s.label, icon: s.key === "continue" ? History : ICONS[s.icon] ?? Tv }))];
  return <nav aria-label={english ? "App sections" : "أقسام التطبيق"} className="experience-nav">
    <div className="mb-8 hidden items-center gap-3 px-3 md:flex">
      {logo ? <img src={logo} alt="" className="h-11 w-11 rounded-lg object-contain" /> : <Tv className="h-9 w-9 text-primary" />}
      <h1 className="min-w-0 break-words text-lg font-extrabold">{name}</h1>
    </div>
    {entries.map(({ key, label, icon: Icon }) => <Button key={key} data-nav variant="ghost" aria-current={active === key ? "page" : undefined} onClick={() => onSelect(key)} className={`experience-nav-item ${active === key ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
      <Icon /><span>{label}</span>
    </Button>)}
    <Button data-nav variant="ghost" onClick={onSettings} className="experience-nav-item text-muted-foreground md:mt-8"><Settings /><span>{english ? "Settings" : "الإعدادات"}</span></Button>
  </nav>;
}