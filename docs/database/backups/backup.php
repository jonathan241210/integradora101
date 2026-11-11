<?php

/**
 * Script de respaldo automatizado de base de datos para ARCA-NB.
 * Puede ejecutarse en cualquier entorno con PHP sin necesidad de mysqldump externo.
 *
 * Uso:
 *   php docs/database/backups/backup.php
 */

declare(strict_types=1);

$backupDir = __DIR__;
$rootDir = dirname(__DIR__, 3);
$envFile = $rootDir . '/apps/api/src/.env';

if (!file_exists($envFile)) {
    echo "[-] No se encontró el archivo .env en {$envFile}\n";
    exit(1);
}

// 1. Cargar variables del .env
echo "[*] Leyendo configuración de conexión desde apps/api/src/.env...\n";
$envLines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$env = [];
foreach ($envLines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) {
        continue;
    }
    if (str_contains($line, '=')) {
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);
        // Quitar comillas si las tiene
        if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
            (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
            $val = substr($val, 1, -1);
        }
        $env[$key] = $val;
    }
}

$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = (int) ($env['DB_PORT'] ?? 3306);
$database = $env['DB_DATABASE'] ?? 'arca_pruebas';
$username = $env['DB_USERNAME'] ?? 'avnadmin';
$password = $env['DB_PASSWORD'] ?? '';
$sslCa = $env['DB_SSL_CA'] ?? null;

echo "[*] Conectando a {$host}:{$port} -> base de datos '{$database}' (usuario: {$username})...\n";

$dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

if (!empty($sslCa)) {
    // Si la ruta del certificado es relativa, resolverla
    $resolvedSslCa = $sslCa;
    if (!file_exists($resolvedSslCa)) {
        $candidate = $rootDir . '/apps/api/src/' . $sslCa;
        if (file_exists($candidate)) {
            $resolvedSslCa = $candidate;
        } elseif (file_exists($rootDir . '/' . $sslCa)) {
            $resolvedSslCa = $rootDir . '/' . $sslCa;
        }
    }

    if (file_exists($resolvedSslCa)) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $resolvedSslCa;
        echo "[*] Certificado SSL CA configurado: {$resolvedSslCa}\n";
    } else {
        echo "[!] Advertencia: No se encontró el archivo de certificado SSL en {$sslCa}\n";
    }
}

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    echo "[-] Error de conexión a la base de datos: " . $e->getMessage() . "\n";
    exit(1);
}

echo "[+] Conexión establecida con éxito.\n";

// 2. Obtener lista de tablas
$tablesStmt = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
$tables = [];
while ($row = $tablesStmt->fetch(PDO::FETCH_NUM)) {
    $tables[] = $row[0];
}

echo "[*] Se encontraron " . count($tables) . " tablas para respaldar.\n";

$timestamp = date('Y-m-d_H-i-s');
$fullBackupFile = "{$backupDir}/backup_{$database}_full_{$timestamp}.sql";
$dataOnlyFile = "{$backupDir}/{$database}_data_only_{$timestamp}.sql";

// También mantener nombres fijos para facilidad de uso
$latestFullFile = "{$backupDir}/backup_{$database}_full_latest.sql";
$latestDataFile = "{$backupDir}/{$database}_data_only_latest.sql";

$fullHandle = fopen($fullBackupFile, 'w');
$dataHandle = fopen($dataOnlyFile, 'w');

if (!$fullHandle || !$dataHandle) {
    echo "[-] No se pudieron crear los archivos de respaldo en {$backupDir}\n";
    exit(1);
}

$header = "-- ========================================================\n";
$header .= "-- ARCA-NB · Respaldo de Base de Datos MySQL\n";
$header .= "-- Base: {$database}\n";
$header .= "-- Servidor origen: {$host}:{$port}\n";
$header .= "-- Fecha de generación: " . date('Y-m-d H:i:s') . "\n";
$header .= "-- ========================================================\n\n";
$header .= "SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;\n";
$header .= "SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
$header .= "SET NAMES utf8mb4;\n\n";

fwrite($fullHandle, $header);
fwrite($dataHandle, $header);

$totalRowsBackedUp = 0;

foreach ($tables as $table) {
    echo " -> Procesando tabla `{$table}`...";

    // Estructura (solo para el dump completo)
    $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`");
    $createRow = $createStmt->fetch(PDO::FETCH_NUM);
    $createSql = $createRow[1] ?? '';

    fwrite($fullHandle, "--\n-- Estructura de tabla para `{$table}`\n--\n");
    fwrite($fullHandle, "DROP TABLE IF EXISTS `{$table}`;\n");
    fwrite($fullHandle, $createSql . ";\n\n");

    // Datos
    $dataStmt = $pdo->query("SELECT * FROM `{$table}`");
    $count = 0;

    fwrite($fullHandle, "-- Volcado de datos para `{$table}`\n");
    if ($table !== 'migrations') {
        fwrite($dataHandle, "-- Volcado de datos para `{$table}`\n");
    }

    $batch = [];
    while ($row = $dataStmt->fetch(PDO::FETCH_ASSOC)) {
        $count++;
        $totalRowsBackedUp++;
        $escapedValues = array_map(function ($val) use ($pdo) {
            if ($val === null) {
                return 'NULL';
            }
            return $pdo->quote((string) $val);
        }, array_values($row));

        $columns = array_map(fn($col) => "`{$col}`", array_keys($row));
        $batch[] = "(" . implode(", ", $escapedValues) . ")";

        if (count($batch) >= 100) {
            $insertSql = "INSERT INTO `{$table}` (" . implode(", ", $columns) . ") VALUES \n" . implode(",\n", $batch) . ";\n";
            fwrite($fullHandle, $insertSql);
            if ($table !== 'migrations') {
                fwrite($dataHandle, $insertSql);
            }
            $batch = [];
        }
    }

    if (!empty($batch)) {
        $insertSql = "INSERT INTO `{$table}` (" . implode(", ", $columns) . ") VALUES \n" . implode(",\n", $batch) . ";\n";
        fwrite($fullHandle, $insertSql);
        if ($table !== 'migrations') {
            fwrite($dataHandle, $insertSql);
        }
    }

    fwrite($fullHandle, "\n");
    if ($table !== 'migrations') {
        fwrite($dataHandle, "\n");
    }

    echo " [OK] ({$count} filas)\n";
}

$footer = "SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;\n";
$footer .= "SET SQL_MODE=@OLD_SQL_MODE;\n";
$footer .= "-- Fin del respaldo\n";

fwrite($fullHandle, $footer);
fwrite($dataHandle, $footer);

fclose($fullHandle);
fclose($dataHandle);

// Copiar a los archivos _latest para referencia rápida
copy($fullBackupFile, $latestFullFile);
copy($dataOnlyFile, $latestDataFile);

$fullSize = round(filesize($fullBackupFile) / 1024, 2);
$dataSize = round(filesize($dataOnlyFile) / 1024, 2);

echo "\n========================================================\n";
echo "[+] ¡RESPALDO COMPLETADO EXITOSAMENTE!\n";
echo "========================================================\n";
echo "Total de tablas procesadas: " . count($tables) . "\n";
echo "Total de filas respaldadas: {$totalRowsBackedUp}\n";
echo "1. Respaldo Completo (Estructura + Datos):\n";
echo "   -> {$fullBackupFile} ({$fullSize} KB)\n";
echo "   -> {$latestFullFile}\n";
echo "2. Respaldo Solo Datos (Para importar tras migrate):\n";
echo "   -> {$dataOnlyFile} ({$dataSize} KB)\n";
echo "   -> {$latestDataFile}\n";
echo "========================================================\n";
