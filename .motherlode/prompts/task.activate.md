Apply `.motherlode/MOTHERLODE.md` to this repository.

Required execution order:
1. Run `.motherlode/scripts/audit.ps1`.
2. Produce a prioritized gap report by risk and effort.
3. Inspect repository context and risk surface.
4. Propose which activatable rules are sensible for this repo.
5. Review the proposal with the human owner.
6. Write `.motherlode/config/activation.profile.json` after approval.
7. Execute approved remediations with reversible changes.
8. Add or update tests for every behavior change.
9. Re-run audit and report score delta.
10. Output changed files, unresolved risks, and next 3 actions.

Quality gates:
- no critical security regressions,
- tests pass,
- docs updated for contract or behavior changes,
- no rule enabled without explicit rationale.
