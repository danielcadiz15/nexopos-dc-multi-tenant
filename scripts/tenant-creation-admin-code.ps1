# Define el secreto TENANT_CREATION_ADMIN_CODE (código fijo opcional; quien crea la empresa puede usarlo
# en lugar de un código generado desde super admin). Si solo usás códigos de un solo uso, igual podés
# definir un valor largo aleatorio acá que nadie conozca y operar solo con TENANT_BOOTSTRAP_PEPPER + generador.
# Emulador local: también podés usar $env:TENANT_CREATION_ADMIN_CODE antes de arrancar functions.
#
# powershell -ExecutionPolicy Bypass -File .\scripts\tenant-creation-admin-code.ps1
# O con archivo (una línea, sin espacios extra):
#   .\scripts\tenant-creation-admin-code.ps1 -CodeFile ".\secrets\tenant-admin-code.txt"

param(
  [string] $CodeFile = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$firebase = Get-Command firebase.cmd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if (-not $firebase) {
  $firebase = "firebase.cmd"
}

$raw = $null
if ($CodeFile -and (Test-Path $CodeFile)) {
  $raw = (Get-Content -Path $CodeFile -Raw).Trim()
}

if (-not $raw -and $env:TENANT_CREATION_ADMIN_CODE) {
  $raw = $env:TENANT_CREATION_ADMIN_CODE.Trim()
}

if (-not $raw) {
  Write-Host "Falta código: definí `$env:TENANT_CREATION_ADMIN_CODE o pasá -CodeFile.`n" -ForegroundColor Yellow
  exit 1
}

$raw | & $firebase functions:secrets:set TENANT_CREATION_ADMIN_CODE --data-file - --project nexopos-dc --force
Write-Host "`nListo. Desplegá functions:createTenant para enlazar el secreto (p. ej. firebase deploy --only functions:createTenant)." -ForegroundColor Green
