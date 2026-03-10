# Architecture Decisions

This file records the repo-level architecture decisions that back the current baseline.

## ADR-0001: Loopback-only companion service

- The service binds to `127.0.0.1` by default.
- Non-loopback binding requires explicit operator opt-in.
- Internet-facing deployment is out of scope for this repo slice.
- All POST routes require a shared secret.

## ADR-0002: In-memory vault only

- PII mappings stay in memory and are never written to disk by default.
- Session data is explicitly resettable and automatically cleaned up with a TTL.
- Recovery after process exit is intentionally unsupported to minimize retention risk.

## ADR-0003: Regex baseline before model inference

- PR1 keeps a regex-based anonymization baseline for EMAIL, PHONE, and SSN.
- Model-backed detection remains a planned enhancement behind `ModelManager`.
- Tests focus on roundtrip correctness and safe failure behavior.

## ADR-0004: Auth before body parsing

- The service verifies the shared secret before reading POST bodies.
- POST routes require `Content-Type: application/json`.
- Request bodies are capped at 1 MiB to reduce local denial-of-service risk.
- Invalid JSON returns a `400` instead of a generic `500`.

## ADR-0005: Motherlode compliance through conventional locations

- Governance and operational artifacts live in top-level or `.github/` paths that the Motherlode audit script checks.
- Existing hidden notes under `.agents/` remain useful, but canonical repo controls now live in standard locations.
