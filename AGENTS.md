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
- Multi-tenant: every operational table has empresa_id (default my_empresa_id()) plus a RESTRICTIVE RLS policy against empresa_vigente_id(); expired/suspended companies lose data access at DB level. Why: isolation and license enforcement without rewriting each policy.
