# Verificación rápida de licencias + Mercado Pago (sin secretos).
# Uso: desde la raíz del repo: .\scripts\verify-billing-mp.ps1
# Opcional: .\scripts\verify-billing-mp.ps1 -ApiBase "https://TU-API.run.app"

param(
  [string] $ApiBase = "https://api-5q2i5764zq-uc.a.run.app"
)

$ErrorActionPreference = "Stop"
$base = $ApiBase.TrimEnd('/')

Write-Host "`n=== GET public-config ===" -ForegroundColor Cyan
$cfg = Invoke-RestMethod -Uri "$base/api/billing/mercadopago/public-config" -Method Get
$cfg | ConvertTo-Json -Depth 5

Write-Host "`n=== GET webhook (debe HTTP 200, cuerpo OK) ===" -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "$base/api/billing/mercadopago/webhook" -Method Get -UseBasicParsing
Write-Host "Status:" $r.StatusCode

Write-Host "`nInterpretación:" -ForegroundColor Yellow
$d = $cfg.data
if ($d.mercadoPagoTokenPresent) { Write-Host "  - Access token: presente en el servidor." -ForegroundColor Green }
else { Write-Host "  - Access token: NO detectado (revisá secreto MERCADOPAGO_ACCESS_TOKEN y redeploy de api)." -ForegroundColor Red }
if ([double]$d.monthlyPriceARS -gt 0) { Write-Host "  - Precio mensual ARS:" $d.monthlyPriceARS -ForegroundColor Green }
else { Write-Host "  - Precio mensual: 0 (configurá /admin Licencias o doc platform/billing)." -ForegroundColor Red }
if ($d.mercadoPagoConfigured) { Write-Host "  - Checkout habilitado: sí." -ForegroundColor Green }
else { Write-Host "  - Checkout habilitado: no (hace falta token Y precio > 0)." -ForegroundColor Yellow }
