# Contributing to Pilma

Thanks for helping build a privacy-first PII firewall for LLM chat UIs!

## Principles
- Prefer small, incremental PRs with clean commits.
- Reuse existing anonymization and mapping logic where possible.
- Never log raw PII, raw request text, secrets, vault contents, or reversible mappings.
- Keep the companion localhost-only by default.
- Keep the PII vault in memory; do not persist it to disk by default.

## PR Requirements
- Include tests covering changes.
- Include a short risk analysis.
- Include a How to test section.
- Avoid bundling any models; use user-download + local cache.
- If relevant, keep chunking for short context window models.
- Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and `npm run openssf:check`.
- Update docs when behavior, workflows, networking, or security posture changes.

## Review Flow

- Request review from a CODEOWNER for changes that affect auth, token handling, vault behavior, tracing, CI, or security policy.
- Keep PRs small enough that a reviewer can verify them end-to-end.
- If you are the only available maintainer, record a self-review note in the PR summary with the risk and verification evidence.

## Project Setup
- Node.js LTS recommended.

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm test
npm run openssf:check
```

To start the service locally:

```bash
export SECRET='replace-with-a-long-random-shared-value'
npm run companion
```

PowerShell:

```powershell
$env:SECRET = 'replace-with-a-long-random-shared-value'
npm run companion
```

## Commit Style
- Use clear, imperative commit messages.
- Keep changes minimal and focused on the task.

## Security-Sensitive Changes

For changes touching networking, auth, vault behavior, model download behavior, token formats, or CI security:

- add or update tests
- add or update a change-risk note under `.motherlode/records/change-risk/`
- explain rollback expectations in the PR
