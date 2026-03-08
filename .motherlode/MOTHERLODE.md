# Motherlode Engineering Constitution
Version: 2.1
Scope: all repositories, all human contributors, all AI agents

## 1) Prime Directive
Build software that is correct, secure, maintainable, observable, and cost-aware.
Prefer explicit, testable solutions over clever shortcuts.

## 2) Non-Negotiable Principles
- Correctness first: behavior is verified by tests or reproducible checks.
- Security by default: least privilege, strict boundary validation, safe secret handling.
- Readability over cleverness: optimize for maintainers under time pressure.
- Reversible change sets: small increments and easy rollback.
- Reproducibility: deterministic builds and pinned tooling where practical.
- Observability: logs, metrics, traces, and alert ownership.
- Documented intent: architecture decisions and tradeoffs are written down.
- Ownership resilience: critical areas should have bus factor >= 2.

## 3) Definition of Done
A change is done only when all pass:
- Build, lint or typecheck, and tests pass.
- New behavior has test coverage at the right level.
- Security checks run and critical issues are resolved.
- Risky changes include migration plus rollback notes.
- Observability is updated for critical paths.
- Docs are updated for behavior or contract changes.

## 4) Code Quality Criteria
- Clear module boundaries and dependency direction.
- Domain-oriented naming; avoid ambiguous abbreviations.
- Explicit error handling; no silent failures.
- Minimize shared mutable state and implicit coupling.
- Validate and normalize data at trust boundaries.
- Keep complexity bounded; refactor high-friction code.

## 5) Security Criteria
- Threat model exists for internet-facing or sensitive components.
- AuthN and AuthZ are explicit and test-covered.
- Input validation and output encoding at every boundary.
- Secrets are never committed, logged, or hardcoded.
- Dependency scanning and patch cadence are active.
- Core risk classes are explicitly checked: injection, XSS, CSRF, SSRF, traversal, deserialization.

## 6) Testing Criteria
- Testing pyramid is balanced: unit > integration > e2e.
- Contract tests protect module and service boundaries.
- Flaky tests are treated as defects.
- Coverage is risk-driven, not vanity-driven.

## 7) Reliability and Performance Criteria
- Define SLOs for latency, error rate, and availability where relevant.
- Benchmark hot paths for significant refactors.
- Use timeouts, retries, idempotency, and backpressure for I/O flows.
- Exercise failure modes in tests or drills.

## 8) Refactor Decision Framework
Refactor when at least one condition is true:
- Change amplification is high.
- Defect density is concentrated.
- Cognitive load blocks safe iteration.
- Duplication causes drift.
- Security or performance hotspots are unresolved.

Refactor sequence:
1. Add characterization tests.
2. Refactor in small safe slices.
3. Re-measure behavior, quality, and performance.
4. Keep rollback path until stable.

## 9) Universal Review Rubric
Score each 0-2:
- Correctness
- Security
- Maintainability
- Test adequacy
- Performance
- Observability
- Documentation
- Operational readiness

Release threshold:
- no category scores 0,
- average score >= 1.5,
- no unresolved critical risk.

## 10) AI Agent Build Standard
Required baseline agents for most repos:
- Architect Agent
- Refactor Agent
- Security Agent
- Test Agent
- Performance Agent
- Docs Agent
- Release Agent

Every agent specification must define:
- mission and scope,
- hard constraints and forbidden operations,
- required inputs and expected outputs,
- success checks and evidence format,
- escalation points and rollback behavior.

Reference schema: `.motherlode/schemas/agent-instruction.schema.json`.

## 11) Activation Protocol
When this constitution exists in a repo, agents should:
1. run `.motherlode/scripts/audit.ps1`,
2. produce prioritized gap report,
3. inspect repository context and risk surface,
4. propose activatable rules suited to this repo,
5. review the proposal with the human owner,
6. write `.motherlode/config/activation.profile.json` only after approval,
7. execute remediations in reversible steps,
8. rerun audit and report delta,
9. leave next actions with risk-aware ordering.

## 12) Enforcement Model
Motherlode distinguishes between:
- baseline checks: generic repo hygiene and evidence checks,
- activation-aware checks: checks enabled for this specific repo,
- custom checks: repo-local executable checks loaded from `.motherlode/checks`,
- local policy: repo-tunable rules loaded from `.motherlode/config`.

A high score from baseline checks alone is not sufficient evidence that the constitution is fully enforced.

## 13) Reference Baselines
- OWASP ASVS
- OWASP Top 10
- NIST SSDF
- OpenSSF Scorecard
- OpenTelemetry
- Semantic Versioning
- language/framework official docs
