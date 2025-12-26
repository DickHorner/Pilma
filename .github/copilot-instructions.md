You are working in the Pilma repository.

Working style:
- Make small, reviewable PRs.
- Always search the repo before writing new code.
- Prefer reuse of existing anonymization + mapping logic.
- Add/extend tests with every change.
- Never log raw user text or PII.

Security:
- Localhost only by default.
- Secret header required for companion requests.
- Vault should be in-memory; avoid disk persistence of PII.

Model:
- Do not bundle HF models.
- Implement user-download + cache.
- Implement chunking because some models have short context windows.

Output:
- Provide diffs or file edits.
- Include a "How to test" section for every PR.
