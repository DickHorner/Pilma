# Pilma Runbook

## Purpose

This runbook covers the core operational workflows for the local companion service in this repository.

## Local Startup

1. Run `npm install`.
2. Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and `npm run openssf:check`.
3. Set a strong shared secret in the environment, for example `SECRET=...`.
4. Start the service with `npm run companion`.
5. Configure the same shared credential only in trusted local clients.

The service refuses to bind to non-loopback hosts unless `ALLOW_NON_LOOPBACK_HOST=true` is set explicitly.

## Health Verification

- Check `GET /health`.
- A healthy response is `{"status":"ok","sessions":<number>}`.
- If the service fails to start, check whether the port is already in use.

## Model Warmup

- `POST /model/warmup` requires `X-Pilma-Secret`.
- All `POST` routes require `Content-Type: application/json`.
- If `allowRemoteDownload` is `false`, only pre-cached models can be warmed.
- If warmup fails, confirm that the requested model exists in config and that cache permissions are valid.

## Session Hygiene

- Use `POST /session/reset` after a workflow is complete.
- Session vault data also expires automatically via TTL cleanup.
- If memory growth is observed, verify that clients are not creating unbounded session IDs.

## Incident Response

- Stop the companion service immediately if secrets or raw PII are suspected to have been exposed.
- Rotate the shared secret by restarting with a new `SECRET` value.
- Clear session state with `POST /session/reset` or restart the process.
- Document the event in `CHANGELOG.md` and follow `SECURITY.md` for coordinated handling.

## Release Checklist

- All local quality gates pass.
- `npm run openssf:check` passes.
- Motherlode audit passes on the shell used by contributors.
- `npm audit` reports zero known vulnerabilities.
- Docs reflect current behavior and scripts.
- Required GitHub branch protection and review settings are still enabled.
