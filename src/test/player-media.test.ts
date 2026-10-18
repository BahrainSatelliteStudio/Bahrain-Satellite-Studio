import { beforeEach, describe, expect, it } from "vitest";
import { progressKey, progressNamespace, seasonNumbers } from "@/lib/player/media";
import { prefs } from "@/lib/player/prefs";

describe("New player history", () => {
  beforeEach(() => localStorage.clear());
  it("resumes movie:123 without creating movie:movie:123", () => {
    const p = { t: 120, d: 1800, title: "Movie", url: "/movie.mp4", at: 1 };
    prefs.saveProgress("tenant", "movie:123", p);
    const id = progressKey("movie", "movie:123");
    expect(id).toBe("movie:123");
    expect(prefs.progress("tenant")[id ?? ""]?.t).toBe(120);
    prefs.saveProgress("tenant", id ?? "", { ...p, t: 240 });
    expect(Object.keys(prefs.progress("tenant"))).toEqual(["movie:123"]);
  });
  it("keeps episode:456 unchanged", () => expect(progressKey("episode", "episode:456")).toBe("episode:456"));
  it("isolates preview history from customer history", () => {
    prefs.saveProgress(progressNamespace("tenant", true), "movie:123", { t: 120, d: 1800, title: "Preview", url: "/preview.mp4", at: 1 });
    expect(prefs.progress("tenant")).toEqual({});
    expect(prefs.progress(progressNamespace("tenant", true))["movie:123"]?.t).toBe(120);
  });
  it("sorts seasons numerically rather than mixing episodes", () => expect(seasonNumbers([
    { kind: "episode", id: "10", name: "E", season: "10" }, { kind: "episode", id: "2", name: "E", season: "2" }, { kind: "episode", id: "1", name: "E", season: "1" },
  ])).toEqual(["1", "2", "10"]));
});