<#
.SYNOPSIS
    Script automatizado de respaldo para la base de datos de ARCA-NB.
.DESCRIPTION
    Lee las credenciales desde apps/api/src/.env y genera los respaldos en esta carpeta.
.EXAMPLE
    .\backup.ps1
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ARCA-NB · Respaldo de Base de Datos MySQL (Aiven)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Comprobar si PHP está disponible en la terminal
if (Get-Command php -ErrorAction SilentlyContinue) {
    Write-Host "[+] PHP detectado en el sistema. Ejecutando respaldo vía PDO..." -ForegroundColor Green
    & php "$ScriptDir\backup.php"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[✓] Proceso de respaldo finalizado con éxito." -ForegroundColor Green
        Write-Host "Los archivos .sql se han guardado en esta carpeta:" -ForegroundColor Yellow
        Write-Host " $ScriptDir" -ForegroundColor Yellow
    } else {
        Write-Host "`n[x] Ocurrió un error al ejecutar el respaldo con PHP." -ForegroundColor Red
    }
} else {
    Write-Host "[-] PHP no se encuentra en el PATH de la consola." -ForegroundColor Red
    Write-Host "Por favor instala o agrega PHP al PATH, o ejecuta el comando mysqldump manual." -ForegroundColor Yellow
}
