<#
.SYNOPSIS
    Script automatizado de restauración para la base de datos de ARCA-NB.
.DESCRIPTION
    Restaura los datos respaldados en la nueva conexión configurada en apps/api/src/.env.
.EXAMPLE
    .\restore.ps1
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ARCA-NB · Restauración de Datos en Nueva Instancia" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (Get-Command php -ErrorAction SilentlyContinue) {
    Write-Host "[*] Ejecutando restauración de datos con PHP..." -ForegroundColor Green
    & php "$ScriptDir\restore.php"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[✓] Datos restaurados exitosamente en la nueva instancia." -ForegroundColor Green
    } else {
        Write-Host "`n[x] Hubo un error durante la restauración." -ForegroundColor Red
    }
} else {
    Write-Host "[-] PHP no se encuentra disponible en el PATH." -ForegroundColor Red
}
