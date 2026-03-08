# Custom Motherlode Checks

Place repo-local PowerShell checks in this directory when baseline checks are not enough.

Each `*.ps1` file may return either one object or an array of objects with this shape:

```powershell
[pscustomobject]@{
  id = 'custom.example'
  category = 'security'
  weight = 3
  passed = $true
  evidence = 'details'
  remediation = 'how to fix if it fails'
}
```

Expected parameters:
- `-RepoRoot`
- `-ConfigPath`
- `-ActivationProfilePath`

Use custom checks for repo-specific enforcement such as:
- architecture boundaries,
- trust-boundary validation,
- sensitive logging,
- observability minimums.
