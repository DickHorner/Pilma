# Maintainers

## Project Scope

Pilma currently maintains a localhost-only companion service for anonymizing and deanonymizing PII around local LLM workflows.

## Maintainer Set

- `@DickHorner`: repository owner and primary maintainer
- `@jaspe`: secondary maintainer and CODEOWNER for critical paths

## Critical Areas

- `src/companion/`: auth, trust boundaries, vault behavior, and model warmup
- `src/tracing/`: trace sanitization and log safety
- `.github/workflows/`: CI, CodeQL, Scorecard, and supply-chain guardrails
- `SECURITY.md`: vulnerability handling and disclosure expectations

## Review Expectations

- Changes to critical areas should be reviewed by a CODEOWNER whenever more than one maintainer is available.
- Security-sensitive changes should include explicit verification evidence and a rollback note.
- Solo-maintainer changes should include a self-review summary in the PR or merge note.

## Support Policy

- `main` is the supported branch.
- Security fixes may be shipped on `main` only until versioned releases are introduced.
