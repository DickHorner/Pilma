# Pilma

[![CI](https://github.com/DickHorner/Pilma/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DickHorner/Pilma/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/DickHorner/Pilma/badge)](https://securityscorecards.dev/viewer/?uri=github.com/DickHorner/Pilma)

Pilma is a privacy-first localhost companion service that anonymizes sensitive text before it leaves the user's machine and restores it locally afterward.

This repository is actively being prepared for the OpenSSF Best Practices Badge and stronger OpenSSF Scorecard results. The current checked-in deliverable is the companion service. The browser extension described in the architecture documents is planned work and is not a build target in this repository yet.

## Current Scope

- `POST /anonymize` replaces detected PII with vault-backed tokens.
- `POST /deanonymize` restores tokens for the same session.
- `POST /session/reset` clears a session vault.
- `POST /model/warmup` warms a configured model when it is already cached or remote download is explicitly allowed.
- `GET /health` returns service status.

Security and privacy defaults:

- binds to `127.0.0.1` by default
- refuses non-loopback binds unless `ALLOW_NON_LOOPBACK_HOST=true` is set explicitly
- requires `X-Pilma-Secret` on all `POST` routes
- authenticates before reading request bodies
- accepts only `application/json` on `POST` routes
- caps JSON request bodies at 1 MiB
- keeps PII mappings in memory only, with session TTL cleanup
- emits structured traces without raw text, raw PII, or secrets

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm test
npm run openssf:check
export SECRET='replace-with-a-long-random-shared-value'
npm run companion
```

PowerShell alternative:

```powershell
$env:SECRET = 'replace-with-a-long-random-shared-value'
npm run companion
```

The companion service starts on `http://127.0.0.1:8787` by default. It requires an explicit `SECRET` environment variable and never prints that shared credential at startup.

## API

All `POST` routes require:

```text
Content-Type: application/json
X-Pilma-Secret: <shared-secret>
```

### `GET /health`

```json
{ "status": "ok", "sessions": 0 }
```

### `POST /anonymize`

Request:

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

```json
{ "sessionId": "demo-session", "text": "Email me at §§EMAIL_1~D2B9D7F4§§" }
```

### `POST /session/reset`

```json
{ "sessionId": "demo-session" }
```

### `POST /model/warmup`

```json
{ "modelId": "iiiorg/piiranha-v1-detect-personal-information" }
```

or:

```json
{ "locale": "en" }
```

If remote download is disabled and the model is not already cached, the route returns an error instead of silently downloading.

## Project Layout

- `src/companion`: companion service implementation
- `src/tracing`: structured trace emission
- `tests`: unit and integration coverage
- `ARCHITECTURE.md`: system architecture
- `ARCHITECTURE_DECISIONS.md`: architecture decisions
- `THREAT_MODEL.md`: privacy and security risks
- `RUNBOOK.md`: operational and release runbook
- `OPENSSF.md`: badge and Scorecard evidence map

## Development

Core local checks:

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run openssf:check
```

For contribution and review expectations, see [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [MAINTAINERS.md](MAINTAINERS.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Support Status

- Supported code line: `main`
- Deployment scope: localhost-only companion service
- Out-of-scope for this repository: internet-facing hosting defaults and bundled model distribution

## OpenSSF Notes

- Badge and Scorecard evidence is tracked in [OPENSSF.md](OPENSSF.md).
- A top-level project `LICENSE` is still a manual maintainer decision and remains a blocker for the highest OpenSSF badge level until committed.
