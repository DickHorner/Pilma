## Scope

Repo-side OpenSSF hardening and simplification for governance, CI, dependency automation, startup safety, request validation, and repository evidence.

## Risk

- Tightening startup host validation may break previously undocumented non-loopback launches unless operators opt in explicitly.
- Requiring `application/json` on POST routes may reject ad hoc clients that sent the wrong content type.
- CI workflow pinning and permission tightening can surface configuration drift if workflows relied on broader defaults.

## Rollback Plan

- Revert the startup host gate in `src/companion/startup.ts` if a supported local workflow depends on non-loopback binds.
- Revert the JSON content-type checks in `src/companion/server.ts` if a required client cannot be updated quickly.
- Revert individual workflow changes if GitHub Actions execution reveals an incompatibility, keeping the rest of the hardening intact.

## Verification Evidence

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run openssf:check`
- `npm audit --audit-level=high`
- `powershell -ExecutionPolicy Bypass -File .motherlode/scripts/audit.ps1`
