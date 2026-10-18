import type { TenantConfig } from "./types";
export function Announcements({ cfg }: { cfg: TenantConfig }) {
  if (!cfg.announcements.length) return null;
  return (
    <div className="space-y-3">
      {cfg.announcements.map((a) => (
        <div key={a.id} className="overflow-hidden rounded-2xl border bg-card">
          {a.image_url && (
            <img src={a.image_url} alt={a.title} className="max-h-48 w-full object-cover" />
          )}
          <div className="border-s-4 border-accent p-4">
            <h3 className="font-extrabold">{a.title}</h3>
            {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
