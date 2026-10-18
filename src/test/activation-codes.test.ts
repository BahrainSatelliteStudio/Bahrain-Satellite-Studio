import { expect, test } from "vitest";
import { activationBatchSchema, normalizeActivationCode } from "@/lib/activation-code-rules";

const input = { tenantId: "11111111-1111-4111-8111-111111111111", sourceId: "22222222-2222-4222-8222-222222222222", label: "account", username: "user", password: "test-only-password", count: 1 };
test("individual accounts accept one code and reject a shared batch", () => {
  expect(activationBatchSchema.safeParse({ ...input, mode: "individual" }).success).toBe(true);
  expect(activationBatchSchema.safeParse({ ...input, mode: "individual", count: 2 }).success).toBe(false);
});
test("shared accounts support multiple codes for the same account", () => {
  expect(activationBatchSchema.safeParse({ ...input, mode: "shared", count: 2 }).success).toBe(true);
});
test("built-in codes normalize pasted whitespace and letter case", () => {
  expect(normalizeActivationCode(" bh-ABC123 ")).toBe("BH-ABC123");
});