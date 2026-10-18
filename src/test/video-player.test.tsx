import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { PlayerApp, type TenantConfig } from "@/components/player/PlayerApp";
import { prefs } from "@/lib/player/prefs";

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/iptv.functions", () => ({ xtreamApi: vi.fn(), m3uFetch: vi.fn(), macCall: vi.fn(), activateCode: vi.fn() }));
vi.mock("@/lib/subtitles.functions", () => ({ searchSubtitles: vi.fn(), downloadSubtitle: vi.fn() }));

const saved = { t: 120, d: 1800, title: "Saved movie", url: "/movie.mp4", at: 1 };
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Playback regressions", () => {
  it("resumes and saves the final position under the original identity", () => {
    prefs.saveProgress("tenant", "movie:123", saved);
    const view = render(<VideoPlayer src="/movie.mp4" title="Saved movie" slug="tenant" itemId="movie:123" onClose={() => {}} />);
    const video = view.container.querySelector("video");
    if (!video) throw new Error("Missing video");
    Object.defineProperty(video, "duration", { configurable: true, value: 1800 });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(120);
    video.currentTime = 240;
    view.unmount();
    expect(prefs.progress("tenant")["movie:123"]?.t).toBe(240);
    expect(Object.keys(prefs.progress("tenant"))).toEqual(["movie:123"]);
  });

  it("does not erase existing progress when playback fails before metadata", () => {
    prefs.saveProgress("tenant", "movie:123", saved);
    const view = render(<VideoPlayer src="/movie.mp4" title="Saved movie" slug="tenant" itemId="movie:123" onClose={() => {}} />);
    const video = view.container.querySelector("video");
    if (!video) throw new Error("Missing video");
    Object.defineProperty(video, "duration", { configurable: true, value: 1800 });
    view.unmount();
    expect(prefs.progress("tenant")["movie:123"]?.t).toBe(120);
  });

  it("does not expose customer history or erase it through preview settings", () => {
    prefs.saveProgress("tenant", "movie:123", saved);
    const cfg: TenantConfig = { slug: "tenant", name: "Test", logo_url: null, primary_color: "", accent_color: "", theme: "default", support_whatsapp: null, support_telegram: null, support_phone: null, latest_version: "1.0.0", min_version: "1.0.0", update_url: null, sources: [], announcements: [] };
    const view = render(<PlayerApp cfg={cfg} preview />);
    fireEvent.click(view.getByRole("button", { name: "أكمل المشاهدة" }));
    expect(view.queryByText("Saved movie")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "الإعدادات" }));
    fireEvent.change(view.getByPlaceholderText("••••"), { target: { value: "0000" } });
    fireEvent.click(view.getByRole("button", { name: "فتح" }));
    fireEvent.click(view.getByRole("button", { name: "مسح سجل المشاهدة" }));
    expect(prefs.progress("tenant")["movie:123"]?.t).toBe(120);
  });
});