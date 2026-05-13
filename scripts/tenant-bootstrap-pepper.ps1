# Secreto TENANT_BOOTSTRAP_PEPPER: valor aleatorio largo (nunca lo compartas). Sirve para hashear los códigos
# de un solo uso que genera el super admin (modal Licencia → «Generar código»).
# El código en claro solo se muestra una vez al generarlo.
#
# Generá un valor, por ejemplo en PowerShell:
#   -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
#
# powershell -ExecutionPolicy Bypass -File .\scripts\tenant-bootstrap-pepper.ps1
#   .\scripts\tenant-bootstrap-pepper.ps1 -PepperFile ".\secrets\tenant-bootstrap-pepper.txt"

param(
  [string] $PepperFile = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$firebase = Get-Command firebase.cmd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if (-not $firebase) {
  $firebase = "firebase.cmd"
}

$raw = $null
if ($PepperFile -and (Test-Path $PepperFile)) {
  $raw = (Get-Content -Path $PepperFile -Raw).Trim()
}

if (-not $raw -and $env:TENANT_BOOTSTRAP_PEPPER) {
  $raw = $env:TENANT_BOOTSTRAP_PEPPER.Trim()
}

if (-not $raw) {
  Write-Host "Falta pepper: definí `$env:TENANT_BOOTSTRAP_PEPPER o pasá -PepperFile.`n" -ForegroundColor Yellow
  exit 1
}

$raw | & $firebase functions:secrets:set TENANT_BOOTSTRAP_PEPPER --data-file - --project nexopos-dc --force
Write-Host "`nListo. Desplegá functions (createTenant + generateTenantBootstrapCode)." -ForegroundColor Green
