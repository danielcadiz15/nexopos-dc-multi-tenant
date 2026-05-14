param(
  [string]$Project = "nexopos-dc",
  [string]$JavaHome = "",
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$clientDir = Join-Path $root "client"
$androidDir = Join-Path $clientDir "android"
$apkSource = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
$publicApk = Join-Path $clientDir "public\app-caja.apk"
$publicVersionMeta = Join-Path $clientDir "public\app-caja-version.json"
$appGradle = Join-Path $androidDir "app\build.gradle"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$archiveApk = Join-Path $root ("app-debug-nexopos-{0}.apk" -f $timestamp)

function Resolve-JavaHome {
  param([string]$Preferred)
  if ($Preferred -and (Test-Path $Preferred)) {
    return (Resolve-Path $Preferred).Path
  }

  $defaultTools = Join-Path $root "tools"
  if (Test-Path $defaultTools) {
    $jdkCandidate = Get-ChildItem -Path $defaultTools -Directory -Filter "jdk-21*" |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($jdkCandidate) {
      return $jdkCandidate.FullName
    }
  }

  if ($env:JAVA_HOME -and (Test-Path $env:JAVA_HOME)) {
    return $env:JAVA_HOME
  }

  throw "No se encontró JDK 21. Indicá -JavaHome o instalalo en '$defaultTools'."
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][scriptblock]$Script
  )
  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Script
}

function Get-ApkVersionMeta {
  param([Parameter(Mandatory = $true)][string]$GradleFile)
  if (!(Test-Path $GradleFile)) {
    return @{
      versionCode = 0
      versionName = "desconocida"
    }
  }
  $content = Get-Content -Path $GradleFile -Raw
  $codeMatch = [regex]::Match($content, "versionCode\s+(\d+)")
  $nameMatch = [regex]::Match($content, 'versionName\s+"([^"]+)"')
  $versionCode = if ($codeMatch.Success) { [int]$codeMatch.Groups[1].Value } else { 0 }
  $versionName = if ($nameMatch.Success) { $nameMatch.Groups[1].Value } else { "desconocida" }
  return @{
    versionCode = $versionCode
    versionName = $versionName
  }
}

$resolvedJavaHome = Resolve-JavaHome -Preferred $JavaHome
$env:JAVA_HOME = $resolvedJavaHome
$env:Path = "$resolvedJavaHome\bin;$env:Path"

Write-Host "JAVA_HOME: $resolvedJavaHome" -ForegroundColor DarkGray

Invoke-Step -Title "Build web base (client)" -Script {
  Push-Location $clientDir
  try {
    npm run build
  } finally {
    Pop-Location
  }
}

Invoke-Step -Title "Capacitor sync android" -Script {
  Push-Location $clientDir
  try {
    npx cap sync android
  } finally {
    Pop-Location
  }
}

Invoke-Step -Title "Compilar APK debug" -Script {
  Push-Location $androidDir
  try {
    .\gradlew.bat assembleDebug
  } finally {
    Pop-Location
  }
}

if (!(Test-Path $apkSource)) {
  throw "No se encontró APK compilada: $apkSource"
}

Invoke-Step -Title "Publicar APK en client/public/app-caja.apk" -Script {
  Copy-Item -Path $apkSource -Destination $publicApk -Force
  Copy-Item -Path $apkSource -Destination $archiveApk -Force
  $meta = Get-ApkVersionMeta -GradleFile $appGradle
  $metaPayload = @{
    versionCode = $meta.versionCode
    versionName = $meta.versionName
    releasedAt = (Get-Date).ToUniversalTime().ToString("o")
    apkUrl = "https://nexopos-dc.web.app/app-caja.apk"
  }
  $metaPayload | ConvertTo-Json | Set-Content -Path $publicVersionMeta -Encoding UTF8
  $apk = Get-Item $publicApk
  Write-Host ("APK publica: {0} ({1} bytes)" -f $apk.FullName, $apk.Length) -ForegroundColor Green
  Write-Host ("Metadata version: {0} (code {1})" -f $meta.versionName, $meta.versionCode) -ForegroundColor DarkGray
}

Invoke-Step -Title "Rebuild web para incluir app-caja.apk" -Script {
  Push-Location $clientDir
  try {
    npm run build
  } finally {
    Pop-Location
  }
}

if (-not $NoDeploy) {
  Invoke-Step -Title "Deploy hosting" -Script {
    Push-Location $root
    try {
      firebase deploy --only hosting --project $Project
    } finally {
      Pop-Location
    }
  }
}

Write-Host ""
Write-Host "Release APK completado." -ForegroundColor Green
Write-Host "URL fija para descarga/actualización: https://nexopos-dc.web.app/app-caja.apk" -ForegroundColor Yellow
Write-Host ("Copia local versionada: {0}" -f $archiveApk) -ForegroundColor DarkGray
