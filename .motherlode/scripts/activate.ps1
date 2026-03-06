[CmdletBinding()]
param(
  [string]$Task = 'Audit this repository against .motherlode/MOTHERLODE.md and execute the top 3 remediations with tests.',
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
3. Execute top 3 remediations using small reversible changes.
4. Add or update tests for every behavior change.
5. Re-run audit and report score delta.
6. Return changed files, verification evidence, unresolved risks, and next 3 actions.

Quality gates:
- No critical security regressions.
- Tests must pass.
- Docs and runbooks must be updated for material behavior changes.

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
