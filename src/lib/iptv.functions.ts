// Compatibility facade: preserve existing callers while implementations are feature-owned.
export { getTenantConfig } from "@/features/player/config.functions";
export { activateCode } from "@/features/activation/redeem.functions";
export { xtreamApi, m3uFetch, macCall } from "@/features/player/providers.functions";
export { createTenant } from "@/features/tenant-management/create.functions";
export { githubStatus, setupSigningKey, triggerBuild } from "@/features/builds/builds.functions";
export { checkHost } from "@/features/tenant-management/host-check.functions";
