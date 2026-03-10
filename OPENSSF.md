# OpenSSF Readiness

This repository is being prepared for the OpenSSF Best Practices Badge and improved OpenSSF Scorecard results.

## Repo Evidence

- README and project usage: `README.md`
- contribution and review expectations: `CONTRIBUTING.md`
- security reporting and disclosure process: `SECURITY.md`
- maintainership and ownership: `MAINTAINERS.md`, `.github/CODEOWNERS`
- code of conduct: `CODE_OF_CONDUCT.md`
- architecture and threat model: `ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md`, `THREAT_MODEL.md`
- operational guidance: `RUNBOOK.md`
- automated quality gates: `.github/workflows/ci.yml`
- static analysis: `.github/workflows/codeql.yml`
- Scorecard workflow: `.github/workflows/scorecards.yml`
- dependency update automation: `.github/dependabot.yml`
- repo-local readiness check: `npm run openssf:check`

## Scorecard-Oriented Improvements

- `Maintained`: documented maintainer ownership, changelog discipline, Dependabot automation, and explicit contribution/review flow
- `Code-Review`: CODEOWNERS coverage, review expectations in docs, and a PR template that captures risk and verification evidence
- `CII-Best-Practices`: security policy, code of conduct, maintainer doc, threat model, runbook, CI, CodeQL, and OpenSSF evidence mapping
- `Pinned-Dependencies`: GitHub Actions pinned to full commit SHAs
- `Token-Permissions`: GitHub workflow permissions reduced to the minimum needed

## Manual Blockers

- choose and commit a top-level project `LICENSE`
- enable GitHub branch protection or rulesets for `main`
- require pull request review before merge, ideally with CODEOWNER review for critical paths
- enable GitHub Private Vulnerability Reporting and confirm the `SECURITY.md` path in settings
- confirm Dependabot security updates, dependency graph, and code scanning are enabled in repository settings
- claim or register the project on <https://www.bestpractices.dev/>

## Local Verification

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run openssf:check
powershell -ExecutionPolicy Bypass -File .motherlode/scripts/audit.ps1
```
