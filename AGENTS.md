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
