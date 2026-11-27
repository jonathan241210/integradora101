param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,

  [string]$ContainerName = "arca-mysql-local",
  [string]$Database = "arca_pruebas",
  [string]$RootPassword
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
  throw "No se encontró el backup: $BackupPath"
}

if (-not $RootPassword) {
  $secure = Read-Host "Contraseña root de MySQL" -AsSecureString
  $RootPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

$tmp = Join-Path $env:TEMP "arca_pruebas_full_local_ansi.sql"
$content = Get-Content -Raw -Encoding UTF8 $BackupPath

# Compatibilidad local para dumps con identificadores entre comillas dobles.
$content = $content -replace "SQL_MODE='NO_AUTO_VALUE_ON_ZERO'", "SQL_MODE='NO_AUTO_VALUE_ON_ZERO,ANSI_QUOTES'"

Set-Content -Path $tmp -Value $content -Encoding UTF8
Write-Host "Copia parcheada: $tmp"

Get-Content -Raw -Encoding UTF8 $tmp | docker exec -i $ContainerName mysql -uroot "-p$RootPassword" $Database

Write-Host "Importación terminada. Verifica con:"
Write-Host "docker exec $ContainerName mysql -uroot -p\"<PASSWORD>\" -e \"SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema='$Database';\""
