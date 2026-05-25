# NexDrop — start local server for offline mode (Windows)
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "=== NexDrop Offline Setup ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "$Root\node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

Write-Host "Starting server on http://0.0.0.0:5000 ..." -ForegroundColor Green
Write-Host "Allow Node.js through Windows Firewall if prompted." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Keep this window open (server running)"
Write-Host "  2. Open a NEW terminal:"
Write-Host "       cd web"
Write-Host "       npm install"
Write-Host "       npm start"
Write-Host "  3. Browser opens http://localhost:3000 -> Offline Mode"
Write-Host "  4. Phone: same WiFi -> Offline -> Scan QR"
Write-Host ""

node server/src/server.js
