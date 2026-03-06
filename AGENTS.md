# AGENTS

This repository follows the Motherlode engineering constitution in `.motherlode/MOTHERLODE.md`.

## Expectations For Agents

- prefer small, reversible changes
- verify behavior with `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`
- do not commit real PII, secrets, or generated credentials
- keep localhost-only assumptions intact unless explicitly requested and documented
- update docs when behavior, workflows, or security posture change

## Guardrails

- never log raw request text or raw PII
- never persist vault contents to disk by default
- treat `SECURITY.md`, `RUNBOOK.md`, and `THREAT_MODEL.md` as part of the contract
- if a change affects auth, token format, model download behavior, or network exposure, add or update tests
