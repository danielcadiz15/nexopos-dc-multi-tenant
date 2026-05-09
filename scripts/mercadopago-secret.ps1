# Actualiza el secreto MERCADOPAGO_ACCESS_TOKEN en Firebase (Google Secret Manager).
# No subas el token al repo. Usá UNA de estas formas:
#
# Si aparece "la ejecución de scripts está deshabilitada":
#    powershell -ExecutionPolicy Bypass -File .\scripts\mercadopago-secret.ps1
#    O: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
#
# 1) Variable de sesión (PowerShell):
#    $env:MERCADOPAGO_ACCESS_TOKEN = "APP_USR-xxxxx"
#    .\scripts\mercadopago-secret.ps1
#
# 2) Archivo local (gitignored), una sola línea con el token:
#    .\scripts\mercadopago-secret.ps1 -TokenFile ".\secrets\mercadopago-token.txt"
#
# Luego (opcional): firebase deploy --only functions:api --project nexopos-dc --force
#    (con --force a veces fuerza nuevo revision; no siempre necesario tras secrets:set)

param(
  [string] $TokenFile = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$firebase = Get-Command firebase.cmd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if (-not $firebase) {
  $firebase = "firebase.cmd"
}

$raw = $null
if ($TokenFile -and (Test-Path $TokenFile)) {
  $raw = (Get-Content -Path $TokenFile -Raw).Trim()
}

if (-not $raw -and $env:MERCADOPAGO_ACCESS_TOKEN) {
  $raw = $env:MERCADOPAGO_ACCESS_TOKEN.Trim()
}

if (-not $raw) {
  Write-Host "Falta token: definí `$env:MERCADOPAGO_ACCESS_TOKEN o pasá -TokenFile.`n" -ForegroundColor Yellow
  exit 1
}

$raw | & $firebase functions:secrets:set MERCADOPAGO_ACCESS_TOKEN --data-file - --project nexopos-dc --force
Write-Host "`nListo. Probá un pago de prueba desde Configuración → Licencia." -ForegroundColor Green
