# Contributing to Pilma

Thanks for helping build a privacy-first PII firewall for LLM chat UIs!

## Principles
- Prefer **small, incremental PRs** with clean commits.
- **Reuse** existing anonymization + mapping logic where possible.
- **Never log raw PII**; only hashed/shape metadata.
- **Localhost only** for the companion by default.
- **In-memory vault**; avoid disk persistence for PII.

## PR Requirements
- Include tests covering changes.
- Include a short **risk analysis** (PII leakage considerations).
- Include a **How to test** section.
- Avoid bundling any models; use user-download + local cache.
- If relevant, ensure **chunking** for short context window models.

## Project Setup (Baseline)
- Node.js LTS recommended.
- Install deps and run scripts:
  - `npm install`
  - `npm run lint`
  - `npm test`
  - `npm run build`

## Commit Style
- Use clear, imperative commit messages.
- Keep changes minimal and focused on the task.
