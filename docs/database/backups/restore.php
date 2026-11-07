<?php

/**
 * Script de restauración de datos para ARCA-NB.
 * Restaura el archivo arca_pruebas_data_only_latest.sql (o el indicado)
 * sobre la base configurada en apps/api/src/.env con claves foráneas deshabilitadas.
 * 
 * Uso:
 *   php docs/database/backups/restore.php [archivo.sql]
 */

declare(strict_types=1);

$backupDir = __DIR__;
$rootDir = dirname(__DIR__, 3);
$envFile = $rootDir . '/apps/api/src/.env';

$sqlFile = $argv[1] ?? "{$backupDir}/arca_pruebas_data_only_latest.sql";

if (!file_exists($sqlFile)) {
    echo "[-] No se encontró el archivo de datos a restaurar: {$sqlFile}\n";
    echo "    Asegúrate de haber ejecutado backup.php primero o indica la ruta correcta.\n";
    exit(1);
}

if (!file_exists($envFile)) {
    echo "[-] No se encontró el archivo .env en {$envFile}\n";
    exit(1);
}

// 1. Cargar .env destino
echo "[*] Leyendo configuración de la NUEVA conexión desde apps/api/src/.env...\n";
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

echo "[*] Conectando a la nueva base: {$host}:{$port} -> '{$database}' (usuario: {$username})...\n";

$dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

if (!empty($sslCa)) {
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
    }
}

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    echo "[-] Error de conexión a la nueva base de datos: " . $e->getMessage() . "\n";
    exit(1);
}

echo "[+] Conexión establecida.\n";
echo "[*] Importando datos desde: " . basename($sqlFile) . "...\n";

// Desactivar temporalmente FK checks
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
$pdo->exec("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");

$content = file_get_contents($sqlFile);
if ($content === false) {
    echo "[-] No se pudo leer el archivo SQL.\n";
    exit(1);
}

// Normalizar saltos de línea para Windows / Linux
$content = str_replace("\r\n", "\n", $content);

// Ejecutar por bloques de sentencias
$queries = explode(";\n", $content);
$executed = 0;

foreach ($queries as $query) {
    $query = trim($query);
    if ($query === '' || str_starts_with($query, '--')) {
        continue;
    }
    try {
        $pdo->exec($query);
        $executed++;
    } catch (PDOException $e) {
        // Ignorar posibles duplicados de seeders iniciales
        if (str_contains($e->getMessage(), 'Duplicate entry')) {
            continue;
        }
        echo "[-] Error en consulta: " . $e->getMessage() . "\n";
    }
}

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

echo "[+] ¡RESTAURACIÓN DE DATOS COMPLETADA!\n";
echo "Total de sentencias ejecutadas: {$executed}\n";
