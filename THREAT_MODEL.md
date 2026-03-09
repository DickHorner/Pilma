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
- **Excessive Mapping Retention**: Use ephemeral, in-memory vault with session TTL cleanup and explicit session reset.
- **Unauthorized API Calls**: Require shared secret header; default bind to 127.0.0.1; reject unauthenticated POSTs before reading request bodies.
- **Bootstrap Secret Exposure**: Require an explicit startup secret via environment variable and avoid echoing it in startup logs.
- **Model License/Use**: Do not bundle models; warn users about `iiiorg/piiranha-v1-detect-personal-information` license (cc-by-nc-nd-4.0). User-download only.
- **Context Window Limit**: Implement chunking to respect short token limits; never discard safety-related context.
- **Request Flooding / Oversized Payloads**: Enforce request body limits and keep the service loopback-only.
- **Browser-Origin Abuse**: Only emit CORS headers for trusted local or extension origins.

## Logging & Tracing Rules
- Include `request_id`, timing, `model_id`, `chunk_count`, input length, category counts.
- Exclude raw text, tokens, or identifiers that can reconstruct PII.

## Non-Negotiables
- Never log raw PII.
- Never persist PII to disk by default.
- Localhost-only networking by default.
- Each PR must include tests and brief risk analysis.
