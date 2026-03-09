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
    return Get-Content -Path $Path -Raw | ConvertFrom-Json -Depth 20
  }
  catch {
    return $null
  }
}

$activation = Get-JsonFile -Path $ActivationProfilePath
if (
  $null -eq $activation -or
  $null -eq $activation.enabled_rules -or
  -not [bool]$activation.enabled_rules.trust_boundary_validation
) {
  return
}

function Read-RepoFile {
  param([string]$RelativePath)
  $fullPath = Join-Path $RepoRoot $RelativePath
  if (-not (Test-Path $fullPath)) {
    throw "Missing file: $RelativePath"
  }
  return Get-Content -Path $fullPath -Raw
}

function Test-HandlerAuthBeforeBodyRead {
  param(
    [string]$Content,
    [string]$HandlerName
  )

  $start = $Content.IndexOf("private async $HandlerName")
  if ($start -lt 0) { return $false }

  $snippetLength = [Math]::Min(1200, $Content.Length - $start)
  $snippet = $Content.Substring($start, $snippetLength)
  $authIndex = $snippet.IndexOf('if (!this.verifyAuth(req))')
  $readIndex = $snippet.IndexOf('await this.readJsonBody(req)')

  return ($authIndex -ge 0 -and $readIndex -ge 0 -and $authIndex -lt $readIndex)
}

$serverContent = Read-RepoFile 'src/companion/server.ts'
$configContent = Read-RepoFile 'src/companion/config.ts'
$startupContent = Read-RepoFile 'src/companion/startup.ts'
$serverTests = Read-RepoFile 'tests/server.test.ts'
$warmupTests = Read-RepoFile 'tests/server-warmup.test.ts'

$checks = @(
  @{
    Name = 'anonymize auth precedes JSON body read'
    Passed = Test-HandlerAuthBeforeBodyRead -Content $serverContent -HandlerName 'handleAnonymize'
  },
  @{
    Name = 'deanonymize auth precedes JSON body read'
    Passed = Test-HandlerAuthBeforeBodyRead -Content $serverContent -HandlerName 'handleDeanonymize'
  },
  @{
    Name = 'session reset auth precedes JSON body read'
    Passed = Test-HandlerAuthBeforeBodyRead -Content $serverContent -HandlerName 'handleSessionReset'
  },
  @{
    Name = 'model warmup auth precedes JSON body read'
    Passed = Test-HandlerAuthBeforeBodyRead -Content $serverContent -HandlerName 'handleModelWarmup'
  },
  @{
    Name = 'request body size limit enforced'
    Passed = ($serverContent.Contains('MAX_BODY_BYTES') -and $serverContent.Contains('Request body too large'))
  },
  @{
    Name = 'CORS restricted to localhost and extension origins'
    Passed = (
      $serverContent.Contains("origin.startsWith('chrome-extension://')") -and
      $serverContent.Contains("origin.startsWith('moz-extension://')") -and
      $serverContent -match 'localhost\|127\\\.0\\\.0\\\.1'
    )
  },
  @{
    Name = 'service defaults to loopback host'
    Passed = (
      $startupContent.Contains("const DEFAULT_HOST = '127.0.0.1'") -and
      $startupContent.Contains('const host = env.HOST || DEFAULT_HOST;')
    )
  },
  @{
    Name = 'remote model download disabled by default'
    Passed = $configContent.Contains('allowRemoteDownload: false')
  },
  @{
    Name = 'server tests cover auth failures'
    Passed = ($serverTests.Contains("it('requires authentication'") -and $warmupTests.Contains("it('requires authentication'"))
  },
  @{
    Name = 'server tests cover validation failures'
    Passed = (
      $serverTests.Contains("it('returns 400 for missing sessionId'") -and
      $serverTests.Contains("it('returns 400 for invalid JSON'") -and
      $warmupTests.Contains('No models configured for locale')
    )
  }
)

$failed = @($checks | Where-Object { -not $_.Passed })
$evidence = if ($failed.Count -eq 0) {
  'Auth-before-body-read, loopback defaults, body limits, CORS restrictions, and boundary tests verified.'
}
else {
  'Missing boundary controls: ' + (($failed | ForEach-Object { $_.Name }) -join '; ')
}

[pscustomobject]@{
  id = 'custom.trust_boundary_validation'
  category = 'security'
  weight = 3
  passed = ($failed.Count -eq 0)
  evidence = $evidence
  remediation = 'Require auth before parsing POST bodies, keep loopback/CORS restrictions, enforce body limits, and retain trust-boundary test coverage.'
}
