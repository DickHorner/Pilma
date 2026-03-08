[CmdletBinding()]
param(
  [switch]$ScaffoldRepoDocs,
  [switch]$ScaffoldActivationProfile
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$requiredDirs = @(
  '.motherlode',
  '.motherlode\config',
  '.motherlode\prompts',
  '.motherlode\schemas',
  '.motherlode\templates',
  '.motherlode\scripts',
  '.motherlode\checks',
  '.motherlode\outputs'
)

foreach ($relativeDir in $requiredDirs) {
  $fullDir = Join-Path $repoRoot $relativeDir
  New-Item -ItemType Directory -Path $fullDir -Force | Out-Null
}

if ($ScaffoldRepoDocs) {
  $adrDir = Join-Path $repoRoot 'docs\adr'
  $runbookDir = Join-Path $repoRoot 'docs\runbooks'
  $riskDir = Join-Path $repoRoot 'docs\change-risk'
  New-Item -ItemType Directory -Path $adrDir -Force | Out-Null
  New-Item -ItemType Directory -Path $runbookDir -Force | Out-Null
  New-Item -ItemType Directory -Path $riskDir -Force | Out-Null
}

if ($ScaffoldActivationProfile) {
  $template = Join-Path $repoRoot '.motherlode\config\activation.profile.template.json'
  $target = Join-Path $repoRoot '.motherlode\config\activation.profile.json'
  if ((Test-Path $template) -and -not (Test-Path $target)) {
    Copy-Item -Path $template -Destination $target -Force
  }
}

Write-Output "Bootstrap complete: $repoRoot"
Write-Output 'Next: pwsh -NoLogo -File .\.motherlode\scripts\activate.ps1 -RunAudit -CopyToClipboard'
