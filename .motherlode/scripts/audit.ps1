[CmdletBinding()]
param(
  [string]$OutDir = '',
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $repoRoot '.motherlode\outputs'
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

function Get-FirstExisting {
  param([string[]]$Candidates)
  foreach ($candidate in $Candidates) {
    $fullPath = Join-Path $repoRoot $candidate
    if (Test-Path $fullPath) {
      return $candidate
    }
  }
  return $null
}

$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Id,
    [string]$Category,
    [int]$Weight,
    [bool]$Passed,
    [string]$Evidence,
    [string]$Remediation
  )

  $status = if ($Passed) { 'PASS' } else { 'FAIL' }
  $checks.Add([pscustomobject]@{
      id = $Id
      category = $Category
      weight = $Weight
      status = $status
      passed = $Passed
      evidence = $Evidence
      remediation = $Remediation
    }) | Out-Null
}

$readmePath = Get-FirstExisting @('README.md')
$contribPath = Get-FirstExisting @('CONTRIBUTING.md')
$securityPath = Get-FirstExisting @('SECURITY.md')
$codeownersPath = Get-FirstExisting @('.github/CODEOWNERS')
$archPath = Get-FirstExisting @('ARCHITECTURE_DECISIONS.md', 'docs/adr', 'docs/architecture')
$runbookPath = Get-FirstExisting @('RUNBOOK.md', 'docs/runbooks', 'docs/ops')
$changelogPath = Get-FirstExisting @('CHANGELOG.md')
$ciPath = Get-FirstExisting @('.github/workflows/ci.yml', '.github/workflows/ci.yaml')
$codeqlPath = Get-FirstExisting @('.github/workflows/codeql.yml', '.github/workflows/codeql.yaml')
$lockfilePath = Get-FirstExisting @('package-lock.json', 'pnpm-lock.yaml', 'yarn.lock')
$agentsPath = Get-FirstExisting @('AGENTS.md', 'agents.md')
$motherlodePath = Get-FirstExisting @('.motherlode/MOTHERLODE.md')

Add-Check -Id 'docs.readme' -Category 'governance' -Weight 2 -Passed ($null -ne $readmePath) -Evidence ($readmePath ?? 'missing') -Remediation 'Add or update README.md with setup, usage, and contribution basics.'
Add-Check -Id 'docs.contributing' -Category 'governance' -Weight 2 -Passed ($null -ne $contribPath) -Evidence ($contribPath ?? 'missing') -Remediation 'Add CONTRIBUTING.md with PR and testing requirements.'
Add-Check -Id 'docs.security' -Category 'security' -Weight 3 -Passed ($null -ne $securityPath) -Evidence ($securityPath ?? 'missing') -Remediation 'Add SECURITY.md with private reporting process and response targets.'
Add-Check -Id 'docs.codeowners' -Category 'governance' -Weight 2 -Passed ($null -ne $codeownersPath) -Evidence ($codeownersPath ?? 'missing') -Remediation 'Add .github/CODEOWNERS for ownership clarity.'
Add-Check -Id 'docs.architecture' -Category 'maintainability' -Weight 2 -Passed ($null -ne $archPath) -Evidence ($archPath ?? 'missing') -Remediation 'Add architecture decision records or architecture docs.'
Add-Check -Id 'docs.runbook' -Category 'operations' -Weight 2 -Passed ($null -ne $runbookPath) -Evidence ($runbookPath ?? 'missing') -Remediation 'Add operational runbooks for critical workflows.'
Add-Check -Id 'ci.workflow' -Category 'delivery' -Weight 3 -Passed ($null -ne $ciPath) -Evidence ($ciPath ?? 'missing') -Remediation 'Add CI workflow to run tests, lint/typecheck, and build.'
Add-Check -Id 'security.sast' -Category 'security' -Weight 2 -Passed ($null -ne $codeqlPath) -Evidence ($codeqlPath ?? 'missing') -Remediation 'Enable static analysis workflow (for example CodeQL).' 
Add-Check -Id 'deps.lockfile' -Category 'supply-chain' -Weight 2 -Passed ($null -ne $lockfilePath) -Evidence ($lockfilePath ?? 'missing') -Remediation 'Commit a dependency lockfile for reproducibility.'
Add-Check -Id 'agents.instructions' -Category 'ai-governance' -Weight 1 -Passed ($null -ne $agentsPath) -Evidence ($agentsPath ?? 'missing') -Remediation 'Add AGENTS.md or agents.md for agent behavior constraints.'
Add-Check -Id 'motherlode.present' -Category 'ai-governance' -Weight 2 -Passed ($null -ne $motherlodePath) -Evidence ($motherlodePath ?? 'missing') -Remediation 'Add .motherlode/MOTHERLODE.md and activation scripts.'
Add-Check -Id 'release.changelog' -Category 'operations' -Weight 1 -Passed ($null -ne $changelogPath) -Evidence ($changelogPath ?? 'missing') -Remediation 'Add CHANGELOG.md for release transparency.'

$packageJsonPath = Join-Path $repoRoot 'package.json'
$packageJson = $null
$scriptNames = @()
if (Test-Path $packageJsonPath) {
  try {
    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
    if ($null -ne $packageJson.scripts) {
      $scriptNames = @($packageJson.scripts.PSObject.Properties.Name)
    }
  }
  catch {
    $packageJson = $null
  }
}

$hasTestScript = $scriptNames -contains 'test'
$hasBuildScript = $scriptNames -contains 'build'
$hasTypecheckOrLint = (($scriptNames -contains 'typecheck') -or ($scriptNames -contains 'lint') -or ($scriptNames -contains 'lint:docs'))

Add-Check -Id 'scripts.test' -Category 'quality' -Weight 3 -Passed $hasTestScript -Evidence ($(if ($hasTestScript) { 'package.json:scripts.test' } else { 'missing' })) -Remediation 'Add automated test script in package.json.'
Add-Check -Id 'scripts.build' -Category 'quality' -Weight 2 -Passed $hasBuildScript -Evidence ($(if ($hasBuildScript) { 'package.json:scripts.build' } else { 'missing' })) -Remediation 'Add build script in package.json.'
Add-Check -Id 'scripts.typecheck_or_lint' -Category 'quality' -Weight 2 -Passed $hasTypecheckOrLint -Evidence ($(if ($hasTypecheckOrLint) { 'package.json:scripts.(typecheck/lint)' } else { 'missing' })) -Remediation 'Add lint or typecheck scripts for fast quality feedback.'

$testFiles = Get-ChildItem -Path $repoRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '\.(test|spec)\.(ts|tsx|js|jsx)$' }
$testFileCount = ($testFiles | Measure-Object).Count
Add-Check -Id 'tests.present' -Category 'quality' -Weight 3 -Passed ($testFileCount -gt 0) -Evidence ("$testFileCount test/spec files") -Remediation 'Add test files for core behavior and contracts.'

$securityTargetsOk = $false
$securityTargetEvidence = 'missing'
if ($null -ne $securityPath) {
  $securityContent = Get-Content -Path (Join-Path $repoRoot $securityPath) -Raw
  $has14 = $securityContent -match '14\s*day|14-day|14 days'
  $has60 = $securityContent -match '60\s*day|60-day|60 days'
  $securityTargetsOk = ($has14 -and $has60)
  $securityTargetEvidence = "14-day: $has14, 60-day: $has60"
}
Add-Check -Id 'security.response_targets' -Category 'security' -Weight 2 -Passed $securityTargetsOk -Evidence $securityTargetEvidence -Remediation 'Document 14-day response and 60-day fix targets in SECURITY.md.'

$busFactorOk = $false
$busFactorEvidence = 'missing CODEOWNERS'
if ($null -ne $codeownersPath) {
  $codeownersContent = Get-Content -Path (Join-Path $repoRoot $codeownersPath)
  $owners = @()
  foreach ($line in $codeownersContent) {
    if ($line.Trim().StartsWith('#') -or [string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $owners += ([regex]::Matches($line, '@[^\s]+') | ForEach-Object { $_.Value })
  }
  $uniqueOwners = @($owners | Sort-Object -Unique)
  $busFactorOk = ($uniqueOwners.Count -ge 2)
  $busFactorEvidence = "owners in CODEOWNERS: $($uniqueOwners.Count)"
}
Add-Check -Id 'ownership.bus_factor' -Category 'governance' -Weight 2 -Passed $busFactorOk -Evidence $busFactorEvidence -Remediation 'Ensure at least two owners for critical paths in CODEOWNERS.'

$totalWeight = (($checks | Measure-Object -Property weight -Sum).Sum)
$earnedWeight = ((($checks | Where-Object { $_.passed }) | Measure-Object -Property weight -Sum).Sum)
$failedChecks = @($checks | Where-Object { -not $_.passed } | Sort-Object -Property weight -Descending)
$passedCount = (@($checks | Where-Object { $_.passed }).Count)
$totalCount = $checks.Count
$scorePercent = if ($totalWeight -gt 0) { [math]::Round(($earnedWeight / $totalWeight) * 100, 1) } else { 0 }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$jsonOut = Join-Path $OutDir "audit-$timestamp.json"
$mdOut = Join-Path $OutDir "audit-$timestamp.md"

$result = [pscustomobject]@{
  generated_at = (Get-Date).ToString('o')
  repository_root = $repoRoot
  score_percent = $scorePercent
  passed_checks = $passedCount
  total_checks = $totalCount
  earned_weight = $earnedWeight
  total_weight = $totalWeight
  json_report = $jsonOut
  markdown_report = $mdOut
  failed_checks = $failedChecks
  checks = $checks
}

$result | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonOut -Encoding utf8

$mdLines = New-Object System.Collections.Generic.List[string]
$mdLines.Add('# Motherlode Audit Report') | Out-Null
$mdLines.Add('') | Out-Null
$mdLines.Add("- Generated: $($result.generated_at)") | Out-Null
$mdLines.Add("- Repository: $($result.repository_root)") | Out-Null
$mdLines.Add("- Score: $scorePercent% ($earnedWeight/$totalWeight weighted points)") | Out-Null
$mdLines.Add("- Checks passed: $passedCount/$totalCount") | Out-Null
$mdLines.Add('') | Out-Null
$mdLines.Add('## Failed Checks (Priority Order)') | Out-Null
$mdLines.Add('') | Out-Null

if ($failedChecks.Count -eq 0) {
  $mdLines.Add('No failed checks.') | Out-Null
}
else {
  $mdLines.Add('| ID | Category | Weight | Evidence | Remediation |') | Out-Null
  $mdLines.Add('|---|---|---:|---|---|') | Out-Null
  foreach ($check in $failedChecks) {
    $mdLines.Add("| $($check.id) | $($check.category) | $($check.weight) | $($check.evidence) | $($check.remediation) |") | Out-Null
  }
}

$mdLines.Add('') | Out-Null
$mdLines.Add('## All Checks') | Out-Null
$mdLines.Add('') | Out-Null
$mdLines.Add('| ID | Status | Category | Weight | Evidence |') | Out-Null
$mdLines.Add('|---|---|---|---:|---|') | Out-Null
foreach ($check in $checks) {
  $mdLines.Add("| $($check.id) | $($check.status) | $($check.category) | $($check.weight) | $($check.evidence) |") | Out-Null
}

$mdLines -join "`n" | Set-Content -Path $mdOut -Encoding utf8

if (-not $Quiet) {
  Write-Output "Audit score: $scorePercent%"
  Write-Output "Markdown report: $mdOut"
  Write-Output "JSON report: $jsonOut"
}

$result
