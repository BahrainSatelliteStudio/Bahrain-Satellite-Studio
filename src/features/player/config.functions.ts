import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isHostReachable, providerHttpError } from "@/lib/player/transport";

const slugZ = z.string().regex(/^[a-z0-9][a-z0-9-]{1,30}$/);
export const getTenantConfig = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugZ }).parse(d))
  .handler(async ({ data }) => {
    const { loadTenantConfig } = await import("@/lib/supabase-public.server");
    return loadTenantConfig(data.slug);
  });

