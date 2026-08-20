# Local dev bootstrap for Windows (run from repo root in PowerShell)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> Bootstrapping .env.local" -ForegroundColor Cyan
node scripts/bootstrap-local-env.mjs

if (-not (Test-Path "node_modules")) {
  Write-Host "==> Installing dependencies" -ForegroundColor Cyan
  corepack pnpm install
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "==> Starting Centrifugo (docker)" -ForegroundColor Cyan
  Push-Location docker\centrifugo
  docker compose up -d
  Pop-Location
} else {
  Write-Host "Docker not found — skip Centrifugo (local sandbox relay optional)" -ForegroundColor Yellow
}

Write-Host "==> Starting dev:local (Next.js + Convex)" -ForegroundColor Cyan
corepack pnpm run dev:local
