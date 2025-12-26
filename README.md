# Pilm - the PII LLm Anonymizer — Local Identity Firewall

Pilm is a **local-first PII anonymization tool** that can also run as a **localhost companion service** for a **Chrome/Firefox browser extension**.

The goal: **prevent sensitive data (PII) from ever reaching LLM chat platforms** by replacing it with robust placeholders *before* sending, then restoring it locally for the user.

## What it does

- **Detects PII locally** using a HuggingFace token-classification model (downloaded on demand by the user)
- **Obfuscates outbound text** with stable tokens (e.g. `§§EMAIL_1~A1Z8K§§`)
- **Maintains a local vault** (mapping token ↔ original PII) for reversible restoration
- Runs as:
  - a standalone desktop app, and/or
  - a **localhost HTTP API** used by a browser extension
- Supports **Chrome + Firefox** via a single WebExtension codebase

## Why “model download per locale”?

To keep installers/extensions lightweight (and to respect model licensing), A5 does **not** bundle large model weights.
Users choose the best model for their locale and download it locally.

## High-level architecture

1) **Browser Extension**
- Intercepts chat input (textarea/contenteditable)
- Calls `POST http://127.0.0.1:<port>/anonymize`
- Sends only obfuscated text to the website
- Watches assistant output and calls `POST /deanonymize` before display

2) **A5 Companion Service (localhost)**
- Loads the configured model from local cache
- Detects PII spans and replaces them with tokens
- Restores tokens using an in-memory vault (scoped by session)

**Security baseline**
- Loopback only (127.0.0.1)
- Shared secret header required for all POST requests
- No raw PII in logs

## Privacy & threat model (short)

- A5 keeps PII local. The website receives only tokens.
- The browser extension can either:
  - **replace tokens in the DOM** (convenient but less private), or
  - **use a “reveal overlay”** (recommended hardening) so the page never sees restored PII in its DOM.

## Companion API

Typical endpoints:

- `GET /health`
- `POST /anonymize`
  - input: `{ "sessionId": "...", "text": "..." }`
  - output: `{ "text": "...tokens...", "counts": {...}, "traceId": "..." }`
- `POST /deanonymize`
  - input: `{ "sessionId": "...", "text": "..." }`
  - output: `{ "text": "...restored..." }`
- `POST /model/warmup`
  - downloads/caches the configured model (if allowed) and runs a warmup inference
- `POST /session/reset`
  - clears the in-memory vault for that session

All POST requests require a header like:
- `X-A5-PII-Secret: <shared-secret>`

## Model support

Default recommended model (user downloads explicitly):
- `iiiorg/piiranha-v1-detect-personal-information`

Notes:
- Short context window (chunking required)
- Multi-language support (incl. German)
- License may restrict bundling and commercial use — this repo treats models as user-provided downloads.

## Install & run (developer)

```bash
npm install
npm test
npm run dev
Start companion service
npm run companion```

It prints:
- service URL (default http://127.0.0.1:8787)
- shared secret (paste into extension options)

## Build browser extension

```npm run ext:build:all```

## Outputs:
- extension/dist/chrome
- extension/dist/firefox

## Load extension (dev)
### Chrome
- chrome://extensions
- Developer mode → “Load unpacked” → extension/dist/chrome
### Firefox
- about:debugging#/runtime/this-firefox
- “Load Temporary Add-on…” → extension/dist/firefox/manifest.json
Open extension options:
- set service URL
- paste shared secret
- choose locale/model config

## Evaluation (recommended)
We track:

- Leakage rate (raw PII must not appear after anonymize)
- Round-trip integrity (deanonymize(anonymize(text)) == text)
- Token mutation safety (if tokens are altered, do not restore incorrectly)

A small JSONL dataset format is recommended:
```{"id":"1","text":"Email max@example.com","pii":[{"type":"EMAIL","start":6,"end":21}]}```

## Observability (PII-safe tracing)
Tracing must never contain raw text or raw PII.
Allowed telemetry:
- text length
- category counts (EMAIL:2, PHONE:1…)
- timings (load/infer/replace/restore)
- model id + locale
- request/trace id

## Contributing
- Keep PRs small and reviewable
- Add/extend tests with every change
- Do not add real PII to fixtures, logs, screenshots, or docs
- Include a short security/privacy impact note for changes that touch the vault, token format, or network layer
