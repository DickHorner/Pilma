# Motherlode Dotfiles Pack

This folder is the single source of truth for cross-repo engineering standards, audit criteria, and LLM-agent activation.

Use this package when you want to:

- audit any repository against one consistent standard,
- prioritize refactoring by risk and impact,
- generate strong instructions for specialized AI agents,
- keep delivery quality consistent across projects.

## One-command usage

```powershell
pwsh -NoLogo -File .\.motherlode\scripts\activate.ps1 -RunAudit -CopyToClipboard
```

This command:

1. validates scaffold directories,
2. runs baseline audit,
3. generates a ready-to-paste activation prompt,
4. copies that prompt to your clipboard (if available).

## Key files

- `MOTHERLODE.md`: canonical engineering constitution
- `prompts/system.motherlode.md`: LLM system-level behavior contract
- `prompts/task.activate.md`: task activation prompt template
- `prompts/agent-factory.md`: instructions for generating required sub-agents
- `schemas/agent-instruction.schema.json`: machine-readable agent spec schema
- `templates/*`: reusable docs for ADRs, runbooks, gap reports, and refactor plans
- `scripts/audit.ps1`: baseline quality and risk audit
- `scripts/bootstrap.ps1`: scaffold and readiness setup
- `scripts/activate.ps1`: one-shot prompt generation plus optional audit

## Port to another repository

1. Copy `.motherlode/` into the target repository root.
2. Run:

```powershell
pwsh -NoLogo -File .\.motherlode\scripts\bootstrap.ps1
```

3. Run activation:

```powershell
pwsh -NoLogo -File .\.motherlode\scripts\activate.ps1 -RunAudit
```

