import { describe, expect, it } from "vitest";
import { manufacturingConfig } from "@/lib/player/manufacturing";

const first = { appName: "قنوات النور", packageId: "me.bhsat.noor", appUrl: "https://example.org/p/noor", logoUrl: "https://example.org/noor.png", version: "1.0.0" };

describe("neutral manufacturing base", () => {
  it("uses the first customer's name and identity without a fixed brand", () => {
    expect(manufacturingConfig(first)).toMatchObject({ appName: "قنوات النور", appId: "me.bhsat.noor" });
  });
  it("uses a different customer's name and package independently", () => {
    const second = manufacturingConfig({ ...first, appName: "Orbit TV", packageId: "me.bhsat.orbit", appUrl: "https://example.org/p/orbit" });
    expect(second.appName).toBe("Orbit TV");
    expect(second.appId).toBe("me.bhsat.orbit");
    expect(second.server.url).toBe("https://example.org/p/orbit?v=1.0.0");
    expect(manufacturingConfig(first).appName).toBe("قنوات النور");
  });
  it("does not manufacture a branded fallback when the customer name is missing", () => {
    expect(() => manufacturingConfig({ ...first, appName: "" })).toThrow();
  });
  it("requires the customer's own logo", () => {
    expect(() => manufacturingConfig({ ...first, logoUrl: "" })).toThrow();
  });
  it("preserves existing query settings while setting the release version", () => {
    expect(manufacturingConfig({ ...first, appUrl: "https://example.org/p/noor?mode=tv&v=old" }).server.url).toBe("https://example.org/p/noor?mode=tv&v=1.0.0");
  });
  it("rejects credential-bearing application URLs", () => {
    expect(() => manufacturingConfig({ ...first, appUrl: "https://user:pass@example.org/p/noor" })).toThrow();
  });
});