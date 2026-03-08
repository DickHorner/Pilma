[CmdletBinding()]
param(
  [string]$OutDir = '',
  [switch]$Quiet,
  [switch]$DisableGitChecks
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $repoRoot

function Get-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try {
    return Get-Content -Path $Path -Raw | ConvertFrom-Json -Depth 20
  }
  catch {
    return $null
  }
}

$configPath = Join-Path $repoRoot '.motherlode\config\audit.rules.json'
$config = Get-JsonFile -Path $configPath
if ($null -eq $config) {
  throw "Missing or invalid config: $configPath"
}

$activationProfilePath = Join-Path $repoRoot '.motherlode\config\activation.profile.json'
$activation = Get-JsonFile -Path $activationProfilePath

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $repoRoot $config.audit.default_output_dir
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

function Get-Weight {
  param([string]$Id, [int]$Default = 1)
  $weights = $config.weights.PSObject.Properties
  foreach ($w in $weights) {
    if ($w.Name -eq $Id) { return [int]$w.Value }
  }
  return $Default
}

function Get-FirstExisting {
  param([object[]]$Candidates)
  foreach ($candidate in $Candidates) {
    $fullPath = Join-Path $repoRoot ([string]$candidate)
    if (Test-Path $fullPath) {
      return [string]$candidate
    }
  }
  return $null
}

$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Id,
    [string]$Category,
    [bool]$Passed,
    [string]$Evidence,
    [string]$Remediation,
    [int]$Weight = 1,
    [string]$Mode = 'baseline'
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
      mode = $Mode
    }) | Out-Null
}

$docs = $config.paths.docs
$gov = $config.paths.governance
$ci = $config.paths.ci

$readmePath = Get-FirstExisting $docs.readme
$contribPath = Get-FirstExisting $docs.contributing
$securityPath = Get-FirstExisting $docs.security
$archPath = Get-FirstExisting $docs.architecture
$runbookPath = Get-FirstExisting $docs.runbook
$changelogPath = Get-FirstExisting $docs.changelog
$codeownersPath = Get-FirstExisting $gov.codeowners
$agentsPath = Get-FirstExisting $gov.agents
$motherlodePath = Get-FirstExisting $gov.motherlode
$ciPath = Get-FirstExisting $ci.workflow
$codeqlPath = Get-FirstExisting $ci.sast
$lockfilePath = Get-FirstExisting $config.paths.dependency_lockfiles

Add-Check -Id 'docs.readme' -Category 'governance' -Passed ($null -ne $readmePath) -Evidence ($readmePath ?? 'missing') -Remediation 'Add or update README.md with setup, usage, and contribution basics.' -Weight (Get-Weight 'docs.readme' 2)
Add-Check -Id 'docs.contributing' -Category 'governance' -Passed ($null -ne $contribPath) -Evidence ($contribPath ?? 'missing') -Remediation 'Add CONTRIBUTING.md with PR and testing requirements.' -Weight (Get-Weight 'docs.contributing' 2)
Add-Check -Id 'docs.security' -Category 'security' -Passed ($null -ne $securityPath) -Evidence ($securityPath ?? 'missing') -Remediation 'Add SECURITY.md with private reporting process and response targets.' -Weight (Get-Weight 'docs.security' 3)
Add-Check -Id 'docs.codeowners' -Category 'governance' -Passed ($null -ne $codeownersPath) -Evidence ($codeownersPath ?? 'missing') -Remediation 'Add .github/CODEOWNERS for ownership clarity.' -Weight (Get-Weight 'docs.codeowners' 2)
Add-Check -Id 'docs.architecture' -Category 'maintainability' -Passed ($null -ne $archPath) -Evidence ($archPath ?? 'missing') -Remediation 'Add architecture decision records or architecture docs.' -Weight (Get-Weight 'docs.architecture' 2)
Add-Check -Id 'docs.runbook' -Category 'operations' -Passed ($null -ne $runbookPath) -Evidence ($runbookPath ?? 'missing') -Remediation 'Add operational runbooks for critical workflows.' -Weight (Get-Weight 'docs.runbook' 2)
Add-Check -Id 'ci.workflow' -Category 'delivery' -Passed ($null -ne $ciPath) -Evidence ($ciPath ?? 'missing') -Remediation 'Add CI workflow to run tests, lint or typecheck, and build.' -Weight (Get-Weight 'ci.workflow' 3)
Add-Check -Id 'security.sast' -Category 'security' -Passed ($null -ne $codeqlPath) -Evidence ($codeqlPath ?? 'missing') -Remediation 'Enable static analysis workflow, for example CodeQL.' -Weight (Get-Weight 'security.sast' 2)
Add-Check -Id 'deps.lockfile' -Category 'supply-chain' -Passed ($null -ne $lockfilePath) -Evidence ($lockfilePath ?? 'missing') -Remediation 'Commit a dependency lockfile for reproducibility.' -Weight (Get-Weight 'deps.lockfile' 2)
Add-Check -Id 'agents.instructions' -Category 'ai-governance' -Passed ($null -ne $agentsPath) -Evidence ($agentsPath ?? 'missing') -Remediation 'Add AGENTS.md or agents.md for agent behavior constraints.' -Weight (Get-Weight 'agents.instructions' 1)
Add-Check -Id 'motherlode.present' -Category 'ai-governance' -Passed ($null -ne $motherlodePath) -Evidence ($motherlodePath ?? 'missing') -Remediation 'Add .motherlode/MOTHERLODE.md and activation scripts.' -Weight (Get-Weight 'motherlode.present' 2)
Add-Check -Id 'release.changelog' -Category 'operations' -Passed ($null -ne $changelogPath) -Evidence ($changelogPath ?? 'missing') -Remediation 'Add CHANGELOG.md for release transparency.' -Weight (Get-Weight 'release.changelog' 1)

$packageJson = $null
$scriptNames = @()
foreach ($manifest in $config.paths.package_manifests) {
  $candidate = Join-Path $repoRoot ([string]$manifest)
  if (Test-Path $candidate) {
    try {
      $packageJson = Get-Content -Path $candidate -Raw | ConvertFrom-Json
      if ($null -ne $packageJson.scripts) {
        $scriptNames = @($packageJson.scripts.PSObject.Properties.Name)
      }
      break
    }
    catch {
      $packageJson = $null
    }
  }
}

$hasTestScript = $false
foreach ($scriptName in $config.package_scripts.test) { if ($scriptNames -contains [string]$scriptName) { $hasTestScript = $true } }
$hasBuildScript = $false
foreach ($scriptName in $config.package_scripts.build) { if ($scriptNames -contains [string]$scriptName) { $hasBuildScript = $true } }
$hasTypecheckOrLint = $false
foreach ($scriptName in $config.package_scripts.lint_or_typecheck) { if ($scriptNames -contains [string]$scriptName) { $hasTypecheckOrLint = $true } }

Add-Check -Id 'scripts.test' -Category 'quality' -Passed $hasTestScript -Evidence ($(if ($hasTestScript) { 'package.json:scripts.test' } else { 'missing' })) -Remediation 'Add automated test script in package.json.' -Weight (Get-Weight 'scripts.test' 3)
Add-Check -Id 'scripts.build' -Category 'quality' -Passed $hasBuildScript -Evidence ($(if ($hasBuildScript) { 'package.json:scripts.build' } else { 'missing' })) -Remediation 'Add build script in package.json.' -Weight (Get-Weight 'scripts.build' 2)
Add-Check -Id 'scripts.typecheck_or_lint' -Category 'quality' -Passed $hasTypecheckOrLint -Evidence ($(if ($hasTypecheckOrLint) { 'package.json:scripts.(typecheck/lint)' } else { 'missing' })) -Remediation 'Add lint or typecheck scripts for fast quality feedback.' -Weight (Get-Weight 'scripts.typecheck_or_lint' 2)

$allFiles = Get-ChildItem -Path $repoRoot -Recurse -File -ErrorAction SilentlyContinue
$testFileCount = 0
foreach ($file in $allFiles) {
  foreach ($pattern in $config.test_file_patterns) {
    if ($file.FullName.Replace('\\', '/') -match [string]$pattern) {
      $testFileCount += 1
      break
    }
  }
}
Add-Check -Id 'tests.present' -Category 'quality' -Passed ($testFileCount -gt 0) -Evidence ("$testFileCount test files") -Remediation 'Add test files for core behavior and contracts.' -Weight (Get-Weight 'tests.present' 3)

$securityTargetsOk = $false
$securityTargetEvidence = 'missing'
if ($null -ne $securityPath) {
  $securityContent = Get-Content -Path (Join-Path $repoRoot $securityPath) -Raw
  $requiredPatterns = @($config.security_response_targets.required_patterns)
  $matches = @()
  foreach ($pattern in $requiredPatterns) {
    $matches += ($securityContent -match [string]$pattern)
  }
  $securityTargetsOk = -not ($matches -contains $false)
  $securityTargetEvidence = 'patterns checked'
}
Add-Check -Id 'security.response_targets' -Category 'security' -Passed $securityTargetsOk -Evidence $securityTargetEvidence -Remediation 'Document response and remediation targets in SECURITY.md.' -Weight (Get-Weight 'security.response_targets' 2)

$busFactorOk = $false
$busFactorEvidence = 'missing CODEOWNERS'
if ($null -ne $codeownersPath) {
  $codeownersContent = Get-Content -Path (Join-Path $repoRoot $codeownersPath)
  $owners = @()
  foreach ($line in $codeownersContent) {
    if ($line.Trim().StartsWith('#') -or [string]::IsNullOrWhiteSpace($line)) { continue }
    $owners += ([regex]::Matches($line, '@[^\s]+') | ForEach-Object { $_.Value })
  }
  $uniqueOwners = @($owners | Sort-Object -Unique)
  $minOwners = if ($null -ne $activation -and $null -ne $activation.repo_specific_overrides -and $null -ne $activation.repo_specific_overrides.min_codeowners) { [int]$activation.repo_specific_overrides.min_codeowners } else { [int]$config.audit.min_codeowners }
  $busFactorOk = ($uniqueOwners.Count -ge $minOwners)
  $busFactorEvidence = "owners in CODEOWNERS: $($uniqueOwners.Count)"
}
Add-Check -Id 'ownership.bus_factor' -Category 'governance' -Passed $busFactorOk -Evidence $busFactorEvidence -Remediation 'Ensure enough owners for critical paths in CODEOWNERS.' -Weight (Get-Weight 'ownership.bus_factor' 2)

$riskNotesEnabled = $config.risk_notes.enabled
if ($null -ne $activation -and $null -ne $activation.enabled_rules -and $null -ne $activation.enabled_rules.risky_change_notes) {
  $riskNotesEnabled = [bool]$activation.enabled_rules.risky_change_notes
}

if ($riskNotesEnabled) {
  $riskNotePassed = $true
  $riskNoteEvidence = 'not needed'
  $riskNoteRemediation = 'Add a change risk note with scope, risk, rollback plan, and verification evidence.'

  if (-not $DisableGitChecks -and (Get-Command git -ErrorAction SilentlyContinue)) {
    $gitBase = [string]$config.risk_notes.git_diff_base
    try {
      $changedFiles = @(git diff --name-only $gitBase 2>$null)
      $sensitivePatterns = @($config.risk_notes.sensitive_path_patterns)
      $sensitiveChanged = @()
      foreach ($changed in $changedFiles) {
        foreach ($pattern in $sensitivePatterns) {
          if ($changed.Replace('\\', '/') -match [string]$pattern) {
            $sensitiveChanged += $changed
            break
          }
        }
      }

      if ($sensitiveChanged.Count -gt 0) {
        $riskNotePassed = $false
        $riskNoteEvidence = "sensitive changes detected: $($sensitiveChanged -join ', ')"
        foreach ($riskPath in $config.paths.risk_note_paths) {
          $fullRiskPath = Join-Path $repoRoot ([string]$riskPath)
          if (Test-Path $fullRiskPath) {
            $notes = Get-ChildItem -Path $fullRiskPath -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
            foreach ($note in $notes) {
              $content = Get-Content -Path $note.FullName -Raw
              $allMarkersPresent = $true
              foreach ($marker in $config.risk_notes.required_markers) {
                if ($content -notmatch [regex]::Escape([string]$marker)) {
                  $allMarkersPresent = $false
                  break
                }
              }
              if ($allMarkersPresent) {
                $riskNotePassed = $true
                $riskNoteEvidence = $note.FullName.Replace($repoRoot, '.').TrimStart('.')
                break
              }
            }
          }
          if ($riskNotePassed) { break }
        }
      }
    }
    catch {
      $riskNoteEvidence = 'git diff unavailable'
    }
  }
  else {
    $riskNoteEvidence = 'git unavailable or disabled'
  }

  Add-Check -Id 'risk.change_notes' -Category 'operations' -Passed $riskNotePassed -Evidence $riskNoteEvidence -Remediation $riskNoteRemediation -Weight (Get-Weight 'risk.change_notes' 3) -Mode 'activation-aware'
}

$customChecksEnabled = $config.custom_checks.enabled
if ($null -ne $activation -and $null -ne $activation.enabled_rules) {
  # baseline audit remains always on; repo-specific custom checks are controlled by profile and file presence.
}

if ($customChecksEnabled) {
  $checksDir = Join-Path $repoRoot ([string]$config.custom_checks.directory)
  if (Test-Path $checksDir) {
    $customCheckFiles = Get-ChildItem -Path $checksDir -Filter '*.ps1' -File -ErrorAction SilentlyContinue
    foreach ($customCheck in $customCheckFiles) {
      try {
        $output = & $customCheck.FullName -RepoRoot $repoRoot -ConfigPath $configPath -ActivationProfilePath $activationProfilePath
        if ($null -ne $output) {
          $items = @()
          if ($output -is [System.Array]) { $items = $output } else { $items = @($output) }
          foreach ($item in $items) {
            Add-Check -Id ([string]$item.id) -Category ([string]$item.category) -Passed ([bool]$item.passed) -Evidence ([string]$item.evidence) -Remediation ([string]$item.remediation) -Weight ([int]$item.weight) -Mode 'custom'
          }
        }
      }
      catch {
        Add-Check -Id ("custom.$($customCheck.BaseName)") -Category 'custom' -Passed $false -Evidence 'custom check crashed' -Remediation 'Fix or disable the failing custom check.' -Weight 2 -Mode 'custom'
      }
    }
  }
}

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
  activation_profile = $(if (Test-Path $activationProfilePath) { '.motherlode/config/activation.profile.json' } else { 'none' })
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

$result | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonOut -Encoding utf8

$mdLines = New-Object System.Collections.Generic.List[string]
$mdLines.Add('# Motherlode Audit Report') | Out-Null
$mdLines.Add('') | Out-Null
$mdLines.Add("- Generated: $($result.generated_at)") | Out-Null
$mdLines.Add("- Repository: $($result.repository_root)") | Out-Null
$mdLines.Add("- Activation profile: $($result.activation_profile)") | Out-Null
$mdLines.Add("- Score: $scorePercent% ($earnedWeight/$totalWeight weighted points)") | Out-Null
$mdLines.Add("- Checks passed: $passedCount/$totalCount") | Out-Null
$mdLines.Add('') | Out-Null
$mdLines.Add('## Failed Checks (Priority Order)') | Out-Null
$mdLines.Add('') | Out-Null

if ($failedChecks.Count -eq 0) {
  $mdLines.Add('No failed checks.') | Out-Null
}
else {
  $mdLines.Add('| ID | Mode | Category | Weight | Evidence | Remediation |') | Out-Null
  $mdLines.Add('|---|---|---|---:|---|---|') | Out-Null
  foreach ($check in $failedChecks) {
    $mdLines.Add("| $($check.id) | $($check.mode) | $($check.category) | $($check.weight) | $($check.evidence) | $($check.remediation) |") | Out-Null
  }
}

$mdLines.Add('') | Out-Null
$mdLines.Add('## All Checks') | Out-Null
$mdLines.Add('') | Out-Null
$mdLines.Add('| ID | Mode | Status | Category | Weight | Evidence |') | Out-Null
$mdLines.Add('|---|---|---|---|---:|---|') | Out-Null
foreach ($check in $checks) {
  $mdLines.Add("| $($check.id) | $($check.mode) | $($check.status) | $($check.category) | $($check.weight) | $($check.evidence) |") | Out-Null
}

$mdLines -join "`n" | Set-Content -Path $mdOut -Encoding utf8

if (-not $Quiet) {
  Write-Output "Audit score: $scorePercent%"
  Write-Output "Markdown report: $mdOut"
  Write-Output "JSON report: $jsonOut"
}

$result
