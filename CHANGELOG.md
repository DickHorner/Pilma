# Changelog

## Unreleased

- hardened request handling by authenticating before body parsing and adding request-size limits
- required an explicit startup `SECRET` and stopped printing shared credentials at startup
- made server startup fail fast on bind errors
- made session tokens stable per value without collision-prone short hashes
- added session TTL cleanup in the in-memory vault
- aligned README and testing docs with the current companion-service scope
- added Motherlode governance files, workflows, and operational runbook
