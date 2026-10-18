import { describe, expect, it } from "vitest";
import { isHostReachable } from "@/lib/player/transport";

describe("Provider transport regressions", () => {
  it("does not mark rejected or missing hosts as healthy", () => {
    expect(isHostReachable(403)).toBe(false);
    expect(isHostReachable(401)).toBe(false);
    expect(isHostReachable(404)).toBe(false);
    expect(isHostReachable(500)).toBe(false);
    expect(isHostReachable(0)).toBe(false);
    expect(isHostReachable(200)).toBe(true);
  });
});