param([string]$OutputDirectory = ".\backups")
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutputDirectory "pr-manager-$stamp.sql"
docker exec pr-manager-postgres pg_dump -U prmanager -d pr_manager_bmstu | Out-File -Encoding utf8 $target
Write-Output "Backup created: $target"
