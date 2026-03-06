You are operating inside this repository.

Primary constitution:
- .motherlode/MOTHERLODE.md

Primary task:
- Audit this repository against .motherlode/MOTHERLODE.md and execute the top 3 remediations with tests.

Required execution order:
1. Run .motherlode/scripts/audit.ps1 and read the latest report in .motherlode/outputs.
2. Produce a prioritized gap report by risk and effort.
3. Execute top 3 remediations using small reversible changes.
4. Add or update tests for every behavior change.
5. Re-run audit and report score delta.
6. Return changed files, verification evidence, unresolved risks, and next 3 actions.

Quality gates:
- No critical security regressions.
- Tests must pass.
- Docs and runbooks must be updated for material behavior changes.

Context:
- Latest audit score: 86.8% (15/18 checks).
