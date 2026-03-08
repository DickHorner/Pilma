[CmdletBinding()]
param(
  [string]$Task = 'Audit this repository, inspect repository context, propose activatable Motherlode rules, review them with me, then implement the approved profile.',
  [switch]$RunAudit,
  [switch]$CopyToClipboard
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

& (Join-Path $PSScriptRoot 'bootstrap.ps1') | Out-Null

$auditSummary = ''
if ($RunAudit) {
  $audit = & (Join-Path $PSScriptRoot 'audit.ps1') -Quiet
  $auditSummary = "Latest audit score: $($audit.score_percent)% ($($audit.passed_checks)/$($audit.total_checks) checks)."
}

$prompt = @"
You are operating inside this repository.

Primary constitution:
- .motherlode/MOTHERLODE.md

Primary task:
- $Task

Required execution order:
1. Run .motherlode/scripts/audit.ps1 and read the latest report in .motherlode/outputs.
2. Produce a prioritized gap report by risk and effort.
3. Inspect repository context: stack, repo shape, risk surface, internet exposure, sensitive data handling, and operational criticality.
4. Propose activatable rules from .motherlode/config/audit.rules.json that are sensible for this repo.
5. Review the proposal with the human owner before enabling anything beyond baseline.
6. Write .motherlode/config/activation.profile.json only after approval.
7. Execute approved remediations using small reversible changes.
8. Add or update tests for every behavior change.
9. Re-run audit and report score delta.
10. Return changed files, repository context summary, approved rules, verification evidence, unresolved risks, and next 3 actions.

Quality gates:
- No critical security regressions.
- Tests must pass.
- Docs and runbooks must be updated for material behavior changes.
- No repo-specific enforcement rule may be enabled without explicit rationale.

Context:
- $auditSummary
"@

$outputFile = Join-Path $repoRoot '.motherlode\outputs\last-activation-prompt.md'
Set-Content -Path $outputFile -Value $prompt -Encoding utf8

if ($CopyToClipboard -and (Get-Command Set-Clipboard -ErrorAction SilentlyContinue)) {
  $prompt | Set-Clipboard
}

Write-Output $prompt
Write-Output ''
Write-Output "Saved prompt: $outputFile"
