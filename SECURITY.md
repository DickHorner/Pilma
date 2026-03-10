# Security Policy

## Reporting a Vulnerability

Please do not report vulnerabilities in public issues.

Preferred private channel:

- GitHub Private Vulnerability Reporting for this repository, once enabled in repository settings

Fallback channel until private reporting is enabled:

- contact the maintainer through the repository owner's GitHub profile: <https://github.com/DickHorner>

Include:

- affected version or commit
- reproduction steps
- impact assessment
- any suggested mitigation

## Response Targets

- We aim to acknowledge incoming reports within 14 days.
- We aim to ship a fix or communicate a remediation plan for confirmed issues within 60 days.

## Supported Versions

| Version | Supported | Notes |
| --- | --- | --- |
| `main` | yes | Active development branch for this repository |
| historical commits before `0.1.0` | best effort only | Security fixes may land on `main` only |

## In Scope

This policy covers:

- the localhost companion service
- vault storage and token handling
- trace emission and logging behavior
- dependency and workflow security for this repository

## Out of Scope

- unreviewed forks or downstream modifications
- locally downloaded third-party models outside this repository
- internet-facing deployment changes that are not represented in this repository

## Disclosure Process

1. Report privately with enough detail to reproduce the issue.
2. A maintainer acknowledges receipt and triages severity.
3. We validate the report, prepare a fix or mitigation, and coordinate disclosure timing.
4. Once a fix or mitigation is available, we publish the change through the repository history and changelog.

## Safe Harbor

Good-faith research that avoids data exfiltration, service abuse, or privacy violations will be treated as responsible disclosure.
