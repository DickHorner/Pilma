# Pilma

Pilma is a privacy-first companion service that anonymizes sensitive text before it leaves the user's machine and restores it locally afterward.

## Current Scope

This repository currently ships the localhost companion service and its supporting docs/tests. The browser extension described in the architecture documents is planned work, not a checked-in build target in this repo yet.

## What Works Today

- `POST /anonymize` replaces detected PII with vault-backed tokens.
- `POST /deanonymize` restores tokens for the same session.
- `POST /session/reset` clears a session vault.
- `POST /model/warmup` warms a configured model when it is already cached or remote download is allowed.
- `GET /health` returns service status.

Security and privacy defaults:

- binds to `127.0.0.1` by default
- requires `X-Pilma-Secret` on all POST routes
- checks auth before reading request bodies
- caps JSON request bodies at 1 MiB
- keeps PII mappings in memory only, with session TTL cleanup
- emits structured traces without raw text or raw PII

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run companion
```

The companion service starts on `http://127.0.0.1:8787` by default and prints the shared secret you should provide to a trusted local client.

## API

### `GET /health`

Returns:

```json
{ "status": "ok", "sessions": 0 }
```

### `POST /anonymize`

Headers:

```text
X-Pilma-Secret: <shared-secret>
Content-Type: application/json
```

Body:

```json
{ "sessionId": "demo-session", "text": "Email me at user@example.com" }
```

Response:

```json
{
  "text": "Email me at §§EMAIL_1~D2B9D7F4§§",
  "counts": { "EMAIL": 1 },
  "traceId": "trace-..."
}
```

### `POST /deanonymize`

Body:

```json
{ "sessionId": "demo-session", "text": "Email me at §§EMAIL_1~D2B9D7F4§§" }
```

### `POST /session/reset`

Body:

```json
{ "sessionId": "demo-session" }
```

### `POST /model/warmup`

Body:

```json
{ "modelId": "iiiorg/piiranha-v1-detect-personal-information" }
```

or

```json
{ "locale": "en" }
```

If remote download is disabled and the model is not already cached, the route returns an error instead of silently downloading.

## Project Layout

- `src/companion`: service implementation
- `src/tracing`: structured trace emission
- `tests`: unit and integration coverage
- `ARCHITECTURE.md`: system-level architecture
- `THREAT_MODEL.md`: baseline privacy and security risks
- `RUNBOOK.md`: operational runbook

## Delivery Expectations

- keep PRs small and reversible
- add or update tests with behavior changes
- do not commit real PII, secrets, or production screenshots with sensitive data
- document security and operational impact for changes touching networking, vault storage, or token handling
