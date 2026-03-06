[CmdletBinding()]
param(
  [switch]$ScaffoldRepoDocs
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$requiredDirs = @(
  '.motherlode',
  '.motherlode\prompts',
  '.motherlode\schemas',
  '.motherlode\templates',
  '.motherlode\scripts',
  '.motherlode\outputs'
)

foreach ($relativeDir in $requiredDirs) {
  $fullDir = Join-Path $repoRoot $relativeDir
  New-Item -ItemType Directory -Path $fullDir -Force | Out-Null
}

if ($ScaffoldRepoDocs) {
  $adrDir = Join-Path $repoRoot 'docs\adr'
  $runbookDir = Join-Path $repoRoot 'docs\runbooks'
  New-Item -ItemType Directory -Path $adrDir -Force | Out-Null
  New-Item -ItemType Directory -Path $runbookDir -Force | Out-Null

  $adrIndex = Join-Path $adrDir 'README.md'
  if (-not (Test-Path $adrIndex)) {
    Set-Content -Path $adrIndex -Encoding utf8 -Value "# ADR Index`n`nStore architecture decision records in this folder."
  }

  $runbookIndex = Join-Path $runbookDir 'README.md'
  if (-not (Test-Path $runbookIndex)) {
    Set-Content -Path $runbookIndex -Encoding utf8 -Value "# Runbook Index`n`nStore operational runbooks in this folder."
  }
}

Write-Output "Bootstrap complete: $repoRoot"
Write-Output 'Next: pwsh -NoLogo -File .\.motherlode\scripts\activate.ps1 -RunAudit -CopyToClipboard'


