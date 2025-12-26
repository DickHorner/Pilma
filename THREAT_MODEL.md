# Pilma Threat Model (Baseline)

This document captures key risks and mitigations for Pilma’s privacy-first PII handling.

## Objectives
- Prevent leakage of raw PII outside the user’s machine.
- Minimize retention of PII mappings; prefer in-memory vault.
- Ensure logs are free of PII while maintaining useful observability.

## Attack Surfaces
- **Browser Input/Output**: User text and assistant responses.
- **Companion Service API**: /anonymize, /deanonymize, /model/warmup, /health.
- **Local Storage**: Secret key and minimal configuration.
- **Model Downloads**: User-triggered downloads to local cache.

## Key Risks & Mitigations
- **PII in Logs**: Mitigate by structured JSON logs with only lengths, category counts, and timing. No raw text.
- **Excessive Mapping Retention**: Use ephemeral, in-memory vault. Evict aggressively.
- **Unauthorized API Calls**: Require shared secret header; default bind to 127.0.0.1.
- **Model License/Use**: Do not bundle models; warn users about `iiiorg/piiranha-v1-detect-personal-information` license (cc-by-nc-nd-4.0). User-download only.
- **Context Window Limit**: Implement chunking to respect short token limits; never discard safety-related context.

## Logging & Tracing Rules
- Include `request_id`, timing, `model_id`, `chunk_count`, input length, category counts.
- Exclude raw text, tokens, or identifiers that can reconstruct PII.

## Non-Negotiables
- Never log raw PII.
- Never persist PII to disk by default.
- Localhost-only networking by default.
- Each PR must include tests and brief risk analysis.
