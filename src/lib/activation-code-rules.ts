import { z } from "zod";

export const activationBatchSchema = z.object({
  tenantId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  sourceId: z.string().uuid(),
  mode: z.enum(["individual", "shared"]),
  label: z.string().trim().min(1).max(80),
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(100),
  count: z.number().int().min(1).max(100),
}).superRefine((d, ctx) => {
  if (d.mode === "individual" && (d.count !== 1 || d.accountId)) {
    ctx.addIssue({ code: "custom", message: "الحساب المستقل له كود واحد فقط" });
  }
});

export const normalizeActivationCode = (code: string) => code.trim().toUpperCase();