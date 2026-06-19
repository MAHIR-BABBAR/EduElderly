# Pull and start MongoDB + Redis for local EduElderly development.
# Docker Hub pulls can fail with EOF on flaky networks — retries until success.

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Pull-WithRetry {
    param([string]$Image, [int]$MaxAttempts = 20)
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        Write-Host "Pulling $Image (attempt $i/$MaxAttempts)..."
        docker pull $Image
        if ($LASTEXITCODE -eq 0) { return $true }
        Start-Sleep -Seconds 5
    }
    return $false
}

$mongoOk = Pull-WithRetry "mongo:7"
$redisOk = Pull-WithRetry "redis:7-alpine"

if (-not $mongoOk -or -not $redisOk) {
    Write-Error "Failed to pull infra images. Check network/VPN or retry later."
    exit 1
}

docker compose up mongo redis -d
docker compose ps mongo redis
