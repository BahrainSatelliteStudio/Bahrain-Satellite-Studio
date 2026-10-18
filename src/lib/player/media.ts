export type MediaKind = "live" | "movie" | "series" | "episode";
export type MediaItem = { id: string; name: string; logo?: string; url?: string; cmd?: string; kind: MediaKind; season?: string; episode?: number; synopsis?: string };

// History identifiers are already typed; never prefix them a second time.
export function progressKey(kind: MediaKind, id: string) {
  if (kind === "live" || kind === "series") return undefined;
  return id.startsWith(`${kind}:`) ? id : `${kind}:${id}`;
}
export function progressNamespace(slug: string, demo: boolean) {
  return demo ? `${slug}:preview` : slug;
}
export function seasonNumbers(items: MediaItem[]) {
  return [...new Set(items.filter((i) => i.kind === "episode").map((i) => i.season ?? "1"))].sort((a, b) => Number(a) - Number(b));
}