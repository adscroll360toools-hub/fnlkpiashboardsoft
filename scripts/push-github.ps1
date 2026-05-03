# Push local commits to origin/main — from repo root: .\scripts\push-github.ps1 "your message"
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

git add -A
$dirty = git status --porcelain
if (-not $dirty) {
  Write-Host 'Nothing to commit (working tree clean). Pushing anyway if ahead of origin...'
} else {
  $msg = if ($args.Count -ge 1 -and $args[0]) { $args[0] } else { "chore: sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
  git commit -m $msg
}

git push origin main
