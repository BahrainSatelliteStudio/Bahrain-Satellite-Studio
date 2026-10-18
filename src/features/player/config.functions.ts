import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
export const getTenantConfig = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugZ }).parse(d))
  .handler(async ({ data }) => {
    const { loadTenantConfig } = await import("@/lib/supabase-public.server");
    return loadTenantConfig(data.slug);
  });
