# Pilma Identity Firewall Builder (Copilot Agent)

## Mission
Implement a privacy-first "PII Bridge" for LLM chat UIs:
- Obfuscate PII in user input before it leaves the browser.
- De-obfuscate PII in returned output on the client side.
- Use a local companion service that runs Pilma locally (no cloud PII).
- Support Chrome + Firefox extension builds from one codebase.
- Keep distribution small: models are downloaded by the user per locale.

## Non-negotiables (Guardrails)
- Never log raw PII. Logs may only include hashed/shape metadata.
- Never persist PII mapping longer than needed; prefer in-memory "vault".
- All network calls must be local loopback (127.0.0.1) unless explicitly configured.
- Every PR must include tests and a short risk analysis.
- Prefer small incremental PRs with clean commits.

## Model strategy (locale-driven, user-download)
Default recommended model: iiiorg/piiranha-v1-detect-personal-information
Constraints from model card:
- License: cc-by-nc-nd-4.0 (non-commercial, no-derivatives) -> must not be bundled; user downloads explicitly.
- Context length: 256 DeBERTa tokens -> implement chunking/splitting.
- Supported languages include German among six languages.
(Use the model card text as source of truth.)

## Architecture
- Companion Service: localhost HTTP API
  - /health
  - /anonymize
  - /deanonymize
  - /model/warmup
- Browser extension:
  - Intercept user input (textarea/contenteditable) before submission
  - Replace with obfuscated text
  - De-obfuscate assistant responses via DOM observer or overlay
- Shared secret between extension and companion (X-... header), stored locally.

## Delivery plan (PR slicing)
PR0: Repo baseline
- Add docs: ARCHITECTURE.md, THREAT_MODEL.md, CONTRIBUTING.md
- Add scripts: lint/test/build pipeline
- Add tracing skeleton (structured JSON logs)

PR1: Companion service skeleton
- Implement endpoints + secret auth + vault in memory
- Minimal anonymize/deanonymize logic using existing A5 core
- Unit tests for roundtrip and auth failure

PR2: Model manager
- Config schema: locale -> modelId list, allowRemoteDownload toggle
- Implement download/cache path and "warmup" endpoint
- Add chunking for max token length

PR3: Browser extension MVP
- Options page: service URL + secret + locale/model selection UI
- Content script: input interception + output deobfuscation
- Build scripts for Chrome + Firefox

PR4: Evaluation + CI
- Test dataset, leakage checks (PII never sent), correctness checks
- GitHub Actions run: unit tests + build artifacts

## Tracing requirements
- Trace each request with request_id, timing, model_id, chunk_count
- Never include raw text; only lengths + category counts.

## Definition of Done
- A user can install extension, run companion locally, pick a locale model and download it, and see PII obfuscated before sending.
- Tests pass; build produces Chrome + Firefox outputs.
- Docs include threat model and license warnings.