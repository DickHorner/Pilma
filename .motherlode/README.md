# Motherlode v2

Motherlode is a portable governance and activation package for repositories.

It is designed for this flow:
1. Copy `.motherlode` into a repository.
2. Run the audit to establish a baseline.
3. Start an activation chat prompt.
4. Let Codex inspect the repository and propose repo-appropriate rules.
5. Review the proposed rules with the human owner.
6. Enable only the rules that make sense for this repository.
7. Re-run the audit with the approved activation profile.

## Key idea
Motherlode separates:
- constitution: universal engineering philosophy,
- baseline audit: generic repo hygiene and evidence checks,
- activation profile: repo-specific enabled rules,
- custom checks: optional repo-local executable rules.

## Files
- `MOTHERLODE.md`: engineering constitution.
- `config/audit.rules.json`: generic defaults and audit behavior.
- `config/activation.profile.template.json`: template for per-repo enabled rules.
- `scripts/audit.ps1`: baseline + activation-aware audit.
- `scripts/activate.ps1`: emits a chat-ready activation prompt.
- `prompts/system.motherlode.md`: system-style instruction bundle for Codex.
- `prompts/task.activate.md`: task prompt for first repo activation.
- `checks/`: optional repo-local executable checks.
- `templates/`: reusable docs and review artifacts.

## Typical usage
```powershell
pwsh -NoLogo -File .\.motherlode\scripts\bootstrap.ps1
pwsh -NoLogo -File .\.motherlode\scripts\audit.ps1
pwsh -NoLogo -File .\.motherlode\scripts\activate.ps1 -RunAudit -CopyToClipboard
```

## Activation model
Codex should not blindly enforce everything. It should:
- inspect the repository stack and risk surface,
- propose which optional rules are sensible,
- explain why,
- review the proposal with the human,
- write `.motherlode/config/activation.profile.json` only after approval.
