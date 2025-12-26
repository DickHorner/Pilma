# Pilma Architecture (Baseline)

This document outlines the baseline architecture for the Pilma Identity Firewall, focusing on privacy-first handling of personally identifiable information (PII) around LLM chat UIs.

## Components
- **Companion Service (localhost)**
  - HTTP API running on loopback only by default (127.0.0.1).
  - Endpoints:
    - GET /health — service status
    - POST /anonymize — obfuscate PII from user input
    - POST /deanonymize — restore obfuscated placeholders in responses
    - POST /model/warmup — lazily prepare model(s) after user-download
  - Requires a shared secret header (e.g., X-Pilma-Secret).
  - In-memory vault for short-lived PII mappings.

- **Browser Extension (Chrome + Firefox)**
  - Intercepts user input (textarea/contenteditable) before it is submitted.
  - Replaces detected PII with obfuscated placeholders.
  - De-obfuscates assistant responses via DOM observer or overlay.
  - Shares a secret with the companion service via local storage.

- **Models (User-Download + Cache)**
  - Models are not bundled. Users download per-locale.
  - Default recommended model: iiiorg/piiranha-v1-detect-personal-information.
  - Constraints from its model card must be respected (license non-commercial/no-derivatives; short context window; multi-language support).

## Data Flow
1. User types in a chat input.
2. Extension intercepts, sends obfuscation request to the local companion.
3. Companion anonymizes PII, returns obfuscated text and ephemeral mapping.
4. Obfuscated text is sent to the LLM provider (outside Pilma’s scope).
5. Response is de-obfuscated on the client using the mapping, then rendered.

## Security Posture
- Localhost only for all companion endpoints, unless explicitly configured.
- No raw PII in logs; structured JSON logs only with shapes, lengths, and category counts.
- In-memory vault; avoid disk persistence for PII.
- Shared secret required for companion requests.

## Tracing (Baseline)
- Each request is traced with: request_id, timing, model_id, chunk_count.
- Never include raw text; only lengths and category counts.

## Delivery Slices
- PR0: Repo baseline (docs, pipeline, tracing skeleton)
- PR1: Companion skeleton (auth + vault + endpoints)
- PR2: Model manager (download/cache + warmup + chunking)
- PR3: Extension MVP (options + content scripts + builds)
- PR4: Evaluation & CI (datasets, leakage checks, GH Actions)
