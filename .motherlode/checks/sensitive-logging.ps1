[CmdletBinding()]
param(
  [string]$RepoRoot,
  [string]$ConfigPath,
  [string]$ActivationProfilePath
)

$ErrorActionPreference = 'Stop'

function Get-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try {
    $raw = Get-Content -Path $Path -Raw
    if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('Depth')) {
      return $raw | ConvertFrom-Json -Depth 20
    }
    return $raw | ConvertFrom-Json
  }
  catch {
    return $null
  }
}

$activation = Get-JsonFile -Path $ActivationProfilePath
if (
  $null -eq $activation -or
  $null -eq $activation.enabled_rules -or
  -not [bool]$activation.enabled_rules.sensitive_logging
) {
  return
}

$overrides = $activation.repo_specific_overrides
$forbiddenPatterns = @()
if ($null -ne $overrides -and $null -ne $overrides.forbidden_log_patterns) {
  $forbiddenPatterns = @($overrides.forbidden_log_patterns | ForEach-Object { [string]$_ })
}

$allowedExceptions = @()
if ($null -ne $overrides -and $null -ne $overrides.allowed_log_exceptions) {
  $allowedExceptions = @($overrides.allowed_log_exceptions | ForEach-Object { ([string]$_).Replace('\', '/') })
}

function Is-AllowedException {
  param(
    [string]$RelativePath,
    [int]$LineNumber
  )

  $normalizedPath = $RelativePath.Replace('\', '/')
  $pathWithLine = "${normalizedPath}:$LineNumber"
  return ($allowedExceptions -contains $normalizedPath -or $allowedExceptions -contains $pathWithLine)
}

$sourceFiles = Get-ChildItem -Path (Join-Path $RepoRoot 'src') -Recurse -Include *.ts -File
$violations = New-Object System.Collections.Generic.List[string]

foreach ($file in $sourceFiles) {
  $relativePath = $file.FullName.Replace($RepoRoot, '').TrimStart('\', '/').Replace('\', '/')
  $lines = Get-Content -Path $file.FullName

  for ($index = 0; $index -lt $lines.Count; $index++) {
    $line = $lines[$index]
    if ($line -notmatch 'console\.(log|error|warn|info|debug)') {
      continue
    }

    if (Is-AllowedException -RelativePath $relativePath -LineNumber ($index + 1)) {
      continue
    }

    $lowerLine = $line.ToLowerInvariant()
    foreach ($pattern in $forbiddenPatterns) {
      if ([string]::IsNullOrWhiteSpace($pattern)) {
        continue
      }

      if ($lowerLine.Contains($pattern.ToLowerInvariant())) {
        $violations.Add("${relativePath}:$($index + 1) matched forbidden log pattern '$pattern'") | Out-Null
        break
      }
    }
  }
}

$traceContent = Get-Content -Path (Join-Path $RepoRoot 'src/tracing/trace.ts') -Raw
$traceSanitized = (
  $traceContent.Contains('request_id: event.request_id') -and
  $traceContent.Contains('input_length: event.input_length') -and
  $traceContent.Contains('category_counts: event.category_counts ?? {}') -and
  -not $traceContent.Contains('text: event.') -and
  -not $traceContent.Contains('secret: event.') -and
  -not $traceContent.Contains('sessionId: event.')
)

if (-not $traceSanitized) {
  $violations.Add('src/tracing/trace.ts failed sanitized trace payload check') | Out-Null
}

$evidence = if ($violations.Count -eq 0) {
  'Console logging is free of forbidden secret/PII patterns, and trace payload remains sanitized.'
}
else {
  'Sensitive logging violations: ' + ($violations -join '; ')
}

[pscustomobject]@{
  id = 'custom.sensitive_logging'
  category = 'security'
  weight = 3
  passed = ($violations.Count -eq 0)
  evidence = $evidence
  remediation = 'Do not log raw request text, raw PII, secrets, vault contents, or reversible mappings; keep trace payloads sanitized and document any intentional bootstrap exception.'
}
