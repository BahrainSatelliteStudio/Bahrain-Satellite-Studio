import { z } from "zod";

// Pure manufacturing contract: contains no brand defaults or customer secrets.
const publicUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "يلزم رابط HTTPS دون بيانات دخول");

export const manufacturingSchema = z.object({
  appName: z.string().trim().min(1).max(80).refine((v) => !/[\x00-\x1f]/.test(v)),
  packageId: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/),
  appUrl: publicUrl,
  logoUrl: publicUrl,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export function manufacturingConfig(input: unknown) {
  const identity = manufacturingSchema.parse(input);
  const url = new URL(identity.appUrl);
  url.searchParams.set("v", identity.version);
  return {
    appId: identity.packageId,
    appName: identity.appName,
    webDir: "www",
    server: { url: url.toString(), cleartext: true, androidScheme: "https" },
    android: { allowMixedContent: true },
  };
}