import { describe, expect, it } from "vitest";
import { isHostReachable, providerHttpError, mediaPlaybackError } from "@/lib/player/transport";

describe("Provider transport regressions", () => {
  it("does not mark rejected or missing hosts as healthy", () => {
    expect(isHostReachable(403)).toBe(false);
    expect(isHostReachable(401)).toBe(false);
    expect(isHostReachable(404)).toBe(false);
    expect(isHostReachable(500)).toBe(false);
    expect(isHostReachable(0)).toBe(false);
    expect(isHostReachable(200)).toBe(true);
  });
  it("retains provider rejection codes without returning response bodies", () => {
    expect(providerHttpError(403)).toContain("403");
    expect(providerHttpError(401)).toContain("401");
    expect(providerHttpError(404)).toContain("404");
    expect(mediaPlaybackError(2)).not.toBe(mediaPlaybackError(3));
  });
});