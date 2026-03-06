Apply `.motherlode/MOTHERLODE.md` to this repository.

Required execution order:
1. Run `.motherlode/scripts/audit.ps1`.
2. Produce a prioritized gap report by risk and effort.
3. Execute the top 3 remediations with reversible changes.
4. Add or update tests for every behavior change.
5. Re-run audit and report score delta.
6. Output changed files, unresolved risks, and next 3 actions.

Quality gates:
- no critical security regressions,
- tests pass,
- docs updated for contract or behavior changes.
