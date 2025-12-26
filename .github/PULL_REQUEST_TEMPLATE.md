## Summary

Describe the change succinctly.

## Changes
- Docs added: ARCHITECTURE.md, THREAT_MODEL.md, CONTRIBUTING.md
- Tooling: Node/TS pipeline (lint/test/build)
- Tracing: Structured JSON logger skeleton

## Risk Analysis
Include or link to `.github/copilot-risk-analysis.PR0.md`.

## How to Test
```bash
npm install
npm run lint
npm test
npm run build
```

## Checklist
- [ ] Tests added/updated
- [ ] No raw PII logged
- [ ] Local-only defaults maintained
