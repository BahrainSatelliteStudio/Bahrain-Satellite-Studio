<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- `selfhost/panel/` is the standalone customer panel shipped to each customer's own server: zero-dependency Node (>=18) with JSON file storage, so it installs offline on Linux/Windows/Docker/cPanel. Keep it dependency-free; its `/api/public/config` mirrors the cloud tenant config shape so the APK can read either.
- Preview uses the shared PlayerApp renderer with an isolated demo catalog and favorites storage, so design changes reflect the app without modifying customer viewing data.
- The applications library uses the shared TEMPLATES registry and PlayerApp preview; applying a template updates only the tenant layout template, preserving sections and using the existing APK build pipeline.
- The opt-in viewing experience uses focused navigation/home/history/detail components with the shared PlayerApp transport logic; existing tenant templates remain unchanged so redesign never silently changes deployed apps.
- Media history keys and preview namespaces are defined in the browser-safe player/media module; history entries retain their stored identity so reopening cannot create duplicate typed keys.
- Provider transport diagnostics use a shared browser-safe helper; rejected HTTP responses are never healthy, and messages must not expose provider response bodies or credential-bearing URLs.
- All preview preferences, backups, favorites and playback progress use the same isolated namespace; playback owns remote keys while open and saves progress only after current-source metadata and resume readiness to avoid erasing history on failed loads.
- Homepage content uses a validated singleton in public.homepage_settings and a shared HomepageView renderer for the public page and admin preview; authenticated admin-only saves and RLS prevent customer edits.
- Tenant management screens verify tenant membership before loading, while privileged actions validate admin role server-side; customer account creation never attaches an existing account after a username conflict.

- APK builds are signed Release only: the keystore is generated server-side (src/lib/signing.server.ts) and stored as encrypted GitHub Actions secrets; builds refuse to run without it and without a logo, so every app ships with one stable signing identity.
- Built-in activation separates broadcast accounts from hashed codes; authenticated tenant-scoped management and atomic database redemption keep individual/shared accounts isolated and prevent concurrent device claims. Raw codes are returned only at creation; disabling a code prevents future redemption, not upstream broadcast access already granted.
- Feature implementations and all playback/experience UI live in `src/features/`; consumers import their owning modules directly instead of compatibility facades, so manufacturing and preview use one implementation while routes retain URLs, metadata, access and loading contracts.
- Keep player identity and preference rules in browser-safe `src/lib/player/` and keep server helpers behind handler-local imports; this prevents organization changes from crossing runtime or storage boundaries.

- Application orders and immutable quote snapshots live separately from tenants; only admin provisioning creates tenants after customer acceptance, so legacy applications and signing remain unchanged.
- Order saves validate theme availability and catalog compatibility against `app_themes` in both the workflow and selection trigger; tenant theme keys use the same key format rather than a fixed palette list so approved custom themes can be provisioned without altering legacy themes.
- Order-managed panels derive capabilities from approved feature selections; optional selfhost delivery manifests enforce the same selections without adding panel dependencies.
- `players/<name>/` holds vendored open-source native players (keep upstream LICENSE); each builds via its own GitHub workflow with build-time appId/appName and the shared signing secrets, so customer branding never edits upstream source.
- `players/bahrain-satellite/` contains original-app audit evidence and unapplied resource overlays only; do not treat these as buildable source or connect this proprietary APK to the open-source build pipeline, because source and original signing identity must be verified first.
- The shared player manufacturing path uses the pure `src/lib/player/manufacturing.ts` contract in Capacitor tooling and the release workflow; require explicit customer identity rather than fallback branding, so generated apps cannot inherit platform identity accidentally. Keep original APK evidence and vendored native players separate.
