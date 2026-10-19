import { describe, expect, it } from "vitest";
import { withApplicationTemplate } from "@/features/application-library/queries";
import { resolveLayout } from "@/lib/layout";

describe("shared application templates", () => {
  it("changes template without replacing existing section configuration or app links", () => {
    const original = resolveLayout({ template: "sidebar", sections: [{ key: "live", visible: false, label: "قنواتي", view: "row" }], apps: [{ name: "test", logo: "", url: "https://example.com" }] });
    const next = withApplicationTemplate(original, "experience");
    expect(next.template).toBe("experience");
    expect(next.sections).toEqual(original.sections);
    expect(next.apps).toEqual(original.apps);
  });
});